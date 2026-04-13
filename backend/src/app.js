const express = require("express");
const cors = require("cors");

const billingWebhookRoutes = require("./routes/billingWebhookRoutes");
const authRoutes = require("./routes/authRoutes");
const billingRoutes = require("./routes/billingRoutes");
const aiRoutes = require("./routes/aiRoutes");
const deckRoutes = require("./routes/deckRoutes");
const cardRoutes = require("./routes/cardRoutes");
const meRoutes = require("./routes/meRoutes");
const shareRoutes = require("./routes/shareRoutes");


const app = express();

app.use(
  cors({
    origin: true,
    credentials: false,
  })
);

app.use("/billing/webhook", billingWebhookRoutes);

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/billing", billingRoutes);
app.use("/ai", aiRoutes);
app.use("/decks", deckRoutes);
app.use("/cards", cardRoutes);
app.use("/", meRoutes);
app.use("/decks", shareRoutes);


module.exports = app;