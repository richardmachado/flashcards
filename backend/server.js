require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const Stripe = require("stripe");
const { deepseek } = require("./deepseekClient");

const app = express();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://flashycardss.netlify.app";
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;

// Client for auth-related user token checks
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for profiles + webhook DB writes
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
}

console.log("SUPABASE_URL:", supabaseUrl ? "✅ loaded" : "❌ missing");
console.log("SUPABASE_ANON_KEY:", supabaseAnonKey ? "✅ loaded" : "❌ missing");
console.log(
  "SUPABASE_SERVICE_ROLE_KEY:",
  supabaseServiceRoleKey ? "✅ loaded" : "❌ missing"
);
console.log(
  "STRIPE_SECRET_KEY:",
  process.env.STRIPE_SECRET_KEY ? "✅ loaded" : "❌ missing"
);
console.log(
  "STRIPE_WEBHOOK_SECRET:",
  process.env.STRIPE_WEBHOOK_SECRET ? "✅ loaded" : "❌ missing"
);

app.use(
  cors({
    origin: true,
    credentials: false,
  })
);

// Stripe webhook must be before express.json()
app.post(
  "/billing/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const customerId = session.customer || null;

        const { data, error } = await supabaseAdmin.rpc('test_authorization_header');
console.log({ data, error });

        if (userId) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({
              is_pro: true,
              stripe_customer_id: customerId,
            })
            .eq("id", userId);

          if (error) {
            console.error("profiles update error:", error);
          } else {
            console.log(`Set is_pro=true for user ${userId}`);
          }
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        if (customerId) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ is_pro: false })
            .eq("stripe_customer_id", customerId);

          if (error) {
            console.error("profiles downgrade error:", error);
          } else {
            console.log(
              `Set is_pro=false for stripe customer ${customerId}`
            );
          }
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook handler error:", err);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  }
);

app.use(express.json());

// AI route
app.post("/ai/test-generate-cards", async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim().length < 30) {
    return res
      .status(400)
      .json({ error: "Please provide at least 30 characters of text." });
  }

  try {
    const systemPrompt = `
You convert study material into flashcards for active recall.
Return STRICT JSON only, with this shape:
{
  "cards": [
    { "front": "question text", "back": "answer text" }
  ]
}
Keep questions short and concrete. Max 10 cards.
`.trim();

    const userPrompt = `Create flashcards from this material:\n\n${text}`;

    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content || "{}";
    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return res.status(500).json({
        error: "Model did not return valid JSON.",
        raw: content,
      });
    }

    if (!parsed.cards || !Array.isArray(parsed.cards)) {
      return res.status(500).json({
        error: "JSON has unexpected structure.",
        raw: parsed,
      });
    }

    res.json({ cards: parsed.cards });
  } catch (err) {
    console.error("DeepSeek error:", err.response?.data || err.message);
    res.status(500).json({ error: "DeepSeek request failed." });
  }
});

// Middleware to validate token and attach auth user
async function requireUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  const token = authHeader.slice(7);

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = data.user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// Ensure profile row exists
async function ensureProfile(user) {
  const { error } = await supabaseAdmin.from("profiles").upsert(
    [
      {
        id: user.id,
        is_pro: false,
      },
    ],
    { onConflict: "id" }
  );

  if (error) {
    console.error("ensureProfile error:", error);
  }
}

// Signup
app.post("/auth/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // if (data.user) {
    //   await ensureProfile(data.user);
    // }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_pro")
      .eq("id", data.user.id)
      .maybeSingle();

    res.json({
      user: {
        ...data.user,
        is_pro: !!profile?.is_pro,
      },
      access_token: data.session?.access_token,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: req.body.email,
      password: req.body.password,
    });
    if (error) throw error;

    await ensureProfile(data.user);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, is_pro")
      .eq("id", data.user.id)
      .maybeSingle();

    console.log("LOGIN user.id =", data.user.id);
    console.log("LOGIN profile =", profile);
    console.log("LOGIN profileError =", profileError);

    res.json({
      user: {
        ...data.user,
        is_pro: !!profile?.is_pro,
      },
      access_token: data.session.access_token,
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(400).json({ error: err.message });
  }
});

