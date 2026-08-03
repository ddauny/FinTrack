import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { parsePagination } from "../utils/pagination.js";
import { z } from "zod";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import multer from "multer";
import { extractTransactionsFromImage } from "../services/screenshotOcr.js";
import { suggestCategory } from "../services/merchantCategoryMatcher.js";
import { env } from "../config/env.js";

export const transactionsRouter = Router();

// Enable strict format-based parsing like DD/MM/YYYY
dayjs.extend(customParseFormat);

const createSchema = z.object({
  accountId: z.number().int(),
  categoryId: z.number().int(),
  date: z.string(),
  amount: z.number(),
  notes: z.string().optional(),
  recurringTransactionId: z.number().int().optional(),
  tagIds: z.array(z.number().int()).optional(),
});

transactionsRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  const { page, limit, skip } = parsePagination(req.query as any);
  const sortBy = String((req.query as any).sortBy ?? "date");
  const order = String((req.query as any).order ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const filterByCategory = (req.query as any).filterByCategory ? Number((req.query as any).filterByCategory) : undefined;
  const categoryName = (req.query as any).category;
  const startDate = (req.query as any).startDate;
  const endDate = (req.query as any).endDate;
  const searchQuery = (req.query as any).search;
  const txnType = (req.query as any).type;
  const filterByTag = (req.query as any).filterByTag ? Number((req.query as any).filterByTag) : undefined;
  
  const where: any = { userId: req.userId! };
  if (filterByCategory) where.categoryId = filterByCategory;
  if (filterByTag) where.tags = { some: { id: filterByTag } };
  
  // FIXED: Handle date filtering robustly using dayjs to ensure inclusivity
  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      // Use dayjs to parse robustly (supports YYYY-MM-DD, DD/MM/YYYY)
      // and get the start of the day (inclusive)
      const parsedStart = dayjs(startDate, ["YYYY-MM-DD", "DD/MM/YYYY"], true);
      if (parsedStart.isValid()) {
        where.date.gte = parsedStart.startOf('day').toDate();
      }
    }
    if (endDate) {
      // Use dayjs to parse robustly and get the end of the day (inclusive)
      const parsedEnd = dayjs(endDate, ["YYYY-MM-DD", "DD/MM/YYYY"], true);
      if (parsedEnd.isValid()) {
        where.date.lte = parsedEnd.endOf('day').toDate();
      }
    }
  }

  // Handle category name filtering
  if (categoryName) {
    where.category = {
      name: categoryName
    };
    console.log('Filtering by category name:', categoryName);
  }

  // Handle transaction type filtering (Expense/Income/Transfer)
  if (txnType && (txnType === 'Expense' || txnType === 'Income' || txnType === 'Transfer')) {
    where.type = txnType;
    console.log('Filtering by type:', txnType);
  }

  // Handle search query - search in category name, amount, and notes
  if (searchQuery && searchQuery.trim()) {
    const searchTerm = searchQuery.trim();
    console.log('Searching for:', searchTerm);
    
    where.OR = [
      // Search in category name
      {
        category: {
          name: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        }
      },
      // Search in notes
      {
        notes: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      },
      // Search in amount (convert to string for partial matching)
      {
        amount: {
          equals: parseFloat(searchTerm) || undefined
        }
      }
    ];
  }

  // Handle category sorting by joining with category table
  let orderBy: any = { [sortBy]: order };
  if (sortBy === 'categoryId') {
    orderBy = { category: { name: order } };
  }
  
  // FIXED: Handle date sorting and secondary sorting
  if (sortBy === 'date') {
    orderBy = [
      { date: order },
      // Secondary sort by ID, matching the primary order direction
      // This fixes unstable/incorrect sorting when dates are identical
      { id: order } 
    ];
  } else if (sortBy !== 'id') {
    // Add secondary sort by ID, matching the primary order direction
    orderBy = [orderBy, { id: order }];
  } else if (sortBy === 'id') {
    // Handle primary sort by ID
    orderBy = { id: order };
  }

  console.log('Final where clause:', JSON.stringify(where, null, 2));
  console.log('Search query:', searchQuery);

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({ 
      where, 
      orderBy,
      select: {
        id: true,
        date: true,
        amount: true,
        notes: true,
        accountId: true,
        categoryId: true,
        userId: true,
        type: true,
        recurringTransactionId: true,
        category: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        tags: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      },
      skip, 
      take: limit 
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({ page, limit, total, items });
});

