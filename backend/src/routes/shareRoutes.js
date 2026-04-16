const express = require("express");
const requireUser = require("../middleware/requireUser");
const { supabaseAdmin } = require("../config/supabase");

const router = express.Router();

router.use(requireUser);

// Share a deck with another existing user by email
router.post("/:deckId/share", async (req, res) => {
  const { deckId } = req.params;
  const { email, permission = "viewer" } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email is required" });
  }

  if (!["viewer", "editor"].includes(permission)) {
    return res.status(400).json({ error: "Invalid permission" });
  }

  try {
    // Confirm current user owns the deck
    const { data: deck, error: deckError } = await supabaseAdmin
      .from("decks")
      .select("id, user_id, name")
      .eq("id", deckId)
      .maybeSingle();

    if (deckError) throw deckError;

    if (!deck) {
      return res.status(404).json({ error: "Deck not found" });
    }

    if (deck.user_id !== req.user.id) {
      return res.status(403).json({ error: "You do not own this deck" });
    }

    // Find recipient by email from profiles table
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (profileError) throw profileError;

    if (!targetProfile) {
      return res
        .status(404)
        .json({ error: "No user found with that email address" });
    }

    if (targetProfile.id === req.user.id) {
      return res
        .status(400)
        .json({ error: "You already own this deck" });
    }

    // Create or update share
    const { data: share, error: shareError } = await supabaseAdmin
      .from("deck_shares")
      .upsert(
        [
          {
            deck_id: deckId,
            shared_with_user_id: targetProfile.id,
            shared_by_user_id: req.user.id,
            permission,
          },
        ],
        {
          onConflict: "deck_id,shared_with_user_id",
        }
      )
      .select()
      .single();

    if (shareError) throw shareError;

    return res.json({
      message: "Deck shared successfully",
      share,
    });
  } catch (err) {
    console.error("share deck error:", err);
    return res.status(500).json({ error: "Failed to share deck" });
  }
});

// List all shares for a deck
router.get("/:deckId/shares", async (req, res) => {
  const { deckId } = req.params;

  try {
    const { data: deck, error: deckError } = await supabaseAdmin
      .from("decks")
      .select("id, user_id")
      .eq("id", deckId)
      .maybeSingle();

    if (deckError) throw deckError;

    if (!deck) {
      return res.status(404).json({ error: "Deck not found" });
    }

    if (deck.user_id !== req.user.id) {
      return res.status(403).json({ error: "You do not own this deck" });
    }

    const { data: shares, error: sharesError } = await supabaseAdmin
      .from("deck_shares")
      .select("id, permission, created_at, shared_with_user_id")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: true });

    if (sharesError) throw sharesError;

    if (!shares || shares.length === 0) {
      return res.json([]);
    }

    const userIds = shares.map((share) => share.shared_with_user_id);

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .in("id", userIds);

    if (profilesError) throw profilesError;

    const profilesById = Object.fromEntries(
      profiles.map((profile) => [profile.id, profile])
    );

    const sharesWithEmails = shares.map((share) => ({
      ...share,
      email: profilesById[share.shared_with_user_id]?.email || null,
    }));

    return res.json(sharesWithEmails);
  } catch (err) {
    console.error("list shares error:", err);
    return res.status(500).json({ error: "Failed to load shares" });
  }
});

// Remove access for a shared user
router.delete("/:deckId/shares/:shareId", async (req, res) => {
  const { deckId, shareId } = req.params;

  try {
    const { data: deck, error: deckError } = await supabaseAdmin
      .from("decks")
      .select("id, user_id")
      .eq("id", deckId)
      .maybeSingle();

    if (deckError) throw deckError;

    if (!deck) {
      return res.status(404).json({ error: "Deck not found" });
    }

    if (deck.user_id !== req.user.id) {
      return res.status(403).json({ error: "You do not own this deck" });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("deck_shares")
      .delete()
      .eq("id", shareId)
      .eq("deck_id", deckId);

    if (deleteError) throw deleteError;

    return res.json({ success: true });
  } catch (err) {
    console.error("remove share error:", err);
    return res.status(500).json({ error: "Failed to remove share" });
  }
});

router.delete("/:deckId/leave", requireUser, async (req, res) => {
  const { deckId } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from("deck_shares")
      .delete()
      .eq("deck_id", deckId)
      .eq("shared_with_user_id", req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("leave share error:", err);
    res.status(500).json({ error: "Failed to remove shared deck." });
  }
});

module.exports = router;