app.get("/debug/profile-direct", async (req, res) => {
  const targetId = "9d515465-6389-47ef-8688-cb3e52a0aa58";

  const profileQuery = await supabaseAdmin
    .from("profiles")
    .select("id, is_pro, created_at");

  const exactMatch = await supabaseAdmin
    .from("profiles")
    .select("id, is_pro, created_at")
    .eq("id", targetId)
    .maybeSingle();

  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    targetId,
    profileCountSample: profileQuery.data?.length || 0,
    profileSample: profileQuery.data?.slice(0, 5) || [],
    exactMatch: exactMatch.data,
    exactMatchError: exactMatch.error,
  });
});

// Me
app.get("/me", requireUser, async (req, res) => {
  try {
    console.log("req.user.id =", req.user.id);

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, is_pro, stripe_customer_id")
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) throw error;

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        is_pro: !!profile?.is_pro,
      },
    });
  } catch (err) {
    console.error("/me error:", err);
    res.status(500).json({ error: "Failed to load user profile" });
  }
});

// Create Stripe checkout session
app.post("/billing/create-checkout-session", requireUser, async (req, res) => {
  try {
    const user = req.user;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const successUrl = `${FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${FRONTEND_URL}/billing/cancel`;

    console.log("FRONTEND_URL =", JSON.stringify(FRONTEND_URL));
    console.log("successUrl =", JSON.stringify(successUrl));
    console.log("cancelUrl =", JSON.stringify(cancelUrl));

    const sessionPayload = {
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
      },
    };

    if (profile?.stripe_customer_id) {
      sessionPayload.customer = profile.stripe_customer_id;
      delete sessionPayload.customer_email;
    }

    const session = await stripe.checkout.sessions.create(sessionPayload);

    res.json({ url: session.url });
  } catch (err) {
    console.error("checkout error:", err);
    res.status(500).json({ error: "Unable to create checkout session" });
  }
});

// Create deck
app.post("/decks", requireUser, async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Deck name required" });
  }

  try {
    const { data, error } = await supabase
      .from("decks")
      .insert([{ name: name.trim(), user_id: req.user.id }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List decks
app.get("/decks", requireUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("decks")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Create card
app.post("/cards", requireUser, async (req, res) => {
  const { front, back, deck_id } = req.body;

  if (!deck_id) {
    return res.status(400).json({ error: "deck_id required" });
  }

  try {
    const { data, error } = await supabase
      .from("cards")
      .insert([{ front, back, deck_id, user_id: req.user.id }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Read cards
app.get("/cards", requireUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update card
app.put("/cards/:id", requireUser, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const { data, error } = await supabase
      .from("cards")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete card
app.delete("/cards/:id", requireUser, async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from("cards")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Flashcard backend running on http://localhost:${PORT}`);
});

console.log("SUPABASE_URL =", process.env.SUPABASE_URL);
console.log(
  "SERVICE ROLE PRESENT =",
  !!process.env.SUPABASE_SERVICE_ROLE_KEY
);
console.log(
  "SERVICE ROLE PREFIX =",
  process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20)
);

app.get("/debug/clients", async (req, res) => {
  const anonResult = await supabase
    .from("profiles")
    .select("id, is_pro")
    .limit(5);

  const adminResult = await supabaseAdmin
    .from("profiles")
    .select("id, is_pro")
    .limit(5);

  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    anonKeyPrefix: process.env.SUPABASE_ANON_KEY?.slice(0, 20),
    serviceRolePrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20),
    anon: {
      data: anonResult.data,
      error: anonResult.error,
    },
    admin: {
      data: adminResult.data,
      error: adminResult.error,
    },
  });
});

app.get("/debug/sql-shape", async (req, res) => {
  const profiles = await supabaseAdmin.from("profiles").select("*").limit(5);
  const decks = await supabaseAdmin.from("decks").select("*").limit(5);
  const cards = await supabaseAdmin.from("cards").select("*").limit(5);

  res.json({
    profiles,
    decks,
    cards,
  });
});

app.get("/debug/rest-role", async (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    anonPresent: !!process.env.SUPABASE_ANON_KEY,
    servicePresent: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonPrefix: process.env.SUPABASE_ANON_KEY?.slice(0, 30),
    servicePrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 30),
    sameKey:
      process.env.SUPABASE_ANON_KEY === process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
});

app.get("/debug/admin-profiles", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, is_pro")
    .limit(5);

  res.json({ data, error });
});

app.get("/debug/me-profile", requireUser, async (req, res) => {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", req.user.id);

  res.json({
    authUserId: req.user.id,
    authEmail: req.user.email,
    profileRows: profile,
    error,
  });
});