// Get existing notes for autocomplete - MUST be before /:id route
transactionsRouter.get("/notes", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const query = String(req.query.q || '').toLowerCase();
  
  const notes = await prisma.transaction.findMany({
    where: { 
      userId,
      notes: { 
        not: null,
        contains: query,
        mode: 'insensitive'
      }
    },
    select: { notes: true },
    distinct: ['notes'],
    take: 10
  });
  
  const suggestions = notes
    .map(t => t.notes)
    .filter(Boolean)
    .filter((note, index, arr) => arr.indexOf(note) === index) // Remove duplicates
    .slice(0, 8); // Limit to 8 suggestions
  
  res.json(suggestions);
});

transactionsRouter.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const item = await prisma.transaction.findFirst({ where: { id, userId: req.userId! } });
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

transactionsRouter.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const item = await prisma.transaction.findFirst({ where: { id, userId: req.userId! } });
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

transactionsRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const data = parse.data;
  // Infer type from category
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  const type = category?.type || "Expense";
  const item = await prisma.transaction.create({
    data: {
      userId: req.userId!,
      accountId: data.accountId,
      categoryId: data.categoryId,
      date: dayjs(data.date, ["YYYY-MM-DD", "DD/MM/YYYY", "YYYY-MM-DDTHH:mm:ss.SSSZ" as any], true).isValid()
        ? dayjs(data.date, ["YYYY-MM-DD", "DD/MM/YYYY", "YYYY-MM-DDTHH:mm:ss.SSSZ" as any], true).toDate()
        : new Date(data.date),
      amount: data.amount,
      type,
      notes: data.notes,
      recurringTransactionId: data.recurringTransactionId,
      ...(data.tagIds?.length ? { tags: { connect: data.tagIds.map(id => ({ id })) } } : {}),
    },
    include: { tags: { select: { id: true, name: true, color: true } } },
  });
  res.status(201).json(item);
});

// 1. Definisci il nuovo schema di validazione (più semplice)
const shortcutExpenseSchema = z.object({
  amount: z.number().positive("Amount must be a positive number"),
  userId: z.number().int("accountId must be an integer"), // O z.string() se usi CUID/UUID
  notes: z.string().optional(),
  type: z.enum(["Expense", "Income"]).default("Expense"),
  categoryId: z.number().int("categoryId must be an integer").optional(), // Categoria opzionale
  categoryName: z.string().optional(), // Nome categoria opzionale (alternativa a categoryId)
});

// 2. Crea il nuovo endpoint
transactionsRouter.post(
  "/addExpenseFromShortcut",
  requireAuth, // <-- RIUTILIZZIAMO L'AUTENTICAZIONE!
  async (req: AuthRequest, res) => {
    
    // 3. VALIDAZIONE con Zod (Sicurezza contro dati malformati)
    console.log("PAYLOAD RICEVUTO:", req.body); // STAMPA IL PAYLOAD
    const parse = shortcutExpenseSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid payload", details: parse.error });
    }
    const data = parse.data;

    // 4. LOGICA DI BUSINESS (Categoria di default)
    // Dobbiamo trovare una categoria "di servizio" (es. "Da categorizzare")
    // che sia di tipo "Expense" e appartenga a questo utente.
    
    const userId = req.userId!; // Ottenuto da requireAuth
    const defaultCategoryName = "Da categorizzare"; // O "Uncategorized"

    let defaultCategory = await prisma.category.findFirst({
      where: {
        userId: userId,
        name: defaultCategoryName,
        type: "Expense",
      },
    });

    // Se non esiste, creala al volo
    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: {
          userId: userId,
          name: defaultCategoryName,
          type: "Expense",
        },
      });
    }

    // 5. CREAZIONE TRANSAZIONE (Sicuro grazie a Prisma)
    try {
      const item = await prisma.transaction.create({
        data: {
          userId: userId,
          accountId: data.userId,
          categoryId: defaultCategory.id, // <-- Usiamo l'ID della categoria di default
          date: new Date(), // <-- Usiamo la data odierna
          amount: data.amount,
          type: "Expense", // <-- Tipo fisso, come da nome endpoint
          notes: data.notes,
        },
      });

      res.status(201).json(item);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Could not create transaction" });
    }
  }
);

