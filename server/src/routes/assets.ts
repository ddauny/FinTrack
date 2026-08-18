import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { z } from "zod";
import { getMarketData } from "../services/marketData.js";
import dayjs from "dayjs";

export const assetsRouter = Router();

// Portfolios
const portfolioSchema = z.object({ name: z.string().min(1) });
assetsRouter.get("/portfolios", requireAuth, async (req: AuthRequest, res) => {
  const items = await prisma.portfolio.findMany({ where: { userId: req.userId! }, include: { holdings: true } });
  res.json(items);
});
assetsRouter.post("/portfolios", requireAuth, async (req: AuthRequest, res) => {
  const parse = portfolioSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const item = await prisma.portfolio.create({ data: { userId: req.userId!, name: parse.data.name } });
  res.status(201).json(item);
});
assetsRouter.put("/portfolios/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parse = portfolioSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const updated = await prisma.portfolio.updateMany({ where: { id, userId: req.userId! }, data: { name: parse.data.name } });
  if (updated.count === 0) return res.status(404).json({ error: "Not found" });
  const item = await prisma.portfolio.findUnique({ where: { id } });
  res.json(item);
});
assetsRouter.delete("/portfolios/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const del = await prisma.portfolio.deleteMany({ where: { id, userId: req.userId! } });
  if (del.count === 0) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

// Holdings
const holdingSchema = z.object({
  portfolioId: z.number().int(),
  tickerSymbol: z.string().min(1),
  quantity: z.number(),
  avgPurchasePrice: z.number(),
});
assetsRouter.get("/portfolios/:portfolioId/holdings", requireAuth, async (req: AuthRequest, res) => {
  const portfolioId = Number(req.params.portfolioId);
  const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId: req.userId! } });
  if (!portfolio) return res.status(404).json({ error: "Not found" });
  const items = await prisma.holding.findMany({ where: { portfolioId } });
  res.json(items);
});
assetsRouter.post("/portfolios/:portfolioId/holdings", requireAuth, async (req: AuthRequest, res) => {
  const portfolioId = Number(req.params.portfolioId);
  const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId: req.userId! } });
  if (!portfolio) return res.status(404).json({ error: "Not found" });
  const parse = holdingSchema.safeParse({ ...req.body, portfolioId });
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const item = await prisma.holding.create({ data: parse.data });
  res.status(201).json(item);
});
assetsRouter.put("/holdings/:holdingId", requireAuth, async (req: AuthRequest, res) => {
  const holdingId = Number(req.params.holdingId);
  const parse = holdingSchema.partial({ portfolioId: true }).safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const owned = await prisma.holding.findFirst({ where: { id: holdingId, portfolio: { userId: req.userId! } } });
  if (!owned) return res.status(404).json({ error: "Not found" });
  const item = await prisma.holding.update({ where: { id: holdingId }, data: parse.data });
  res.json(item);
});
assetsRouter.delete("/holdings/:holdingId", requireAuth, async (req: AuthRequest, res) => {
  const holdingId = Number(req.params.holdingId);
  const owned = await prisma.holding.findFirst({ where: { id: holdingId, portfolio: { userId: req.userId! } } });
  if (!owned) return res.status(404).json({ error: "Not found" });
  await prisma.holding.delete({ where: { id: holdingId } });
  res.status(204).end();
});

