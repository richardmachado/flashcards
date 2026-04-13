const express = require("express");
const requireUser = require("../middleware/requireUser");
const { supabaseAdmin } = require("../config/supabase");

const router = express.Router();

router.post("/", requireUser, async (req, res) => {
  const { front, back, deck_id } = req.body;

  if (!deck_id) {
    return res.status(400).json({ error: "deck_id required" });
  }

  try {
    const { data, error } = await supabaseAdmin
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

router.get("/", requireUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: ownedCards, error: ownedError } = await supabaseAdmin
      .from("cards")
      .select("*, deck:decks(id, name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (ownedError) throw ownedError;

    const { data: shareRows, error: shareError } = await supabaseAdmin
      .from("deck_shares")
      .select("deck_id")
      .eq("shared_with_user_id", userId);

    if (shareError) throw shareError;

    const sharedDeckIds = [...new Set((shareRows || []).map((r) => r.deck_id))];

    let sharedCards = [];
    if (sharedDeckIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("cards")
        .select("*, deck:decks(id, name)")
        .in("deck_id", sharedDeckIds)
        .neq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      sharedCards = data || [];
    }

    const combinedMap = new Map();
    for (const card of [...(ownedCards || []), ...sharedCards]) {
      combinedMap.set(card.id, card);
    }

    const combined = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.json(combined);
  } catch (err) {
    console.error("GET /cards error:", err);
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", requireUser, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const { data, error } = await supabaseAdmin
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

router.delete("/:id", requireUser, async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
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

module.exports = router;