transactionsRouter.post(
  "/addExpenseFromShortcut",
  requireAuth, // <-- RIUTILIZZIAMO L'AUTENTICAZIONE!
  async (req: AuthRequest, res) => {
    
    // 3. VALIDAZIONE con Zod (Sicurezza contro dati malformati)
    console.log("PAYLOAD RICEVUTO:", req.body); // STAMPA IL PAYLOAD
    const parse = shortcutExpenseSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid payload", details: parse.error });
    }
    const data = parse.data;

    // 4. LOGICA DI BUSINESS (Categoria di default)
    // Dobbiamo trovare una categoria "di servizio" (es. "Da categorizzare")
    // che sia di tipo "Expense" e appartenga a questo utente.
    
    const userId = req.userId!; // Ottenuto da requireAuth
    const defaultCategoryName = "Da categorizzare"; // O "Uncategorized"

    let defaultCategory = await prisma.category.findFirst({
      where: {
        userId: userId,
        name: defaultCategoryName,
        type: "Expense",
      },
    });

    // Se non esiste, creala al volo
    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: {
          userId: userId,
          name: defaultCategoryName,
          type: "Expense",
        },
      });
    }

    // 5. CREAZIONE TRANSAZIONE (Sicuro grazie a Prisma)
    try {
      const item = await prisma.transaction.create({
        data: {
          userId: userId,
          accountId: data.userId,
          categoryId: defaultCategory.id, // <-- Usiamo l'ID della categoria di default
          date: new Date(), // <-- Usiamo la data odierna
          amount: data.amount,
          type: "Expense", // <-- Tipo fisso, come da nome endpoint
          notes: data.notes,
        },
      });

      res.status(201).json(item);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Could not create transaction" });
    }
  }
);

transactionsRouter.post(
  "/addTransactionFromShortcut",
  requireAuth, // <-- RIUTILIZZIAMO L'AUTENTICAZIONE!
  async (req: AuthRequest, res) => {
    
    // 3. VALIDAZIONE con Zod (Sicurezza contro dati malformati)
    console.log("PAYLOAD RICEVUTO:", req.body); // STAMPA IL PAYLOAD
    const parse = shortcutExpenseSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid payload", details: parse.error });
    }
    const data = parse.data;

    // 4. LOGICA DI BUSINESS (Categoria)
    const userId = req.userId!; // Ottenuto da requireAuth
    let categoryId: number;
    
    // Se è stato fornito categoryId, usalo direttamente
    if (data.categoryId) {
      // Verifica che la categoria esista e appartenga all'utente
      const category = await prisma.category.findFirst({
        where: {
          id: data.categoryId,
          userId: userId,
        },
      });
      
      if (!category) {
        return res.status(404).json({ error: "Category not found or not authorized" });
      }
      
      categoryId = category.id;
    }
    // Altrimenti, se è stato fornito categoryName, cercala o creala
    else if (data.categoryName) {
      console.log("Searching for category:", data.categoryName, "userId:", userId, "type:", data.type);
      
      let category = await prisma.category.findFirst({
        where: {
          userId: userId,
          name: { equals: data.categoryName, mode: "insensitive" },
        },
      });
      
      console.log("Found category:", category);
      
      // Se non esiste, creala con TitleCase
      if (!category) {
        // Formatta il nome in TitleCase (prima lettera maiuscola)
        const formattedName = data.categoryName
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        console.log("Creating new category:", formattedName);
        
        category = await prisma.category.create({
          data: {
            userId: userId,
            name: formattedName,
            type: data.type, // Usa il tipo della transazione
          },
        });
        
        console.log("Created category:", category);
      }
      
      categoryId = category.id;
    }
    // Altrimenti, usa la categoria di default "Da categorizzare"
    else {
      const defaultCategoryName = "Da categorizzare";
      
      let defaultCategory = await prisma.category.findFirst({
        where: {
          userId: userId,
          name: defaultCategoryName,
          type: data.type,
        },
      });

      // Se non esiste, creala al volo
      if (!defaultCategory) {
        defaultCategory = await prisma.category.create({
          data: {
            userId: userId,
            name: defaultCategoryName,
            type: data.type,
          },
        });
      }
      
      categoryId = defaultCategory.id;
    }

    // 5. CREAZIONE TRANSAZIONE (Sicuro grazie a Prisma)
    try {
      const item = await prisma.transaction.create({
        data: {
          userId: userId,
          accountId: data.userId,
          categoryId: categoryId,
          date: new Date(), // <-- Usiamo la data odierna
          amount: data.amount,
          type: data.type,
          notes: data.notes,
        },
      });

      res.status(201).json(item);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Could not create transaction" });
    }
  }
);

