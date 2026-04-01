require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const Stripe = require("stripe");
const { deepseek } = require("./deepseekClient");

const app = express();

app.use(cors());

// IMPORTANT: must be before express.json() middleware
app.post(
  '/billing/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'customer.subscription.updated'
    ) {
      const session = event.data.object;
      const userId = session.metadata?.user_id;

      if (userId) {
        await supabase
          .from('profiles')
          .update({ is_pro: true })
          .eq('id', userId);

        console.log(`Set is_pro=true for user ${userId}`);
      }
    }

    // Handle cancellations
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        await supabase
          .from('profiles')
          .update({ is_pro: false })
          .eq('id', userId);
      }
    }

    res.json({ received: true });
  }
);

app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);



const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const FRONTEND_URL = process.env.FRONTEND_URL || "https://flashycardss.netlify.app";
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID; // set in Render

console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ loaded' : '❌ missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ loaded' : '❌ missing');






// Simple test route – no auth yet
app.post("/ai/test-generate-cards", async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim().length < 30) {
    return res.status(400).json({ error: "Please provide at least 30 characters of text." });
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
`;

    const userPrompt = `Create flashcards from this material:\n\n${text}`;

    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" }, // ask for valid JSON
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


// Middleware to validate token and attach user
async function requireUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.slice(7);

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = data.user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: req.body.email,
      password: req.body.password,
    });
    if (error) throw error;

    // fetch is_pro from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('id', data.user.id)
      .single();

    res.json({
      user: { ...data.user, is_pro: profile?.is_pro || false },
      access_token: data.session.access_token,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Signup
app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // profile row is auto-created by trigger
    res.json({
      user: { ...data.user, is_pro: false },
      access_token: data.session?.access_token,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/me", requireUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, is_pro")
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) throw error;

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        is_pro: !!data?.is_pro,
      },
    });
  } catch (err) {
    console.error("/me error:", err);
    res.status(500).json({ error: "Failed to load user profile" });
  }
});

app.get('/auth/me', requireUser, async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('id', req.user.id)
      .single();

    res.json({
      user: { ...req.user, is_pro: profile?.is_pro || false },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// after stripe, FRONTEND_URL, STRIPE_PRICE_ID are defined

app.post("/billing/create-checkout-session", requireUser, async (req, res) => {
  try {
    const user = req.user; // from requireUser middleware

    const successUrl = `${FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${FRONTEND_URL}/billing/cancel`;

    console.log("FRONTEND_URL =", JSON.stringify(FRONTEND_URL));
    console.log("successUrl =", JSON.stringify(successUrl));
    console.log("cancelUrl =", JSON.stringify(cancelUrl));

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/billing/cancel`,
      metadata: { user_id: user.id },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to create checkout session" });
  }
});



// Create deck
app.post('/decks', requireUser, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Deck name required' });
  }

  try {
    const { data, error } = await supabase
      .from('decks')
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
app.get('/decks', requireUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// CREATE card
app.post('/cards', requireUser, async (req, res) => {
  const { front, back, deck_id } = req.body;
  if (!deck_id) {
    return res.status(400).json({ error: 'deck_id required' });
  }

  try {
    const { data, error } = await supabase
      .from('cards')
      .insert([{ front, back, deck_id, user_id: req.user.id }])
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// READ all user's cards
app.get('/cards', requireUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE card
app.put('/cards/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const { data, error } = await supabase
      .from('cards')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE card
app.delete('/cards/:id', requireUser, async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
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
