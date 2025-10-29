import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { parsePagination } from "../utils/pagination.js";
import { z } from "zod";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import multer from "multer";

export const transactionsRouter = Router();

// Enable strict format-based parsing like DD/MM/YYYY
dayjs.extend(customParseFormat);

const createSchema = z.object({
  accountId: z.number().int(),
  categoryId: z.number().int(),
  date: z.string(),
  amount: z.number(),
  notes: z.string().optional(),
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
  
  const where: any = { userId: req.userId! };
  if (filterByCategory) where.categoryId = filterByCategory;
  
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
      include: { 
        category: {
          select: {
            id: true,
            name: true,
            type: true
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
  const type = category?.type === "Income" ? "Income" : "Expense";
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
    },
  });
  res.status(201).json(item);
});

// 1. Definisci il nuovo schema di validazione (più semplice)
const shortcutExpenseSchema = z.object({
  amount: z.number().positive("Amount must be a positive number"),
  userId: z.number().int("accountId must be an integer"), // O z.string() se usi CUID/UUID
  notes: z.string().optional(),
  type: z.enum(["Expense", "Income"]).default("Expense"),
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
          type: data.type, // <-- Tipo fisso, come da nome endpoint
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
  const type = category?.type === "Income" ? "Income" : "Expense";
  const updated = await prisma.transaction.updateMany({
    where: { id, userId: req.userId! },
    data: {
      accountId: data.accountId,
      categoryId: data.categoryId,
      date: dayjs(data.date, ["YYYY-MM-DD", "DD/MM/YYYY", "YYYY-MM-DDTHH:mm:ss.SSSZ" as any], true).isValid()
        ? dayjs(data.date, ["YYYY-MM-DD", "DD/MM/YYYY", "YYYY-MM-DDTHH:mm:ss.SSSZ" as any], true).toDate()
        : new Date(data.date),
      amount: data.amount,
      type,
      notes: data.notes,
    },
  });
  if (updated.count === 0) return res.status(404).json({ error: "Not found" });
  const item = await prisma.transaction.findUnique({ where: { id } });
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
  async function ensurePrimaryAccount(userId: number): Promise<number> {
    const acc = await prisma.account.findFirst({ where: { userId }, orderBy: { id: "asc" } });
    if (acc) return acc.id;
    const created = await prisma.account.create({ data: { userId, name: "Primary", type: "Checking", initialBalance: 0 } });
    return created.id;
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
      const inferredType = cat?.type === "Income" ? "Income" : "Expense";
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