// Manual Assets
const manualAssetSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  estimatedValue: z.number(),
  associatedDebt: z.number().optional().default(0),
});
assetsRouter.get("/manual-assets", requireAuth, async (req: AuthRequest, res) => {
  const items = await prisma.manualAsset.findMany({ where: { userId: req.userId! } });
  res.json(items);
});
assetsRouter.post("/manual-assets", requireAuth, async (req: AuthRequest, res) => {
  const parse = manualAssetSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const item = await prisma.manualAsset.create({ data: { ...parse.data, userId: req.userId! } });
  res.status(201).json(item);
});
assetsRouter.put("/manual-assets/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parse = manualAssetSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const updated = await prisma.manualAsset.updateMany({ where: { id, userId: req.userId! }, data: parse.data });
  if (updated.count === 0) return res.status(404).json({ error: "Not found" });
  const item = await prisma.manualAsset.findUnique({ where: { id } });
  res.json(item);
});
assetsRouter.delete("/manual-assets/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const del = await prisma.manualAsset.deleteMany({ where: { id, userId: req.userId! } });
  if (del.count === 0) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

// Market data (cached) stub
assetsRouter.get("/market-data", requireAuth, async (_req: AuthRequest, res) => {
  res.json(getMarketData());
});

// Asset Groups & Items & Valuations
const groupSchema = z.object({ name: z.string().min(1) });

// --- BTP / Bond schemas ---
const couponTierSchema = z.object({
  fromYear: z.number().int().min(1),
  toYear: z.number().int().min(1),
  rate: z.number(),
});
const bondDataSchema = z.object({
  isin: z.string().nullable().optional(),
  purchaseDate: z.string().nullable().optional(),
  nominalValue: z.number(),
  purchasePrice: z.number().optional().default(100),
  bankCommissions: z.number().optional().default(0),
  maturityDate: z.string(),
  couponRate: z.number().nullable().optional(),
  couponFrequency: z.number().int().optional().default(6),
  taxRate: z.number().optional().default(12.5),
  couponTiers: z.array(couponTierSchema).optional(),
  linkedAccountId: z.number().int().nullable().optional(),
  linkedCategoryId: z.number().int().nullable().optional(),
});
// --- Fine BTP schemas ---

assetsRouter.get("/asset-groups", requireAuth, async (req: AuthRequest, res) => {
  const groups = await prisma.assetGroup.findMany({
    where: { userId: req.userId! },
    include: { items: { include: { valuations: true, bondData: { include: { couponTiers: true } } }, orderBy: { order: 'asc' } } },
    orderBy: { order: 'asc' }
  });
  res.json(groups);
});
assetsRouter.post("/asset-groups", requireAuth, async (req: AuthRequest, res) => {
  const parse = groupSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const g = await prisma.assetGroup.create({ data: { userId: req.userId!, name: parse.data.name } });
  res.status(201).json(g);
});
assetsRouter.put("/asset-groups/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parse = groupSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const u = await prisma.assetGroup.updateMany({ where: { id, userId: req.userId! }, data: { name: parse.data.name } });
  if (u.count === 0) return res.status(404).json({ error: "Not Found" });
  const g = await prisma.assetGroup.findUnique({ where: { id }, include: { items: { include: { valuations: true, bondData: { include: { couponTiers: true } } } } } });
  res.json(g);
});
assetsRouter.delete("/asset-groups/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const del = await prisma.assetGroup.deleteMany({ where: { id, userId: req.userId! } });
  if (del.count === 0) return res.status(404).json({ error: "Not Found" });
  res.status(204).end();
});

// --- MODIFICA CHIAVE: Schemi separati per Creazione e Aggiornamento ---
const itemCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  hidden: z.boolean().optional(),
  depreciationAmount: z.number().optional(),
  bondData: bondDataSchema.optional()
});
// Lo schema di aggiornamento ha tutti i campi opzionali
const itemUpdateSchema = itemCreateSchema.partial().extend({
  groupId: z.number().optional()
});
// --- FINE MODIFICA ---

assetsRouter.post("/asset-groups/:groupId/items", requireAuth, async (req: AuthRequest, res) => {
  const groupId = Number(req.params.groupId);
  const parse = itemCreateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const { bondData: bondInput, ...itemData } = parse.data;
  const item = await prisma.assetItem.create({
    data: {
      groupId,
      name: itemData.name,
      description: itemData.description,
      depreciationAmount: itemData.depreciationAmount,
      ...(bondInput ? {
        bondData: {
          create: {
            isin: bondInput.isin,
            purchaseDate: bondInput.purchaseDate ? new Date(bondInput.purchaseDate) : null,
            nominalValue: bondInput.nominalValue,
            purchasePrice: bondInput.purchasePrice,
            bankCommissions: bondInput.bankCommissions,
            maturityDate: new Date(bondInput.maturityDate),
            couponRate: bondInput.couponRate,
            couponFrequency: bondInput.couponFrequency,
            taxRate: bondInput.taxRate,
            linkedAccountId: bondInput.linkedAccountId,
            linkedCategoryId: bondInput.linkedCategoryId,
            ...(bondInput.couponTiers && bondInput.couponTiers.length > 0 ? {
              couponTiers: { create: bondInput.couponTiers }
            } : {})
          }
        }
      } : {})
    },
    include: { bondData: { include: { couponTiers: true } } }
  });
  res.status(201).json(item);
});

