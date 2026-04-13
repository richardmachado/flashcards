const express = require("express");
const requireUser = require("../middleware/requireUser");
const { supabase } = require("../config/supabase");

const router = express.Router();

router.post("/", requireUser, async (req, res) => {
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

router.get("/", requireUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1) Owned decks
    const { data: ownedDecks, error: ownedError } = await supabase
      .from("decks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (ownedError) throw ownedError;

    // 2) Deck IDs shared with this user
    const { data: shareRows, error: shareError } = await supabase
      .from("deck_shares")
      .select("deck_id")
      .eq("shared_with_user_id", userId);

    if (shareError) throw shareError;

    const sharedDeckIds = [...new Set((shareRows || []).map((r) => r.deck_id))];

    // 3) Fetch the actual shared deck rows
    let sharedDecks = [];
    if (sharedDeckIds.length > 0) {
      const { data, error } = await supabase
        .from("decks")
        .select("*")
        .in("id", sharedDeckIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      sharedDecks = data || [];
    }

    // 4) Merge, deduplicate, sort
    const combinedMap = new Map();
    for (const deck of [...(ownedDecks || []), ...sharedDecks]) {
      combinedMap.set(deck.id, deck);
    }

    const combined = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.json(combined);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;