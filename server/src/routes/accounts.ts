import { Router } from "express";
import { prisma } from "../db/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { z } from "zod";

export const accountsRouter = Router();

const upsertSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  initialBalance: z.number().finite(),
});

accountsRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  const accounts = await prisma.account.findMany({ where: { userId: req.userId! } });
  res.json(accounts);
});

accountsRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  const parse = upsertSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const acc = await prisma.account.create({ data: { ...parse.data, userId: req.userId! } });
  res.status(201).json(acc);
});

accountsRouter.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parse = upsertSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const updated = await prisma.account.updateMany({ where: { id, userId: req.userId! }, data: parse.data });
  if (updated.count === 0) return res.status(404).json({ error: "Not found" });
  const acc = await prisma.account.findUnique({ where: { id } });
  res.json(acc);
});

accountsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const del = await prisma.account.deleteMany({ where: { id, userId: req.userId! } });
  if (del.count === 0) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});