transactionsRouter.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload" });
  const data = parse.data;
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  const type = category?.type || "Expense";
  // Verify ownership
  const existing = await prisma.transaction.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const item = await prisma.transaction.update({
    where: { id },
    data: {
      accountId: data.accountId,
      categoryId: data.categoryId,
      date: dayjs(data.date, ["YYYY-MM-DD", "DD/MM/YYYY", "YYYY-MM-DDTHH:mm:ss.SSSZ" as any], true).isValid()
        ? dayjs(data.date, ["YYYY-MM-DD", "DD/MM/YYYY", "YYYY-MM-DDTHH:mm:ss.SSSZ" as any], true).toDate()
        : new Date(data.date),
      amount: data.amount,
      type,
      notes: data.notes,
      ...(data.tagIds !== undefined ? { tags: { set: data.tagIds.map(id => ({ id })) } } : {}),
    },
    include: { tags: { select: { id: true, name: true, color: true } } },
  });
  res.json(item);
});

transactionsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const del = await prisma.transaction.deleteMany({ where: { id, userId: req.userId! } });
  if (del.count === 0) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

// Delete all transactions for current user
transactionsRouter.delete("/", requireAuth, async (req: AuthRequest, res) => {
  const del = await prisma.transaction.deleteMany({ where: { userId: req.userId! } });
  res.json({ deleted: del.count });
});

// CSV import (multipart/form-data)
const upload = multer({ storage: multer.memoryStorage() });