// --- MODIFICA CHIAVE: L'endpoint PUT ora usa il nuovo schema ---
assetsRouter.put("/asset-items/:itemId", requireAuth, async (req: AuthRequest, res) => {
  const itemId = Number(req.params.itemId);

  const parse = itemUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid payload", details: parse.error });
  }

  const itemToUpdate = await prisma.assetItem.findFirst({
    where: { id: itemId, group: { userId: req.userId! } }
  });
  if (!itemToUpdate) return res.status(404).json({ error: "Not found or forbidden" });

  const { bondData: bondInput, groupId, ...itemFields } = parse.data;

  // Se l'utente ha provato a spostare l'item in un altro gruppo, verifica che quel gruppo esista e gli appartenga
  if (groupId !== undefined) {
    const targetGroup = await prisma.assetGroup.findFirst({
      where: { id: groupId, userId: req.userId! }
    });
    if (!targetGroup) return res.status(400).json({ error: "Target group not found or forbidden" });
  }

  // Aggiorna i campi base dell'item
  const item = await prisma.assetItem.update({
    where: { id: itemId },
    data: {
      ...itemFields,
      ...(groupId !== undefined ? { groupId } : {})
    }
  });

  // Gestisci bondData se presente nel payload
  if (bondInput !== undefined) {
    // Upsert bondData
    await prisma.bondData.upsert({
      where: { itemId },
      update: {
        isin: bondInput.isin,
        purchaseDate: bondInput.purchaseDate ? new Date(bondInput.purchaseDate) : null,
        nominalValue: bondInput.nominalValue,
        purchasePrice: bondInput.purchasePrice,
        bankCommissions: bondInput.bankCommissions,
        maturityDate: new Date(bondInput.maturityDate!),
        couponRate: bondInput.couponRate,
        couponFrequency: bondInput.couponFrequency,
        taxRate: bondInput.taxRate,
        linkedAccountId: bondInput.linkedAccountId,
        linkedCategoryId: bondInput.linkedCategoryId,
      },
      create: {
        itemId,
        isin: bondInput.isin,
        purchaseDate: bondInput.purchaseDate ? new Date(bondInput.purchaseDate) : null,
        nominalValue: bondInput.nominalValue!,
        purchasePrice: bondInput.purchasePrice,
        bankCommissions: bondInput.bankCommissions,
        maturityDate: new Date(bondInput.maturityDate!),
        couponRate: bondInput.couponRate,
        couponFrequency: bondInput.couponFrequency,
        taxRate: bondInput.taxRate,
        linkedAccountId: bondInput.linkedAccountId,
        linkedCategoryId: bondInput.linkedCategoryId,
      }
    });

    // Replace coupon tiers if provided
    if (bondInput.couponTiers !== undefined) {
      const existingBond = await prisma.bondData.findUnique({ where: { itemId } });
      if (existingBond) {
        await prisma.couponTier.deleteMany({ where: { bondId: existingBond.id } });
        if (bondInput.couponTiers.length > 0) {
          await prisma.couponTier.createMany({
            data: bondInput.couponTiers.map(t => ({ bondId: existingBond.id, ...t }))
          });
        }
      }
    }
  }

  // Ritorna l'item aggiornato con bondData
  const updated = await prisma.assetItem.findUnique({
    where: { id: itemId },
    include: { bondData: { include: { couponTiers: true } } }
  });
  res.json(updated);
});
// --- FINE MODIFICA ---

// Delete bond data from an item (toggle off)
assetsRouter.delete("/asset-items/:itemId/bond-data", requireAuth, async (req: AuthRequest, res) => {
  const itemId = Number(req.params.itemId);
  const itemCheck = await prisma.assetItem.findFirst({
    where: { id: itemId, group: { userId: req.userId! } }
  });
  if (!itemCheck) return res.status(404).json({ error: "Not found or forbidden" });

  const del = await prisma.bondData.deleteMany({ where: { itemId } });
  if (del.count === 0) return res.status(404).json({ error: "No bond data found" });
  res.status(204).end();
});

assetsRouter.delete("/asset-items/:itemId", requireAuth, async (req: AuthRequest, res) => {
  const itemId = Number(req.params.itemId);
  // Aggiunto controllo di sicurezza
  const itemToDelete = await prisma.assetItem.findFirst({
    where: { id: itemId, group: { userId: req.userId! } }
  });
  if (!itemToDelete) return res.status(404).json({ error: "Not found or forbidden" });

  await prisma.assetItem.delete({ where: { id: itemId } });
  res.status(204).end();
});

// Helpers to fetch descendants
async function getDescendantIds(rootId: number): Promise<number[]> {
  const ids: number[] = [];
  let frontier: number[] = [rootId];
  while (frontier.length > 0) {
    const children = await prisma.assetItem.findMany({ where: { parentItemId: { in: frontier } }, select: { id: true } });
    if (children.length === 0) break;
    const childIds = children.map((c: any) => c.id);
    ids.push(...childIds);
    frontier = childIds;
  }
  return ids;
}

