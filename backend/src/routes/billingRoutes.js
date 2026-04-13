const express = require("express");
const requireUser = require("../middleware/requireUser");
const stripe = require("../config/stripe");
const env = require("../config/env");
const { supabaseAdmin } = require("../config/supabase");

const router = express.Router();

router.post("/cancel", requireUser, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!user?.stripe_customer_id) {
      return res
        .status(400)
        .json({ error: "No Stripe customer found for this user" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${env.frontendUrl}/`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("billing cancel error:", err);
    res
      .status(500)
      .json({ error: err.message || "Unable to create portal session" });
  }
});

router.post("/create-checkout-session", requireUser, async (req, res) => {
  try {
    const user = req.user;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const successUrl = `${env.frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${env.frontendUrl}/billing/cancel`;

    const sessionPayload = {
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [
        {
          price: env.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
      },
    };

    if (profile?.stripe_customer_id) {
      sessionPayload.customer = profile.stripe_customer_id;
      delete sessionPayload.customer_email;
    }

    const session = await stripe.checkout.sessions.create(sessionPayload);

    res.json({ url: session.url });
  } catch (err) {
    console.error("checkout error:", err);
    res.status(500).json({ error: "Unable to create checkout session" });
  }
});

module.exports = router;