transactionsRouter.post("/import", requireAuth, upload.single("file"), async (req: AuthRequest & { file?: Express.Multer.File }, res) => {
  if (!req.file) return res.status(400).json({ error: "File required" });
  const content = req.file.buffer.toString("utf8").replace(/^\uFEFF/, "");
  // CSV parser supports either categoryId or category name (case-insensitive)
  // Headers supported:
  // - date,amount,category,notes   (account created/used automaticamente)
  // - date,amount,accountId,categoryId,notes
  const lines = content.split(/\r?\n/).filter(Boolean);
  let [header, ...rows] = lines;
  function detectDelimiter(line: string): ',' | ';' {
    const semi = (line.match(/;/g)?.length || 0);
    const comma = (line.match(/,/g)?.length || 0);
    return semi > comma ? ';' : ',';
  }
  function splitLine(line: string, delim: ',' | ';'): string[] {
    return line
      .split(delim)
      .map((c) => c.trim().replace(/^"(.*)"$/, '$1'));
  }
  const headerDelim = detectDelimiter(header);
  const cols = splitLine(header, headerDelim).map((c) => c.trim());
  let headerHasKnown = cols.some((c) => ["date", "amount", "category", "categoryid", "notes", "accountid"].includes(c.toLowerCase()));
  // If no header detected, assume default order: date,amount,category,notes and treat first line as data
  const defaultOrder = ["date", "amount", "category", "notes"];
  const idx: Record<string, number> = headerHasKnown
    ? Object.fromEntries(cols.map((c, i) => [c.toLowerCase(), i]))
    : Object.fromEntries(defaultOrder.map((c, i) => [c, i]));
  if (!headerHasKnown) {
    rows = lines; // include the first line as data row
  }
  const created: number[] = [];
  const logPrefix = `[import uid:${req.userId}]`;
  // Basic diagnostics
  // eslint-disable-next-line no-console
  console.log(`${logPrefix} header=${header} delimiter='${headerDelim}' cols=${JSON.stringify(cols)}`);
  // eslint-disable-next-line no-console
  console.log(`${logPrefix} idx=${JSON.stringify(idx)}`);

  function toTitleCase(s: string): string {
    return s
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  let rowNum = 0;
  function parseAmountLocale(raw: string): number {
    if (raw == null) return 0;
    let s = String(raw).trim();
    s = s.replace(/[^0-9,.-]/g, ""); // keep digits and separators
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");
    if (hasComma && hasDot) {
      // Decide decimal by last separator
      const lastComma = s.lastIndexOf(",");
      const lastDot = s.lastIndexOf(".");
      if (lastComma > lastDot) {
        // comma is decimal -> remove dots as thousands, replace comma with dot
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        // dot is decimal -> remove commas as thousands
        s = s.replace(/,/g, "");
      }
    } else if (hasComma) {
      // only comma -> treat as decimal comma
      s = s.replace(/\./g, ""); // in case there are thousand dots
      s = s.replace(",", ".");
    } else {
      // only dot or plain number -> leave as is
      s = s.replace(/,/g, "");
    }
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  }

  for (const row of rows) {
    rowNum += 1;
    const rowDelim = detectDelimiter(row);
    const cells = splitLine(row, rowDelim).map((c) => c.trim());
    if (!cells.length) continue;
    try {
      let catId: number | null = null;
      let cat = null as any;
      if (idx["category"] !== undefined) {
        const raw = cells[idx["category"]] ?? '';
        const hasValue = raw !== undefined && raw !== null && String(raw).trim() !== '';
        if (hasValue) {
          const rawStr = String(raw).trim();
          if (/^\d+$/.test(rawStr)) {
            // Numeric provided in 'category' column -> treat as categoryId
            catId = Number(rawStr);
            cat = await prisma.category.findUnique({ where: { id: catId } });
          } else {
            const nameRaw = rawStr;
            const name = toTitleCase(nameRaw);
            cat = await prisma.category.findFirst({
              where: {
                userId: req.userId!,
                name: { equals: name, mode: "insensitive" },
              },
            });
            if (!cat) {
              cat = await prisma.category.create({ data: { userId: req.userId!, name, type: "Expense" } });
            }
            catId = cat.id;
          }
        }
      } else if (idx["categoryid"] !== undefined) {
        catId = Number(cells[idx["categoryid"]]);
        cat = await prisma.category.findUnique({ where: { id: catId } });
      }
      if (!catId) throw new Error("Missing category");
      if (!cat) {
        cat = await prisma.category.findUnique({ where: { id: catId } });
      }
      const inferredType = cat?.type || "Expense";
      const accountId = idx["accountid"] !== undefined && cells[idx["accountid"]]
        ? Number(cells[idx["accountid"]])
        : await ensurePrimaryAccount(req.userId!);
      const item = await prisma.transaction.create({
        data: {
          userId: req.userId!,
          date: (()=>{
            const raw = String(cells[idx["date"]] || "").trim()
            // Strict parse DD/MM/YYYY first
            if (dayjs(raw, "DD/MM/YYYY", true).isValid()) return dayjs(raw, "DD/MM/YYYY", true).toDate()
            // Then ISO-like and YYYY-MM-DD
            if (dayjs(raw, "YYYY-MM-DDTHH:mm:ss.SSSZ" as any, true).isValid()) return dayjs(raw).toDate()
            if (dayjs(raw, "YYYY-MM-DD", true).isValid()) return dayjs(raw, "YYYY-MM-DD", true).toDate()
            // Fallback: try native Date, but this may be locale-dependent
            return new Date(raw)
          })(),
          amount: parseAmountLocale(String(cells[idx["amount"]] ?? "0")),
          type: inferredType,
          accountId,
          categoryId: catId,
          notes: idx["notes"] !== undefined ? (cells[idx["notes"]] || undefined) : undefined,
        },
      });
      created.push(item.id);
    } catch (e) {
      // skip invalid rows
      // eslint-disable-next-line no-console
      console.warn(`${logPrefix} row#${rowNum} skipped:`, { row, error: (e as Error)?.message });
    }
  }
  // eslint-disable-next-line no-console
  console.log(`${logPrefix} imported=${created.length}`);
  res.json({ imported: created.length, ids: created });
});

// ─────────────────────────────────────────────────────────────────────────────
// Screenshot-based import (multipart/form-data, multi-file)
// Step 1: /extract — OCR + categorization suggestion + duplicate detection.
//   No DB writes. Returns candidate items the user reviews before confirming.
// Step 2: /bulk-import — validated, atomic creation of the confirmed items.
// ─────────────────────────────────────────────────────────────────────────────

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error(`Unsupported image type: ${file.mimetype}`));
  },
});

