import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { z } from "zod";

export const authRouter = Router();

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

interface OkResponse {
  ok: boolean;
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

authRouter.post("/register", async (req: Request, res: Response<RegisterResponse | ErrorResponse>) => {
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

authRouter.post("/login", async (req: Request, res: Response<LoginResponse | ErrorResponse>) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const { email, password } = parse.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ sub: user.id, email: user.email }, env.jwtSecret, { expiresIn: "7d" });
  return res.json({ token });
});

authRouter.post("/forgot-password", async (_req: Request, res: Response<OkResponse>) => {
  // Placeholder: SDD lists endpoint; actual email reset flow out of scope for MVP
  return res.json({ ok: true });
});


