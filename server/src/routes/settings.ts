import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
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

// Export transactions as JSON
settingsRouter.get("/export/transactions", requireAuth, async (req: AuthRequest, res) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.userId! },
    include: {
      account: { select: { name: true, type: true } },
      category: { select: { name: true, type: true } }
    },
    orderBy: { date: 'desc' }
  });

  const exportData = {
    exportDate: new Date().toISOString(),
    exportType: 'transactions',
    version: '1.0',
    data: transactions.map(tx => ({
      id: tx.id,
      date: tx.date.toISOString(),
      amount: Number(tx.amount),
      type: tx.type,
      notes: tx.notes,
      account: {
        name: tx.account.name,
        type: tx.account.type
      },
      category: {
        name: tx.category.name,
        type: tx.category.type
      },
      createdAt: tx.createdAt.toISOString()
    }))
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="fintrack-transactions-${new Date().toISOString().split('T')[0]}.json"`);
  res.json(exportData);
});

// Export assets as JSON
settingsRouter.get("/export/assets", requireAuth, async (req: AuthRequest, res) => {
  const assetGroups = await prisma.assetGroup.findMany({
    where: { userId: req.userId! },
    include: {
      items: {
        include: {
          valuations: {
            orderBy: { month: 'desc' }
          },
          children: {
            include: {
              valuations: {
                orderBy: { month: 'desc' }
              }
            }
          }
        }
      }
    }
  });

  const exportData = {
    exportDate: new Date().toISOString(),
    exportType: 'assets',
    version: '1.0',
    data: assetGroups.map(group => ({
      id: group.id,
      name: group.name,
      order: (group as any).order || 0,
      items: (group.items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        order: item.order || 0,
        hidden: item.hidden,
        depreciationAmount: item.depreciationAmount ? Number(item.depreciationAmount) : null,
        valuations: item.valuations.map((v: any) => ({
          month: v.month.toISOString(),
          value: Number(v.value),
          formula: v.formula,
          note: v.note
        })),
        children: (item.children || []).map((child: any) => ({
          id: child.id,
          name: child.name,
          description: child.description,
          order: child.order || 0,
          hidden: child.hidden,
          depreciationAmount: child.depreciationAmount ? Number(child.depreciationAmount) : null,
          valuations: child.valuations.map((v: any) => ({
            month: v.month.toISOString(),
            value: Number(v.value),
            formula: v.formula,
            note: v.note
          }))
        }))
      }))
    }))
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="fintrack-assets-${new Date().toISOString().split('T')[0]}.json"`);
  res.json(exportData);
});