const DEFAULT_CATEGORY_NAME = "Da categorizzare";

// Resolve the user's default account: the first one, created on the fly if none
// exists. Same behavior as the CSV import — accounts are optional in the app.
async function ensurePrimaryAccount(userId: number): Promise<number> {
  const acc = await prisma.account.findFirst({ where: { userId }, orderBy: { id: "asc" } });
  if (acc) return acc.id;
  const created = await prisma.account.create({ data: { userId, name: "Primary", type: "Checking", initialBalance: 0 } });
  return created.id;
}

async function ensureDefaultCategory(userId: number, type: "Income" | "Expense") {
  let cat = await prisma.category.findFirst({
    where: { userId, name: DEFAULT_CATEGORY_NAME, type },
  });
  if (!cat) {
    cat = await prisma.category.create({ data: { userId, name: DEFAULT_CATEGORY_NAME, type } });
  }
  return cat;
}

// POST /api/transactions/extract
transactionsRouter.post(
  "/extract",
  requireAuth,
  imageUpload.array("files", 20),
  async (req: AuthRequest & { files?: Express.Multer.File[] }, res) => {
    if (!env.geminiApiKey) {
      return res.status(503).json({ error: "Screenshot import is not configured (missing GEMINI_API_KEY)" });
    }
    const files = req.files ?? [];
    if (files.length === 0) return res.status(400).json({ error: "At least one image file required" });

    const userId = req.userId!;
    // accountId is optional: defaults to the user's primary account (auto-created if missing)
    const rawAccountId = Number((req.body as any)?.accountId);
    const accountId = Number.isInteger(rawAccountId) && rawAccountId > 0
      ? rawAccountId
      : await ensurePrimaryAccount(userId);

    const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!account) return res.status(404).json({ error: "Account not found" });

    const userCategories = await prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, type: true },
    });

    // Process files in parallel, keeping per-file errors isolated
    const settled = await Promise.allSettled(
      files.map(async (f) => ({
        file: f.originalname,
        transactions: await extractTransactionsFromImage(f.buffer, f.mimetype),
      }))
    );

    const items: any[] = [];
    const errors: { file: string; message: string }[] = [];
    let seq = 0;

    for (const s of settled) {
      if (s.status === "rejected") {
        errors.push({ file: "unknown", message: (s.reason as Error)?.message || "Extraction failed" });
        continue;
      }
      for (const t of s.value.transactions) {
        seq += 1;
        // Categorization suggestion (type-constrained), fallback to default category
        let categoryId = suggestCategory(t.merchant, t.type, userCategories);
        let categoryName: string | null = null;
        if (categoryId) {
          categoryName = userCategories.find((c) => c.id === categoryId)?.name ?? null;
        } else {
          const def = await ensureDefaultCategory(userId, t.type);
          categoryId = def.id;
          categoryName = def.name;
        }

        // Duplicate detection: same account, date ±1 day, same amount, similar merchant in notes.
        // NOTE: `notes contains` is a LIKE '%...%' scan — fine for small batches thanks to the
        // [userId, date] index narrowing the set first. Consider pg_trgm if this becomes heavy.
        const d = dayjs(t.date, "YYYY-MM-DD", true);
        let isDuplicate = false;
        let duplicateId: number | undefined;
        if (d.isValid()) {
          const dup = await prisma.transaction.findFirst({
            where: {
              userId,
              accountId,
              amount: t.amount,
              date: { gte: d.subtract(1, "day").startOf("day").toDate(), lte: d.add(1, "day").endOf("day").toDate() },
              notes: { contains: t.merchant, mode: "insensitive" },
            },
            select: { id: true },
          });
          if (dup) {
            isDuplicate = true;
            duplicateId = dup.id;
          }
        }

        items.push({
          tempId: seq,
          sourceImage: s.value.file,
          date: t.date,
          merchant: t.merchant,
          amount: t.amount,
          type: t.type,
          categoryId,
          categoryName,
          isDuplicate,
          duplicateId,
        });
      }
    }

    res.json({ items, errors });
  }
);

