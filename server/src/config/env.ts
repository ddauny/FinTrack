import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? "development";
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret && nodeEnv === "production") {
  throw new Error("JWT_SECRET must be set in production");
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: jwtSecret ?? "development_secret_change_me",
  nodeEnv,
  // Symmetric key (32 raw bytes, base64-encoded) used to encrypt per-user
  // secrets at rest (e.g. each user's own AI provider API key). Generate
  // with: openssl rand -base64 32
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  // Restrict CORS to this origin when set (e.g. https://fintrack.example.com).
  // Left unset, CORS stays open to any origin (current dev/proxy setup).
  clientOrigin: process.env.CLIENT_ORIGIN,
};


