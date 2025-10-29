import { Router } from "express";
import { prisma } from "../db/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { z } from "zod";
import { getMarketData } from "../services/marketData";
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
  const items = await prisma.holding.findMany({ where: { portfolioId } });
  res.json(items);
});
assetsRouter.post("/portfolios/:portfolioId/holdings", requireAuth, async (req: AuthRequest, res) => {
  const portfolioId = Number(req.params.portfolioId);
  const parse = holdingSchema.safeParse({ ...req.body, portfolioId });
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const item = await prisma.holding.create({ data: parse.data });
  res.status(201).json(item);
});
assetsRouter.put("/holdings/:holdingId", requireAuth, async (req: AuthRequest, res) => {
  const holdingId = Number(req.params.holdingId);
  const parse = holdingSchema.partial({ portfolioId: true }).safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const item = await prisma.holding.update({ where: { id: holdingId }, data: parse.data });
  res.json(item);
});
assetsRouter.delete("/holdings/:holdingId", requireAuth, async (req: AuthRequest, res) => {
  const holdingId = Number(req.params.holdingId);
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
assetsRouter.get("/asset-groups", requireAuth, async (req: AuthRequest, res) => {
  const groups = await prisma.assetGroup.findMany({ where: { userId: req.userId! }, include: { items: { include: { valuations: true } } } });
  // No filtering here; frontend controls visibility but needs full data to show hidden gap indicators
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
  const g = await prisma.assetGroup.findUnique({ where: { id }, include: { items: { include: { valuations: true } } } });
  res.json(g);
});
assetsRouter.delete("/asset-groups/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const del = await prisma.assetGroup.deleteMany({ where: { id, userId: req.userId! } });
  if (del.count === 0) return res.status(404).json({ error: "Not Found" });
  res.status(204).end();
});

const itemSchema = z.object({ 
  name: z.string().min(1), 
  description: z.string().optional(), 
  hidden: z.boolean().optional(),
  depreciationAmount: z.number().optional()
});
assetsRouter.post("/asset-groups/:groupId/items", requireAuth, async (req: AuthRequest, res) => {
  const groupId = Number(req.params.groupId);
  const parse = itemSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const item = await prisma.assetItem.create({ 
    data: { 
      groupId, 
      name: parse.data.name, 
      description: parse.data.description,
      depreciationAmount: parse.data.depreciationAmount
    } 
  });
  res.status(201).json(item);
});
assetsRouter.put("/asset-items/:itemId", requireAuth, async (req: AuthRequest, res) => {
  const itemId = Number(req.params.itemId);
  const parse = itemSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const item = await prisma.assetItem.update({ where: { id: itemId }, data: parse.data });
  res.json(item);
});
assetsRouter.delete("/asset-items/:itemId", requireAuth, async (req: AuthRequest, res) => {
  const itemId = Number(req.params.itemId);
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
    const childIds = children.map((c) => c.id);
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
  const parse = itemSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const parent = await prisma.assetItem.findUnique({ where: { id: itemId } });
  if (!parent) return res.status(404).json({ error: "Parent not found" });
  // Until DB migration makes groupId nullable, inherit parent's groupId to satisfy relation
  if (!parent.groupId) return res.status(400).json({ error: "Parent missing group" });
  const child = await prisma.assetItem.create({ data: { groupId: parent.groupId, parentItemId: itemId, name: parse.data.name, description: parse.data.description } });
  res.status(201).json(child);
});

const valuationSchema = z.object({ month: z.string(), value: z.number() });
assetsRouter.post("/asset-items/:itemId/valuations", requireAuth, async (req: AuthRequest, res) => {
  const itemId = Number(req.params.itemId);
  const parse = valuationSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const childCount = await prisma.assetItem.count({ where: { parentItemId: itemId } });
  if (childCount > 0) return res.status(400).json({ error: "Valuations are only allowed on leaf items" });
  const month = dayjs(parse.data.month).startOf("month").toDate();
  const v = await prisma.assetValuation.upsert({ where: { itemId_month: { itemId, month } }, update: { value: parse.data.value }, create: { itemId, month, value: parse.data.value } });
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
  
  // Get all leaf items (without children) with depreciation amounts
  const itemsWithDepreciation = await prisma.assetItem.findMany({
    where: {
      group: { userId: req.userId! },
      depreciationAmount: { not: null },
      children: { none: {} } // Only items without children (leaf items)
    },
    include: {
      valuations: {
        where: { 
          month: { 
            lt: monthDate // Get valuations before the new month
          } 
        },
        orderBy: { month: 'desc' },
        take: 1
      }
    }
  });
  
  const valuationsToCreate = [];
  
  for (const item of itemsWithDepreciation) {
    if (item.valuations.length > 0) {
      const previousValue = Number(item.valuations[0].value);
      const depreciationAmount = Number(item.depreciationAmount || 0);
      const newValue = Math.max(0, previousValue - depreciationAmount); // Don't go below 0
      
      // Only create valuation if there's actually a previous value to depreciate from
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


