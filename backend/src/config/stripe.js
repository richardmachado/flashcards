const Stripe = require("stripe");
const env = require("./env");

const stripe = Stripe(env.stripeSecretKey);

module.exports = stripe;