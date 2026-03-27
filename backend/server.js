require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ loaded' : '❌ missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ loaded' : '❌ missing');


// At the top
const { deepseek } = require("./deepseekClient");

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

// Signup (no email confirmation needed)
app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;

    res.json({
      user: data.user,
      access_token: data.session?.access_token,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  console.log('Login attempt:', req.body.email);
  
  try {
    console.log('Calling supabase.auth.signInWithPassword...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: req.body.email,
      password: req.body.password,
    });
    
    console.log('Supabase response:', { data: !!data, error: error?.message });
    
    if (error) throw error;
    res.json({ user: data.user, access_token: data.session.access_token });
  } catch (err) {
    console.error('Full login error:', err);
    res.status(400).json({ error: err.message });
  }
});


// Logout (client clears token, but server helper)
app.post('/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      await supabase.auth.signOut(token);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
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

app.listen(PORT, () => {
  console.log(`Flashcard backend running on http://localhost:${PORT}`);
});
