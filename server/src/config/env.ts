import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "development_secret_change_me",
  nodeEnv: process.env.NODE_ENV ?? "development",
};


