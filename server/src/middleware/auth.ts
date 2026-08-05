import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";

export interface AuthRequest extends Request {
  userId?: number;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as unknown as { sub: number; tv?: number };
    // Compare against the DB tokenVersion so bumping it (e.g. "log out everywhere")
    // invalidates every JWT already issued for this user, login or automation.
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { tokenVersion: true } });
    if (!user || (payload.tv ?? 0) !== user.tokenVersion) return res.status(401).json({ error: "Unauthorized" });
    req.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}


