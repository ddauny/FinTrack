import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carichiamo l'ambiente corretto: .env.production o .env.development
// Se NODE_ENV non è settato, default a development
const nodeEnv = process.env.NODE_ENV || "development";
const envPath = path.resolve(__dirname, `../../../.env.${nodeEnv}`);

dotenv.config({ path: envPath });

// Fallback al file .env standard se quello specifico non esiste
if (process.env.DATABASE_URL === undefined) {
  dotenv.config();
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "development_secret_change_me",
  nodeEnv,
  isProduction: nodeEnv === "production",
};


