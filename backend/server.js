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
app.post("/ai/test-generate-cards", requireUser, async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim().length < 30) {
    return res
      .status(400)
      .json({ error: "Please provide at least 30 characters of text." });
  }

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_pro, ai_generations_used, ai_free_limit")
      .eq("id", req.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const isPro = !!profile?.is_pro;
    const used = profile?.ai_generations_used ?? 0;
    const freeLimit = profile?.ai_free_limit ?? 3;

    if (!isPro && used >= freeLimit) {
      return res.status(403).json({
        error: "You’ve used all 3 free AI generations. Upgrade to Pro to keep generating cards.",
        is_pro: false,
        ai_generations_used: used,
        ai_free_limit: freeLimit,
        ai_remaining: 0,
      });
    }

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

    let nextUsed = used;

    if (!isPro) {
      nextUsed = used + 1;

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ ai_generations_used: nextUsed })
        .eq("id", req.user.id);

      if (updateError) {
        throw updateError;
      }
    }

    res.json({
      cards: parsed.cards,
      is_pro: isPro,
      ai_generations_used: nextUsed,
      ai_free_limit: freeLimit,
      ai_remaining: isPro ? null : Math.max(0, freeLimit - nextUsed),
    });
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
  const { data: existing, error: readError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    console.error("ensureProfile read error:", readError);
    return;
  }

  if (!existing) {
    const { error: insertError } = await supabaseAdmin
      .from("profiles")
      .insert([
        {
          id: user.id,
          is_pro: false,
        },
      ]);

    if (insertError) {
      console.error("ensureProfile insert error:", insertError);
    } else {
      console.log("Inserted new profile row for", user.id);
    }
  } else {
    console.log("Profile already exists, not overwriting is_pro for", user.id);
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

    const { data: afterEnsure, error: afterEnsureError } = await supabaseAdmin
  .from("profiles")
  .select("id, is_pro, stripe_customer_id")
  .eq("id", data.user.id)
  .maybeSingle();

console.log("AFTER ensureProfile =", afterEnsure);
console.log("AFTER ensureProfile error =", afterEnsureError);

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

//forgot password
app.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      message: "If that email exists, a reset link has been sent.",
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
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
      .select("id, is_pro, stripe_customer_id, ai_generations_used, ai_free_limit")
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) throw error;

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        is_pro: !!profile?.is_pro,
        stripe_customer_id: profile?.stripe_customer_id || null,
        ai_generations_used: profile?.ai_generations_used ?? 0,
        ai_free_limit: profile?.ai_free_limit ?? 3,
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