// POST /api/transactions/bulk-import — atomic, validated
const bulkImportSchema = z.object({
  accountId: z.number().int().optional(),
  items: z
    .array(
      z.object({
        date: z.string(),
        merchant: z.string().min(1),
        amount: z.number().positive(),
        type: z.enum(["Income", "Expense"]),
        categoryId: z.number().int(),
      })
    )
    .min(1),
});

transactionsRouter.post("/bulk-import", requireAuth, async (req: AuthRequest, res) => {
  const parse = bulkImportSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload", details: parse.error });
  const { items } = parse.data;
  const userId = req.userId!;
  // accountId is optional: defaults to the user's primary account (auto-created if missing)
  const accountId = parse.data.accountId ?? await ensurePrimaryAccount(userId);

  // ── Pre-flight validation: validate EVERYTHING before touching the DB ──
  const issues: { index: number; field: string; message: string }[] = [];

  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) issues.push({ index: -1, field: "accountId", message: "Account not found or not authorized" });

  const categoryIds = [...new Set(items.map((i) => i.categoryId))];
  const cats = await prisma.category.findMany({ where: { id: { in: categoryIds }, userId }, select: { id: true, type: true } });
  const catMap = new Map(cats.map((c) => [c.id, c.type]));

  items.forEach((item, index) => {
    if (!catMap.has(item.categoryId)) {
      issues.push({ index, field: "categoryId", message: `Category ${item.categoryId} not found or not authorized` });
    } else if (catMap.get(item.categoryId) !== item.type) {
      issues.push({ index, field: "type", message: `Type '${item.type}' does not match the selected category's type` });
    }
    const d = dayjs(item.date, ["YYYY-MM-DD", "DD/MM/YYYY"], true);
    if (!d.isValid()) {
      issues.push({ index, field: "date", message: `Invalid date '${item.date}'` });
    }
  });

  if (issues.length > 0) {
    return res.status(400).json({ error: "Validation failed", issues });
  }

  // ── Atomic creation: all-or-nothing ──
  try {
    const created = await prisma.$transaction(
      items.map((item) =>
        prisma.transaction.create({
          data: {
            userId,
            accountId,
            categoryId: item.categoryId,
            type: item.type,
            amount: item.amount,
            date: dayjs(item.date, ["YYYY-MM-DD", "DD/MM/YYYY"], true).toDate(),
            notes: item.merchant,
          },
        })
      )
    );
    res.status(201).json({ imported: created.length, ids: created.map((c) => c.id) });
  } catch (e) {
    console.error("[bulk-import] atomic creation failed, rolled back:", e);
    res.status(500).json({ error: "Import failed and was rolled back. No transaction was created." });
  }
});

// Bulk delete transactions
const bulkDeleteSchema = z.object({
  ids: z.array(z.number().int()).min(1, "At least one ID required"),
});

transactionsRouter.post("/bulk-delete", requireAuth, async (req: AuthRequest, res) => {
  const parse = bulkDeleteSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload", details: parse.error });
  
  const { ids } = parse.data;
  const userId = req.userId!;
  
  // Delete only transactions belonging to the current user
  const result = await prisma.transaction.deleteMany({
    where: {
      id: { in: ids },
      userId: userId,
    },
  });
  
  res.json({ deleted: result.count });
});

// Bulk update category
const bulkUpdateCategorySchema = z.object({
  ids: z.array(z.number().int()).min(1, "At least one ID required"),
  categoryId: z.number().int("Category ID is required"),
});

// Bulk update tags
const bulkUpdateTagsSchema = z.object({
  ids: z.array(z.number().int()).min(1),
  tagIds: z.array(z.number().int()),
});

