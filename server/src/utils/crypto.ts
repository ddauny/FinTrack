import crypto from "crypto";
import { env } from "../config/env.js";

// Hash the JWT_SECRET to ensure a 32-byte key for AES-256-CBC
const ENCRYPTION_KEY = crypto.createHash("sha256").update(env.jwtSecret).digest();
const ALGORITHM = "aes-256-cbc";

/**
 * Encrypts a plaintext string using AES-256-CBC.
 * Returns the encrypted string formatted as "iv:encrypted_hex".
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts an encrypted string in "iv:encrypted_hex" format.
 * Returns the decrypted plaintext string.
 */
export function decrypt(encryptedText: string): string {
  const [ivHex, encryptedHex] = encryptedText.split(":");
  if (!ivHex || !encryptedHex) {
    throw new Error("Invalid encrypted text format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
