import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";

export interface AuthRequest extends Request {
  userId?: number;
}

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  //console.log('authHeader', authHeader);
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as any;
    req.userId = payload.sub;

    // Security check: if it's a non-expiring token (automation token), verify it matches the db
    if (!payload.exp) {
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { automationToken: true }
      });
      if (!user || user.automationToken !== token) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}


