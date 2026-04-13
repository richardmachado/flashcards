const { supabaseAdmin } = require("../config/supabase");

async function ensureProfile(user) {
  const { data: existing, error: readError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    console.error("ensureProfile read error:", readError);
    return;
  }

  if (!existing) {
    const { error: insertError } = await supabaseAdmin
      .from("profiles")
      .insert([
        {
          id: user.id,
          email: user.email?.toLowerCase() || null,
          is_pro: false,
        },
      ]);

    if (insertError) {
      console.error("ensureProfile insert error:", insertError);
    } else {
      console.log("Inserted new profile row for", user.id);
    }
  } else {
    console.log("Profile already exists, not overwriting is_pro for", user.id);
  }
}

module.exports = { ensureProfile };