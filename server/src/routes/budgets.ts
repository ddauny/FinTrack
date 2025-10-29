import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { z } from "zod";

export const budgetsRouter = Router();

const upsertSchema = z.object({
  categoryId: z.number().int(),
  amount: z.number(),
  period: z.enum(["Monthly", "Yearly"]),
});

budgetsRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const budgets = await prisma.budget.findMany({ where: { userId } });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [monthlySpending, yearlySpending] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "Expense", date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "Expense", date: { gte: yearStart } },
      _sum: { amount: true },
    }),
  ]);
  const monthlyMap = new Map(monthlySpending.map((s) => [s.categoryId, Number(s._sum.amount ?? 0)]));
  const yearlyMap = new Map(yearlySpending.map((s) => [s.categoryId, Number(s._sum.amount ?? 0)]));

  const enriched = budgets.map((b) => ({
    ...b,
    spent: (b.period === "Monthly" ? monthlyMap : yearlyMap).get(b.categoryId) ?? 0,
  }));

  res.json(enriched);
});

budgetsRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  const parse = upsertSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const item = await prisma.budget.create({ data: { ...parse.data, userId: req.userId! } });
  res.status(201).json(item);
});

budgetsRouter.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parse = upsertSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const updated = await prisma.budget.updateMany({ where: { id, userId: req.userId! }, data: parse.data });
  if (updated.count === 0) return res.status(404).json({ error: "Not found" });
  const item = await prisma.budget.findUnique({ where: { id } });
  res.json(item);
});

budgetsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const del = await prisma.budget.deleteMany({ where: { id, userId: req.userId! } });
  if (del.count === 0) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});