transactionsRouter.patch("/bulk-update-tags", requireAuth, async (req: AuthRequest, res) => {
  const parse = bulkUpdateTagsSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload", details: parse.error });

  const { ids, tagIds } = parse.data;
  const userId = req.userId!;

  // Verify tags belong to user
  if (tagIds.length > 0) {
    const tagCount = await prisma.tag.count({ where: { id: { in: tagIds }, userId } });
    if (tagCount !== tagIds.length) return res.status(400).json({ error: "Some tags not found" });
  }

  // Update each transaction's tags (additive — merges with existing)
  let updated = 0;
  for (const txnId of ids) {
    const txn = await prisma.transaction.findFirst({ where: { id: txnId, userId } });
    if (!txn) continue;
    await prisma.transaction.update({
      where: { id: txnId },
      data: { tags: { connect: tagIds.map(id => ({ id })) } },
    });
    updated++;
  }

  res.json({ updated });
});

transactionsRouter.patch("/bulk-update-category", requireAuth, async (req: AuthRequest, res) => {
  const parse = bulkUpdateCategorySchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload", details: parse.error });
  
  const { ids, categoryId } = parse.data;
  const userId = req.userId!;
  
  // Verify category exists and belongs to user
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId: userId,
    },
  });
  
  if (!category) {
    return res.status(404).json({ error: "Category not found or not authorized" });
  }
  
  // Update type based on new category
  const type = category.type || "Expense";
  
  // Update only transactions belonging to the current user
  const result = await prisma.transaction.updateMany({
    where: {
      id: { in: ids },
      userId: userId,
    },
    data: {
      categoryId: categoryId,
      type: type,
    },
  });
  
  res.json({ updated: result.count });
});

// Delete transaction by notes, category and date
const deleteByDetailsSchema = z.object({
  notes: z.string().optional(),
  categoryName: z.string().optional(),
  categoryId: z.number().int().optional(),
  date: z.string(), // Required - format: YYYY-MM-DD or DD/MM/YYYY
}).refine(
  (data) => data.categoryName || data.categoryId,
  { message: "Either categoryName or categoryId must be provided" }
);

transactionsRouter.post("/delete-by-details", requireAuth, async (req: AuthRequest, res) => {
  const parse = deleteByDetailsSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid payload", details: parse.error });
  }
  
  const data = parse.data;
  const userId = req.userId!;
  
  console.log("Delete by details request:", data);
  
  // Parse the date to get start and end of day
  const parsedDate = dayjs(data.date, ["YYYY-MM-DD", "DD/MM/YYYY"], true);
  if (!parsedDate.isValid()) {
    return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD or DD/MM/YYYY" });
  }
  
  const startOfDay = parsedDate.startOf('day').toDate();
  const endOfDay = parsedDate.endOf('day').toDate();
  
  // Build where clause
  const where: any = {
    userId: userId,
    date: {
      gte: startOfDay,
      lte: endOfDay,
    },
  };
  
  // Add notes filter if provided
  if (data.notes !== undefined && data.notes !== null) {
    where.notes = data.notes;
  }
  
  // Find category ID
  let categoryId: number | undefined;
  if (data.categoryId) {
    // Verify category belongs to user
    const category = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        userId: userId,
      },
    });
    
    if (!category) {
      return res.status(404).json({ error: "Category not found or not authorized" });
    }
    
    categoryId = category.id;
  } else if (data.categoryName) {
    // Find category by name
    const category = await prisma.category.findFirst({
      where: {
        userId: userId,
        name: { equals: data.categoryName, mode: "insensitive" },
      },
    });
    
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    categoryId = category.id;
  }
  
  if (categoryId) {
    where.categoryId = categoryId;
  }
  
  console.log("Delete where clause:", JSON.stringify(where, null, 2));
  
  // Find matching transactions first
  const matchingTransactions = await prisma.transaction.findMany({
    where,
    select: {
      id: true,
      date: true,
      amount: true,
      notes: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  });
  
  console.log("Found matching transactions:", matchingTransactions.length);
  
  if (matchingTransactions.length === 0) {
    return res.status(404).json({ error: "No matching transaction found" });
  }
  
  // Delete the transactions
  const result = await prisma.transaction.deleteMany({
    where,
  });
  
  console.log("Deleted transactions:", result.count);
  
  res.json({ 
    deleted: result.count,
    transactions: matchingTransactions,
  });
});




