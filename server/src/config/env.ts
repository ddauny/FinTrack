import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the correct environment: .env.production or .env.development
const nodeEnv = process.env.NODE_ENV || "development";
const envPath = path.resolve(__dirname, `../../../.env.${nodeEnv}`);

dotenv.config({ path: envPath });

// Fallback to .env if the specific env file doesn't provide DATABASE_URL
if (process.env.DATABASE_URL === undefined) {
  dotenv.config();
}

// Validate critical environment variables at startup — fail fast if missing
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error(
    `FATAL: JWT_SECRET is ${!jwtSecret ? 'not set' : 'too short (must be ≥ 32 chars)'}. ` +
    `Set a strong secret in .env.${nodeEnv} and restart the server.`
  );
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret,
  nodeEnv,
  isProduction: nodeEnv === "production",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
};
