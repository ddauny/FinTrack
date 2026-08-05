import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../db/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { z } from "zod";

export const authRouter = Router();

// ponytail: per-IP limit, not per-account — good enough for a self-hosted
// personal-finance app; move to a per-account counter if it ever matters.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Types for API responses
interface RegisterResponse {
  id: number;
  email: string;
}

interface LoginResponse {
  token: string;
}

interface ErrorResponse {
  error: string;
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

authRouter.post("/register", authLimiter, async (req: Request, res: Response<RegisterResponse | ErrorResponse>) => {
    const parse = registerSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
    const { email, password } = parse.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already in use" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, passwordHash } });
    return res.status(201).json({ id: user.id, email: user.email });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

authRouter.post("/login", authLimiter, async (req: Request, res: Response<LoginResponse | ErrorResponse>) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const { email, password } = parse.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ sub: user.id, email: user.email, tv: user.tokenVersion }, env.jwtSecret, { expiresIn: "7d" });
  return res.json({ token });
});


