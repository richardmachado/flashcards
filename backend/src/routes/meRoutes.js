const express = require("express");
const requireUser = require("../middleware/requireUser");
const { supabase, supabaseAdmin } = require("../config/supabase");
const getRequestUser = require("../middleware/getRequestUser");

const router = express.Router();


router.get("/me", async (req, res) => {
  try {
    const { user } = await getRequestUser(req);

  


    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, is_pro, is_admin, ai_generations_used, ai_free_limit")
      .eq("id", user.id)
      .maybeSingle();
      console.log("profile row:", profile);

    if (profileError) throw profileError;

    res.json({
      user: {
        id: user.id,
        email: profile?.email || user.email || "",
        is_pro: !!profile?.is_pro,
        is_admin: !!profile?.is_admin,
        ai_generations_used: profile?.ai_generations_used ?? 0,
        ai_free_limit: profile?.ai_free_limit ?? 3,
      },
    });
  } catch (err) {
    res.status(401).json({ error: err.message || "Unauthorized" });
  }
});

module.exports = router;
