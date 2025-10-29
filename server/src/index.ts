import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env.js";
import { authRouter, dashboardRouter, accountsRouter, categoriesRouter, transactionsRouter, budgetsRouter, reportsRouter, assetsRouter, settingsRouter } from "./routes/index.js";
import { refreshMarketData } from "./services/marketData.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/budgets", budgetsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api", assetsRouter); // exposes /portfolios, /holdings, /manual-assets, /market-data
app.use("/api/settings", settingsRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`FinTrack API listening on port ${env.port}`);
});

// Hourly market data refresh job
setInterval(() => {
  refreshMarketData().catch(() => {});
}, 60 * 60 * 1000);
// kick off once on boot
refreshMarketData().catch(() => {});


