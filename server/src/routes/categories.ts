import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { z } from "zod";

export const categoriesRouter = Router();

const upsertSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["Income", "Expense"]),
});

categoriesRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  const items = await prisma.category.findMany({ where: { userId: req.userId! } });
  res.json(items);
});

categoriesRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  const parse = upsertSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const item = await prisma.category.create({ data: { ...parse.data, userId: req.userId! } });
  res.status(201).json(item);
});

categoriesRouter.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parse = upsertSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  
  // Update the category
  const updated = await prisma.category.updateMany({ where: { id, userId: req.userId! }, data: parse.data });
  if (updated.count === 0) return res.status(404).json({ error: "Not found" });
  
  // Update all transactions with this category to match the new type
  await prisma.transaction.updateMany({
    where: { categoryId: id, userId: req.userId! },
    data: { type: parse.data.type }
  });
  
  const item = await prisma.category.findUnique({ where: { id } });
  res.json(item);
});

categoriesRouter.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const inUse = await prisma.transaction.count({ where: { userId: req.userId!, categoryId: id } });
  if (inUse > 0) return res.status(409).json({ error: "Category in use by transactions" });
  const del = await prisma.category.deleteMany({ where: { id, userId: req.userId! } });
  if (del.count === 0) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});


