const express = require("express");
const stripe = require("../config/stripe");
const env = require("../config/env");
const { supabaseAdmin } = require("../config/supabase");

const router = express.Router();

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        env.stripeWebhookSecret
      );
    } catch (err) {
      console.error("Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const customerId = session.customer || null;

        const { data, error } = await supabaseAdmin.rpc(
          "test_authorization_header"
        );
      

        if (userId) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({
              is_pro: true,
              stripe_customer_id: customerId,
            })
            .eq("id", userId);

          if (error) {
            console.error("profiles update error:", error);
          } else {
            console.log(`Set is_pro=true for user ${userId}`);
          }
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        if (customerId) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ is_pro: false })
            .eq("stripe_customer_id", customerId);

          if (error) {
            console.error("profiles downgrade error:", error);
          } else {
            console.log(`Set is_pro=false for stripe customer ${customerId}`);
          }
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook handler error:", err);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  }
);

module.exports = router;