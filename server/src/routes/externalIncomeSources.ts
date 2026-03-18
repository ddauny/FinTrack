import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { fetchExternalValue } from "../services/externalIncome.js";

export const externalIncomeSourcesRouter = Router();
const externalIncomeModel = (prisma as any).externalIncomeSource;

const authTypeSchema = z.enum(["NONE", "BEARER", "API_KEY_HEADER", "API_KEY_QUERY", "CUSTOM_HEADER"]);
const httpMethodSchema = z.enum(["GET", "POST"]);
const ttlSchema = z.union([
  z.literal(5),
  z.literal(15),
  z.literal(60),
  z.literal(360),
  z.literal(1440),
]);

const createSchema = z.object({
  name: z.string().trim().min(1),
  icon: z.string().trim().max(16).optional().nullable(),
  color: z.string().trim().max(32).optional().nullable(),
  apiUrl: z.string().trim().url(),
  httpMethod: httpMethodSchema.default("GET"),
  authType: authTypeSchema.default("BEARER"),
  authToken: z.string().trim().optional().nullable(),
  authHeaderName: z.string().trim().optional().nullable(),
  authQueryParam: z.string().trim().optional().nullable(),
  responseField: z.string().trim().min(1),
  cacheTtlMinutes: ttlSchema.default(15),
  isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if ((data.authType === "BEARER" || data.authType === "API_KEY_HEADER" || data.authType === "API_KEY_QUERY" || data.authType === "CUSTOM_HEADER") && !data.authToken) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Auth token is required for selected auth type", path: ["authToken"] });
  }
  if ((data.authType === "API_KEY_HEADER" || data.authType === "CUSTOM_HEADER") && !data.authHeaderName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Header name is required for selected auth type", path: ["authHeaderName"] });
  }
  if (data.authType === "API_KEY_QUERY" && !data.authQueryParam) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Query param name is required for API key query auth", path: ["authQueryParam"] });
  }
});

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  icon: z.string().trim().max(16).optional().nullable(),
  color: z.string().trim().max(32).optional().nullable(),
  apiUrl: z.string().trim().url().optional(),
  httpMethod: httpMethodSchema.optional(),
  authType: authTypeSchema.optional(),
  authToken: z.string().trim().optional().nullable(),
  authHeaderName: z.string().trim().optional().nullable(),
  authQueryParam: z.string().trim().optional().nullable(),
  responseField: z.string().trim().min(1).optional(),
  cacheTtlMinutes: ttlSchema.optional(),
  isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (!data.authType) return;
  if ((data.authType === "BEARER" || data.authType === "API_KEY_HEADER" || data.authType === "API_KEY_QUERY" || data.authType === "CUSTOM_HEADER") && !data.authToken) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Auth token is required for selected auth type", path: ["authToken"] });
  }
  if ((data.authType === "API_KEY_HEADER" || data.authType === "CUSTOM_HEADER") && !data.authHeaderName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Header name is required for selected auth type", path: ["authHeaderName"] });
  }
  if (data.authType === "API_KEY_QUERY" && !data.authQueryParam) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Query param name is required for API key query auth", path: ["authQueryParam"] });
  }
});

function parseId(param: string): number | null {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

externalIncomeSourcesRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sources = await externalIncomeModel.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
    });
    res.json(sources);
  } catch (error) {
    console.error("Error fetching external income sources:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

externalIncomeSourcesRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
      return;
    }

    const source = await externalIncomeModel.create({
      data: {
        userId: req.userId!,
        name: parsed.data.name,
        icon: parsed.data.icon ?? null,
        color: parsed.data.color ?? null,
        apiUrl: parsed.data.apiUrl,
        httpMethod: parsed.data.httpMethod,
        authType: parsed.data.authType,
        authToken: parsed.data.authToken ?? null,
        authHeaderName: parsed.data.authHeaderName ?? null,
        authQueryParam: parsed.data.authQueryParam ?? null,
        responseField: parsed.data.responseField,
        cacheTtlMinutes: parsed.data.cacheTtlMinutes,
        isActive: parsed.data.isActive ?? true,
      },
    });

    res.status(201).json(source);
  } catch (error) {
    console.error("Error creating external income source:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

externalIncomeSourcesRouter.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const existing = await externalIncomeModel.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;

    const updated = await externalIncomeModel.update({
      where: { id },
      data: {
        name: data.name,
        icon: data.icon,
        color: data.color,
        apiUrl: data.apiUrl,
        httpMethod: data.httpMethod,
        authType: data.authType,
        authToken: data.authToken,
        authHeaderName: data.authHeaderName,
        authQueryParam: data.authQueryParam,
        responseField: data.responseField,
        cacheTtlMinutes: data.cacheTtlMinutes,
        isActive: data.isActive,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating external income source:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

externalIncomeSourcesRouter.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const deleted = await externalIncomeModel.deleteMany({
      where: { id, userId: req.userId! },
    });

    if (deleted.count === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.status(204).end();
  } catch (error) {
    console.error("Error deleting external income source:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

externalIncomeSourcesRouter.post("/:id/test", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const source = await externalIncomeModel.findFirst({ where: { id, userId: req.userId! } });
    if (!source) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const month = typeof req.body?.month === "string" && /^\d{4}-\d{2}$/.test(req.body.month)
      ? req.body.month
      : new Date().toISOString().slice(0, 7);
    const result = await fetchExternalValue(source, month);
    res.json({ ok: result.ok, value: result.value ?? undefined, error: result.error ?? undefined });
  } catch (error) {
    console.error("Error testing external income source:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

externalIncomeSourcesRouter.post("/:id/refresh", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const source = await externalIncomeModel.findFirst({ where: { id, userId: req.userId! } });
    if (!source) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const month = typeof req.body?.month === "string" && /^\d{4}-\d{2}$/.test(req.body.month)
      ? req.body.month
      : new Date().toISOString().slice(0, 7);
    const result = await fetchExternalValue(source, month);
    if (!result.ok || result.value === null) {
      res.status(502).json({ error: result.error ?? "Failed to refresh external income source" });
      return;
    }

    res.json({ value: result.value });
  } catch (error) {
    console.error("Error refreshing external income source:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
