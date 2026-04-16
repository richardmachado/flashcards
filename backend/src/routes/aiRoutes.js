const express = require("express");
const requireUser = require("../middleware/requireUser");
const { supabaseAdmin } = require("../config/supabase");
const { deepseek } = require("../../deepseekClient");

const router = express.Router();

router.post("/test-generate-cards", requireUser, async (req, res) => {
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
        error:
          "You’ve used all 3 free AI generations. Upgrade to Pro to keep generating cards.",
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
      temperature: 0.9,
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

router.post("/generate-test", requireUser, async (req, res) => {
  const { cards } = req.body;

  if (!Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ error: "No cards provided." });
  }

  try {
    // Check usage
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_pro, ai_tests_used")
      .eq("id", req.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const isPro = !!profile?.is_pro;
    const testsUsed = profile?.ai_tests_used ?? 0;
    const freeLimit = 3;

    if (!isPro && testsUsed >= freeLimit) {
      return res.status(403).json({
        error:
          "You've used all 3 free AI tests. Upgrade to Pro for unlimited tests.",
        is_pro: false,
        ai_tests_used: testsUsed,
        ai_tests_free_limit: freeLimit,
      });
    }

    const systemPrompt = `
You are a test generator. Given flashcards with a front (concept) and back (answer), generate one test question per card.
Mix the question types evenly across multiple_choice, true_false, and fill_blank, but randomize the order throughout the test so the same type never appears in a predictable pattern: multiple_choice, true_false, and fill_blank.
For fill_blank, replace one or two key words in the answer with ___ .
For multiple_choice, generate 3 plausible but wrong distractors based on the topic.
For true_false, sometimes make the statement false by altering a key detail.
Every time you generate a test, vary the questions, phrasing, distractors, and true/false statements so repeated tests feel different.
Never reuse the exact same question wording or distractors from a previous generation.

Return STRICT JSON only, as an array:
[
  {
    "type": "multiple_choice",
    "question": "question text",
    "options": ["correct answer", "wrong1", "wrong2", "wrong3"],
    "answer": "correct answer"
  },
  {
    "type": "true_false",
    "question": "statement to evaluate",
    "answer": "true"
  },
  {
    "type": "fill_blank",
    "question": "sentence with ___ replacing key word(s)",
    "answer": "key word(s)"
  }
]
Shuffle the options for multiple_choice so the correct answer isn't always first.
Return exactly one question per card, in the same order.
`.trim();

    const userPrompt = `Generate a test from these flashcards:\n\n${cards
      .map((c, i) => `${i + 1}. Front: ${c.front} | Back: ${c.back}`)
      .join("\n")}`;

    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "{}";
    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return res
        .status(500)
        .json({ error: "Model did not return valid JSON.", raw: content });
    }

    const questions = Array.isArray(parsed)
      ? parsed
      : parsed.questions || parsed.test || [];

    if (!questions.length) {
      return res
        .status(500)
        .json({ error: "No questions returned.", raw: parsed });
    }

    // Shuffle questions so order is always different
    const shuffled = [...questions].sort(() => Math.random() - 0.5);

    // Increment usage for free users
    if (!isPro) {
      await supabaseAdmin
        .from("profiles")
        .update({ ai_tests_used: testsUsed + 1 })
        .eq("id", req.user.id);
    }

    res.json({ questions: shuffled, ai_tests_used: testsUsed + 1 });
  } catch (err) {
    console.error("generate-test error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to generate test." });
  }
});

router.post("/save-test-score", requireUser, async (req, res) => {
  const { deck_id, score, total } = req.body;

  if (score == null || total == null) {
    return res.status(400).json({ error: "Score and total required." });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("test_scores")
      .insert([
        {
          user_id: req.user.id,
          deck_id: deck_id || null,
          score,
          total,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("save test score error:", err);
    res.status(500).json({ error: "Failed to save score." });
  }
});

router.get("/test-scores", requireUser, async (req, res) => {
  const { deck_id } = req.query;

  try {
    let query = supabaseAdmin
      .from("test_scores")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (deck_id) query = query.eq("deck_id", deck_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("get test scores error:", err);
    res.status(500).json({ error: "Failed to load scores." });
  }
});

module.exports = router;