// Collapse: hide all descendants of an item (not the item itself)
assetsRouter.post("/asset-items/:itemId/collapse", requireAuth, async (req: AuthRequest, res) => {
  const itemId = Number(req.params.itemId);
  const root = await prisma.assetItem.findUnique({ where: { id: itemId }, include: { group: true } });
  if (!root) return res.status(404).json({ error: "Not found" });
  if (root.groupId) {
    const g = await prisma.assetGroup.findUnique({ where: { id: root.groupId } });
    if (!g || g.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });
  }
  const descendantIds = await getDescendantIds(itemId);
  if (descendantIds.length === 0) return res.json({ updated: 0 });
  const updated = await prisma.assetItem.updateMany({ where: { id: { in: descendantIds } }, data: { hidden: true } });
  res.json({ updated: updated.count });
});

// Expand: show all descendants of an item (not the item itself)
assetsRouter.post("/asset-items/:itemId/expand", requireAuth, async (req: AuthRequest, res) => {
  const itemId = Number(req.params.itemId);
  const root = await prisma.assetItem.findUnique({ where: { id: itemId }, include: { group: true } });
  if (!root) return res.status(404).json({ error: "Not found" });
  if (root.groupId) {
    const g = await prisma.assetGroup.findUnique({ where: { id: root.groupId } });
    if (!g || g.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });
  }
  const descendantIds = await getDescendantIds(itemId);
  if (descendantIds.length === 0) return res.json({ updated: 0 });
  const updated = await prisma.assetItem.updateMany({ where: { id: { in: descendantIds } }, data: { hidden: false } });
  res.json({ updated: updated.count });
});

// Create nested child under an item
assetsRouter.post("/asset-items/:itemId/children", requireAuth, async (req: AuthRequest, res) => {
  const itemId = Number(req.params.itemId);
  const parse = itemCreateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const parent = await prisma.assetItem.findFirst({ where: { id: itemId, group: { userId: req.userId! } } });
  if (!parent) return res.status(404).json({ error: "Parent not found" });
  if (!parent.groupId) return res.status(400).json({ error: "Parent missing group" });

  const { bondData: bondInput, ...itemData } = parse.data;

  const child = await prisma.assetItem.create({
    data: {
      groupId: parent.groupId,
      parentItemId: itemId,
      name: itemData.name,
      description: itemData.description,
      ...(bondInput ? {
        bondData: {
          create: {
            isin: bondInput.isin,
            purchaseDate: bondInput.purchaseDate ? new Date(bondInput.purchaseDate) : null,
            nominalValue: bondInput.nominalValue,
            purchasePrice: bondInput.purchasePrice,
            bankCommissions: bondInput.bankCommissions,
            maturityDate: new Date(bondInput.maturityDate),
            couponRate: bondInput.couponRate,
            couponFrequency: bondInput.couponFrequency,
            taxRate: bondInput.taxRate,
            ...(bondInput.couponTiers && bondInput.couponTiers.length > 0 ? {
              couponTiers: { create: bondInput.couponTiers }
            } : {})
          }
        }
      } : {})
    },
    include: { bondData: { include: { couponTiers: true } } }
  });
  res.status(201).json(child);
});

// --- MODIFICA CHIAVE: Lo schema Zod ora accetta 'null' per 'note' E 'formula' ---
const valuationSchema = z.object({
  month: z.string(),
  value: z.number(),
  formula: z.string().nullable().optional(),
  note: z.preprocess(
    (input) => (typeof input === "string" && input.trim() === "" ? null : input),
    z.string().nullable().optional()
  )
});

// --- FINE MODIFICA ---

assetsRouter.post("/asset-items/:itemId/valuations", requireAuth, async (req: AuthRequest, res) => {
  const itemId = Number(req.params.itemId);
  // DEBUG: log incoming payload
  console.log("Received valuation payload:", req.body);
  const parse = valuationSchema.safeParse(req.body);

  if (!parse.success) {
    console.error("Valuation validation error", parse.error);
    return res.status(400).json({ error: "Invalid payload", details: parse.error });
  }

  const item = await prisma.assetItem.findFirst({ where: { id: itemId, group: { userId: req.userId! } } });
  if (!item) return res.status(404).json({ error: "Not found or forbidden" });

  const childCount = await prisma.assetItem.count({ where: { parentItemId: itemId } });
  if (childCount > 0) return res.status(400).json({ error: "Valuations are only allowed on leaf items" });

  const month = dayjs(parse.data.month).startOf("month").toDate();

  const v = await prisma.assetValuation.upsert({
    where: { itemId_month: { itemId, month } },
    update: {
      value: parse.data.value,
      formula: parse.data.formula,
      note: parse.data.note
    },
    create: {
      itemId,
      month,
      value: parse.data.value,
      formula: parse.data.formula,
      note: parse.data.note
    }
  });
  res.status(201).json(v);
});

