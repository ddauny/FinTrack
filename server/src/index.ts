import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env.js";
import { authRouter, dashboardRouter, accountsRouter, categoriesRouter, transactionsRouter, budgetsRouter, reportsRouter, assetsRouter, settingsRouter, recurringTransactionsRouter } from "./routes/index.js";
import { refreshMarketData } from "./services/marketData.js";
import { startRecurringScheduler } from "./services/recurringScheduler.js";

import rateLimit from "express-rate-limit";

const app = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per 15 minutes
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(cors({
  origin: env.clientUrl,
  credentials: true,
}));
app.use(express.json());
app.use(morgan(env.isProduction ? "combined" : "dev"));
app.use("/api", apiLimiter);

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
app.use("/api/recurring-transactions", recurringTransactionsRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Global error handler — must be the last middleware (4-arg signature)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
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

// Start recurring transactions scheduler
startRecurringScheduler();


