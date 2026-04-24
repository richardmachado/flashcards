const express = require("express");
const { supabase, supabaseAdmin } = require("../config/supabase");
const { ensureProfile } = require("../services/profileService");
const getRequestUser = require("../middleware/getRequestUser");
const env = require("../config/env");

const router = express.Router();


router.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (!data?.user?.id) {
      throw new Error("User was created without an id");
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: data.user.id,
        email: data.user.email,
      });

    if (profileError) throw profileError;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_pro, email")
      .eq("id", data.user.id)
      .maybeSingle();

    res.json({
      user: {
        ...data.user,
        is_pro: !!profile?.is_pro,
        profile_email: profile?.email ?? null,
      },
      access_token: data.session?.access_token,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
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


    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, is_pro")
      .eq("id", data.user.id)
      .maybeSingle();


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

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.frontendUrl}/reset-password`,
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

router.get("/admin/users", async (req, res) => {
  try {
    const { user } = await getRequestUser(req);

    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (adminProfileError) throw adminProfileError;

    if (!adminProfile?.is_admin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, created_at, is_pro, is_admin")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const now = Date.now();
    const last24h = (data || []).filter((u) => {
      if (!u.created_at) return false;
      return now - new Date(u.created_at).getTime() <= 24 * 60 * 60 * 1000;
    }).length;

    res.json({
      total: data?.length || 0,
      last24h,
      users: data || [],
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to load users" });
  }
});

module.exports = router;