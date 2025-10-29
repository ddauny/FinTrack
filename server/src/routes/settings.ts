import { Router } from "express";
import { prisma } from "../db/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { z } from "zod";

export const settingsRouter = Router();

const profileSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});

settingsRouter.get("/profile", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { id: true, email: true, createdAt: true } });
  res.json(user);
});

settingsRouter.put("/profile", requireAuth, async (req: AuthRequest, res) => {
  const parse = profileSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const data: any = {};
  if (parse.data.email) data.email = parse.data.email;
  if (parse.data.password) {
    const bcrypt = await import("bcryptjs");
    data.passwordHash = await bcrypt.default.hash(parse.data.password, 10);
  }
  const user = await prisma.user.update({ where: { id: req.userId! }, data });
  res.json({ id: user.id, email: user.email });
});


