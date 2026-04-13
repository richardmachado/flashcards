const env = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  frontendUrl: process.env.FRONTEND_URL || "https://flashycardss.netlify.app",
  stripePriceId: process.env.STRIPE_PRICE_ID,
};

if (!env.supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
}

console.log("SUPABASE_URL:", env.supabaseUrl ? "✅ loaded" : "❌ missing");
console.log("SUPABASE_ANON_KEY:", env.supabaseAnonKey ? "✅ loaded" : "❌ missing");
console.log(
  "SUPABASE_SERVICE_ROLE_KEY:",
  env.supabaseServiceRoleKey ? "✅ loaded" : "❌ missing"
);
console.log("STRIPE_SECRET_KEY:", env.stripeSecretKey ? "✅ loaded" : "❌ missing");
console.log(
  "STRIPE_WEBHOOK_SECRET:",
  env.stripeWebhookSecret ? "✅ loaded" : "❌ missing"
);

module.exports = env;