import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { encryptSecret, isEncryptionConfigured } from "../utils/crypto.js";
import { validateProviderConfig } from "../services/screenshotOcr.js";

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

// Get automation token for current user
settingsRouter.get("/automation-token", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ 
    where: { id: req.userId! },
    select: { automationToken: true }
  });
  
  res.json({ token: user?.automationToken || null });
});

// Generate new automation token for current user
settingsRouter.post("/automation-token", requireAuth, async (req: AuthRequest, res) => {
  const payload = { sub: req.userId! };
  const token = jwt.sign(payload, env.jwtSecret); // No expiration for automation
  
  // Update user with new token
  await prisma.user.update({
    where: { id: req.userId! },
    data: { automationToken: token }
  });
  
  res.json({ token });
});

const aiProviderSchema = z.object({
  provider: z.string().min(1).max(50),
  baseUrl: z.string().url(),
  model: z.string().min(1).max(100),
  apiKey: z.string().min(1),
});

function aiProviderResponse(user: {
  screenshotAiProvider: string | null;
  screenshotAiBaseUrl: string | null;
  screenshotAiModel: string | null;
  screenshotAiKeyEncrypted: string | null;
} | null) {
  return {
    provider: user?.screenshotAiProvider ?? null,
    baseUrl: user?.screenshotAiBaseUrl ?? null,
    model: user?.screenshotAiModel ?? null,
    configured: Boolean(user?.screenshotAiKeyEncrypted && user?.screenshotAiBaseUrl && user?.screenshotAiModel),
  };
}

// Get the current user's AI provider config for screenshot import (never returns the key)
settingsRouter.get("/ai-provider", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: {
      screenshotAiProvider: true,
      screenshotAiBaseUrl: true,
      screenshotAiModel: true,
      screenshotAiKeyEncrypted: true,
    },
  });
  res.json(aiProviderResponse(user));
});

// Validate and save the current user's AI provider config
settingsRouter.put("/ai-provider", requireAuth, async (req: AuthRequest, res) => {
  if (!isEncryptionConfigured()) {
    return res.status(503).json({ error: "Encryption is not configured on this server (missing ENCRYPTION_KEY)" });
  }
  const parse = aiProviderSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const { provider, baseUrl, model, apiKey } = parse.data;

  const validation = await validateProviderConfig({ baseUrl, apiKey, model });
  if (validation.ok === false) {
    return res.status(400).json({ error: `Provider validation failed: ${validation.message}` });
  }

  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: {
      screenshotAiProvider: provider,
      screenshotAiBaseUrl: baseUrl,
      screenshotAiModel: model,
      screenshotAiKeyEncrypted: encryptSecret(apiKey),
    },
    select: {
      screenshotAiProvider: true,
      screenshotAiBaseUrl: true,
      screenshotAiModel: true,
      screenshotAiKeyEncrypted: true,
    },
  });
  res.json(aiProviderResponse(user));
});

// Clear the current user's AI provider config
settingsRouter.delete("/ai-provider", requireAuth, async (req: AuthRequest, res) => {
  await prisma.user.update({
    where: { id: req.userId! },
    data: {
      screenshotAiProvider: null,
      screenshotAiBaseUrl: null,
      screenshotAiModel: null,
      screenshotAiKeyEncrypted: null,
    },
  });
  res.json(aiProviderResponse(null));
});
