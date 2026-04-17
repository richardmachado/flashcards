const express = require("express");
const requireUser = require("../middleware/requireUser");
const { supabaseAdmin } = require("../config/supabase");

const router = express.Router();

router.post("/", requireUser, async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Deck name required" });
  }

  try {
    // Check deck limit for free users
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_pro")
      .eq("id", req.user.id)
      .maybeSingle();

    if (!profile?.is_pro) {
      const { count } = await supabaseAdmin
        .from("decks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", req.user.id);

      if (count >= 3) {
        return res.status(403).json({
          error: "Free accounts are limited to 3 decks. Upgrade to Pro for unlimited decks.",
        });
      }
    }

    const { data, error } = await supabaseAdmin
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
    const { data: ownedDecks, error: ownedError } = await supabaseAdmin
      .from("decks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (ownedError) throw ownedError;

    // 2) Share rows for this user
    const { data: shareRows, error: shareError } = await supabaseAdmin
      .from("deck_shares")
      .select("deck_id")
      .eq("shared_with_user_id", userId);

    if (shareError) throw shareError;

    const sharedDeckIds = [...new Set((shareRows || []).map((r) => r.deck_id))];

    // 3) Fetch shared deck rows
    let sharedDecks = [];
    if (sharedDeckIds.length > 0) {
      const { data: deckRows, error: deckError } = await supabaseAdmin
        .from("decks")
        .select("*")
        .in("id", sharedDeckIds)
        .order("created_at", { ascending: false });

      if (deckError) throw deckError;

      // 4) Fetch owner emails
      const ownerIds = [...new Set((deckRows || []).map((d) => d.user_id))];
      const { data: profileRows } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .in("id", ownerIds);

      const profileMap = new Map((profileRows || []).map((p) => [p.id, p.email]));

      sharedDecks = (deckRows || []).map((d) => ({
        ...d,
        shared: true,
        shared_by_email: profileMap.get(d.user_id) || null,
      }));
    }

    // 5) Tag owned decks
    const taggedOwned = (ownedDecks || []).map((d) => ({
      ...d,
      shared: false,
      shared_by_email: null,
    }));

    // 6) Merge and sort
    const combinedMap = new Map();
    for (const deck of [...taggedOwned, ...sharedDecks]) {
      combinedMap.set(deck.id, deck);
    }

    const combined = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.json(combined);
  } catch (err) {
    console.error("GET /decks error:", err);
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", requireUser, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Deck name required" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("decks")
      .update({ name: name.trim() })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Deck not found" });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", requireUser, async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from("decks")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//user can copy a deck that was shared with them. This creates a new deck owned by the user with the same cards as the original

router.post("/:id/copy", requireUser, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    // Get the original deck
    const { data: originalDeck, error: deckError } = await supabaseAdmin
      .from("decks")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (deckError) throw deckError;
    if (!originalDeck) return res.status(404).json({ error: "Deck not found" });

    // Create new deck owned by current user
    const { data: newDeck, error: newDeckError } = await supabaseAdmin
      .from("decks")
      .insert([{ name: name || originalDeck.name, user_id: req.user.id }])
      .select()
      .single();

    if (newDeckError) throw newDeckError;

    // Get all cards from original deck
    const { data: originalCards, error: cardsError } = await supabaseAdmin
      .from("cards")
      .select("front, back, difficulty")
      .eq("deck_id", id);

    if (cardsError) throw cardsError;

    // Copy cards to new deck
    if (originalCards && originalCards.length > 0) {
      const newCards = originalCards.map((c) => ({
        front: c.front,
        back: c.back,
        difficulty: 0,  // reset difficulty for new owner
        deck_id: newDeck.id,
        user_id: req.user.id,
      }));

      const { error: insertError } = await supabaseAdmin
        .from("cards")
        .insert(newCards);

      if (insertError) throw insertError;
    }

    res.json({ deck: newDeck });
  } catch (err) {
    console.error("copy deck error:", err);
    res.status(500).json({ error: "Failed to copy deck." });
  }
});

module.exports = router;