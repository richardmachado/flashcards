const express = require("express");
const requireUser = require("../middleware/requireUser");
const { supabaseAdmin } = require("../config/supabase");

const router = express.Router();

router.get("/me", requireUser, async (req, res) => {
  try {
   

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

module.exports = router;