import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "development_secret_change_me",
  nodeEnv: process.env.NODE_ENV ?? "development",
  // Symmetric key (32 raw bytes, base64-encoded) used to encrypt per-user
  // secrets at rest (e.g. each user's own AI provider API key). Generate
  // with: openssl rand -base64 32
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
};