// Delete all valuations for a given month (for current user)
assetsRouter.delete("/asset-valuations", requireAuth, async (req: AuthRequest, res) => {
  const monthStr = String((req.query as any).month || "");
  if (!monthStr) return res.status(400).json({ error: "month required (YYYY-MM-01)" });
  const month = dayjs(monthStr).startOf("month").toDate();
  const del = await prisma.assetValuation.deleteMany({
    where: { month, item: { group: { userId: req.userId! } } },
  });
  res.json({ deleted: del.count });
});

// Apply depreciation to all items for a new month
assetsRouter.post("/asset-valuations/apply-depreciation", requireAuth, async (req: AuthRequest, res) => {
  const { month } = req.body;
  if (!month) return res.status(400).json({ error: "Month parameter required" });

  const monthDate = new Date(month);
  const previousMonth = new Date(monthDate);
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  const previousMonthKey = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}-01`;

  const itemsWithDepreciation = await prisma.assetItem.findMany({
    where: {
      group: { userId: req.userId! },
      depreciationAmount: { not: null },
      children: { none: {} }
    },
    include: {
      valuations: {
        where: {
          month: {
            lt: monthDate
          }
        },
        orderBy: { month: 'desc' },
        take: 1
      }
    }
  });

  const valuationsToCreate: any[] = [];

  for (const item of itemsWithDepreciation) {
    if (item.valuations.length > 0) {
      const previousValue = Number(item.valuations[0].value);
      const depreciationAmount = Number(item.depreciationAmount || 0);
      const newValue = Math.max(0, previousValue - depreciationAmount);

      if (previousValue > 0) {
        valuationsToCreate.push({
          itemId: item.id,
          month: monthDate,
          value: newValue
        });
      }
    }
  }

  if (valuationsToCreate.length > 0) {
    await prisma.assetValuation.createMany({
      data: valuationsToCreate,
      skipDuplicates: true
    });
  }

  res.json({ applied: valuationsToCreate.length });
});


// --- MODIFICA: ENDPOINT EFFICIENTE per nascondere un intero gruppo ---
assetsRouter.post("/asset-groups/:groupId/hide-all", requireAuth, async (req: AuthRequest, res) => {
  const groupId = Number(req.params.groupId);
  // Verifica che il gruppo appartenga all'utente
  const group = await prisma.assetGroup.findFirst({
    where: { id: groupId, userId: req.userId! }
  });
  if (!group) return res.status(404).json({ error: "Not found or forbidden" });

  // Nascondi tutti gli item in quel gruppo con una sola query
  const updated = await prisma.assetItem.updateMany({
    where: { groupId: groupId },
    data: { hidden: true }
  });
  res.json({ updated: updated.count });
});

// --- MODIFICA: ENDPOINT EFFICIENTE per mostrare tutte le righe ---
assetsRouter.post("/asset-items/show-all", requireAuth, async (req: AuthRequest, res) => {
  // Mostra tutte le righe nascoste per l'utente loggato
  const updated = await prisma.assetItem.updateMany({
    where: {
      group: { userId: req.userId! },
      hidden: true
    },
    data: { hidden: false }
  });
  res.json({ updated: updated.count });
});

// --- REORDER ENDPOINTS ---
// Reorder asset groups
assetsRouter.post("/asset-groups/reorder", requireAuth, async (req: AuthRequest, res) => {
  const { groupIds } = req.body as { groupIds: number[] };
  if (!Array.isArray(groupIds)) return res.status(400).json({ error: "Invalid payload" });

  // Update order for each group
  await Promise.all(
    groupIds.map((id, index) =>
      prisma.assetGroup.updateMany({
        where: { id, userId: req.userId! },
        data: { order: index }
      })
    )
  );

  res.json({ success: true });
});

// Reorder asset items within a group or parent
assetsRouter.post("/asset-items/reorder", requireAuth, async (req: AuthRequest, res) => {
  const { itemIds } = req.body as { itemIds: number[] };
  if (!Array.isArray(itemIds)) return res.status(400).json({ error: "Invalid payload" });

  // Update order for each item
  await Promise.all(
    itemIds.map((id, index) =>
      prisma.assetItem.updateMany({
        where: { id, group: { userId: req.userId! } },
        data: { order: index }
      })
    )
  );

  res.json({ success: true });
});