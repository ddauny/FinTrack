import { Router } from "express";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { parsePagination } from "../utils/pagination.js";
import { z } from "zod";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { generatePrismaFilter } from "../services/ai.js";
import { parseScreenshot } from "../services/ocr.js";

export const transactionsRouter = Router();

// ... existing code ...

transactionsRouter.post("/ai-query", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { prompt } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.email !== "dani24iania@gmail.com") {
      return res.status(403).json({ error: "AI features are restricted to authorized administrators." });
    }

    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: "Prompt is required and must be a string" });
    if (prompt.length > 500) return res.status(400).json({ error: "Prompt is too long (max 500 characters)" });

    // Fetch context to help AI map names and types
    const categories = await prisma.category.findMany({ where: { userId }, select: { name: true, type: true } });
    const accounts = await prisma.account.findMany({ where: { userId }, select: { name: true } });
    const tags = await prisma.tag.findMany({ where: { userId }, select: { name: true } });

    const filter = await generatePrismaFilter(prompt, {
      categories: categories.map(c => `${c.name} (${c.type})`),
      accounts: accounts.map(a => a.name),
      tags: tags.map(t => t.name)
    });

    // console.log("[AI Query] Generated Filter:", JSON.stringify(filter));

    // Security: Merge with userId to ensure no data leakage
    const secureFilter = { ...filter, userId };

    const items = await prisma.transaction.findMany({
      where: secureFilter,
      include: { category: true, account: true },
      orderBy: { date: "desc" },
      take: 100 // Limit for safety
    });

    res.json({ items, filterApplied: filter });
  } catch (error) {
    console.error("AI Query Error:", error);
    res.status(500).json({ error: "AI failed to process your request." });
  }
});

transactionsRouter.get("/export-json", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const items = await prisma.transaction.findMany({
      where: { userId },
      include: { category: true, account: true },
      orderBy: { date: "desc" }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Export failed" });
  }
});

// Enable strict format-based parsing like DD/MM/YYYY
dayjs.extend(customParseFormat);

// Configure Multer for secure file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/receipts/';
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Secure filename: timestamp-random-originalName (sanitized)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedOriginalName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  }
});

const createSchema = z.object({
  accountId: z.number().int(),
  categoryId: z.number().int().optional(),
  date: z.string(),
  amount: z.number(),
  notes: z.string().optional(),
  recurringTransactionId: z.number().int().optional(),
  assetItemId: z.number().int().optional().nullable(),
  tags: z.array(z.string()).optional(),
  splits: z.array(z.object({
    categoryId: z.number().int(),
    amount: z.number(),
    notes: z.string().optional(),
  })).optional()
});

/*
// ============================================================================
// SECURITY: IP RESTRICTION MIDDLEWARE
// ============================================================================
// Permette solo richieste da localhost (IPv4/IPv6) e reti private (10.x, 192.168.x, 172.16.x)
const requireLocalNetwork = (req: any, res: any, next: any) => {
  let ip = req.ip || req.connection.remoteAddress || "";
  
  // Gestione header proxy (se sei dietro Nginx/Cloudflare/Docker)
  // Assicurati che il tuo server sia configurato per trustare il proxy se usi questo header
  if (req.headers['x-forwarded-for']) {
    const forwarded = req.headers['x-forwarded-for'];
    ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
  }

  // Normalizza IPv6 mappato a IPv4 (es. ::ffff:192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  const isLocal = 
    ip === '127.0.0.1' || 
    ip === '::1' || 
    ip.startsWith('10.') || 
    ip.startsWith('192.168.') || 
    (ip.startsWith('172.') && parseInt(ip.split('.')[1], 10) >= 16 && parseInt(ip.split('.')[1], 10) <= 31);

  // console.log(`[Security] IP Check: ${ip} -> ${isLocal ? 'ALLOWED' : 'BLOCKED'}`);

  if (!isLocal) {
    return res.status(403).json({ error: "Access denied: Restricted to local network." });
  }
  
  next();
};

// ============================================================================
// SCHEMA VALIDAZIONE PER JSON REMOTO
// ============================================================================
const remoteJsonSchema = z.object({
  transactions: z.array(z.object({
    Date: z.string(), // Es: "10.12.2025"
    AmountIn: z.number(),
    AmountOut: z.number(),
    Note: z.string().optional(),
  }))
});

// ============================================================================
// ENDPOINT: RECEIVE TRANSACTIONS JSON
// ============================================================================
transactionsRouter.post(
  "/receiveTransactionsJson",
  requireAuth,         // 1. Verifica il Token Bearer (identifica l'utente)
  requireLocalNetwork, // 2. Verifica che l'IP sia sicuro/locale
  async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      
      // 1. Validazione Payload
      const parse = remoteJsonSchema.safeParse(req.body);
      if (!parse.success) {
        console.error("Validation failed:", parse.error);
        return res.status(400).json({ error: "Invalid JSON structure", details: env.isProduction ? undefined : parse.error });
      }
      
      const incomingTxns = parse.data.transactions;
      // console.log(`[Import JSON] Received ${incomingTxns.length} transactions for user ${userId}`);

      // 2. Setup Account e Categoria Default
      // Trova o crea account principale
      let defaultAccount = await prisma.account.findFirst({ where: { userId }, orderBy: { id: "asc" } });
      if (!defaultAccount) {
        defaultAccount = await prisma.account.create({ 
          data: { userId, name: "Primary Bank", type: "Checking", initialBalance: 0 } 
        });
      }

      // Trova o crea categoria "Imported" (o Bank Import)
      const importCategoryName = "Bank Import";
      let defaultCategory = await prisma.category.findFirst({
        where: { userId, name: importCategoryName }
      });

      // Se non esiste, la creiamo (Default Expense, ma useremo il tipo corretto per ogni txn)
      if (!defaultCategory) {
        defaultCategory = await prisma.category.create({
          data: { userId, name: importCategoryName, type: "Expense" }
        });
      }

      // 3. Elaborazione e Inserimento
      let addedCount = 0;
      let skippedCount = 0;

      for (const t of incomingTxns) {
        // A. Parsing Data (DD.MM.YYYY)
        // Nota: dayjs richiede il formato esatto. Le date nel JSON sono separate da punti.
        const parsedDate = dayjs(t.Date, "DD.MM.YYYY", true);
        
        if (!parsedDate.isValid()) {
          // console.warn(`Skipping invalid date: ${t.Date}`);
          continue;
        }
        
        const dateObj = parsedDate.toDate();

        // B. Determina Tipo e Importo
        let type: "Expense" | "Income" = "Expense";
        let finalAmount = 0;

        // Logica: Se AmountIn > 0 è Income, altrimenti se AmountOut > 0 è Expense
        if (t.AmountIn > 0) {
          type = "Income";
          finalAmount = t.AmountIn;
        } else if (t.AmountOut > 0) {
          type = "Expense";
          finalAmount = t.AmountOut;
        } else {
          // Se entrambi sono 0, saltiamo
          skippedCount++;
          continue;
        }

        const notes = t.Note ? t.Note.trim() : "";

        // C. Controllo Duplicati (Anti-Deduplication)
        // Cerchiamo una transazione esistente dello stesso utente, stessa data, importo e note (approx)
        // Usiamo un range di data (inizio e fine giorno) per sicurezza
        const startOfDay = dayjs(dateObj).startOf('day').toDate();
        const endOfDay = dayjs(dateObj).endOf('day').toDate();

        const duplicate = await prisma.transaction.findFirst({
          where: {
            userId: userId,
            date: { gte: startOfDay, lte: endOfDay },
            amount: finalAmount,
            type: type,
            notes: notes // Match esatto sulle note
          }
        });

        if (duplicate) {
          skippedCount++;
          continue; // Salta inserimento
        }

        // D. Inserimento
        await prisma.transaction.create({
          data: {
            userId: userId,
            accountId: defaultAccount.id,
            categoryId: defaultCategory.id,
            date: dateObj,
            amount: finalAmount,
            type: type,
            notes: notes
          }
        });
        addedCount++;
      }

      // console.log(`[Import JSON] Complete. Added: ${addedCount}, Skipped: ${skippedCount}`);
      
      return res.json({ 
        success: true, 
        rows_processed: incomingTxns.length, 
        added: addedCount, 
        skipped: skippedCount 
      });

    } catch (error) {
      console.error("[Import JSON] Error:", error);
      return res.status(500).json({ error: "Internal server error processing import" });
    }
  }
);
*/
transactionsRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  const { page, limit, skip } = parsePagination(req.query as any);
  let sortBy = String((req.query as any).sortBy ?? "date");
  const allowedSortFields = ["date", "amount", "notes", "accountId", "categoryId", "id", "type"];
  if (!allowedSortFields.includes(sortBy)) {
    sortBy = "date";
  }
  const order = String((req.query as any).order ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const filterByCategoryRaw = (req.query as any).filterByCategory;
  const filterByCategory = filterByCategoryRaw && !Number.isNaN(Number(filterByCategoryRaw)) ? Number(filterByCategoryRaw) : undefined;
  const categoryName = (req.query as any).category;
  const startDate = (req.query as any).startDate;
  const endDate = (req.query as any).endDate;
  const searchQuery = (req.query as any).search;
  const txnType = (req.query as any).type;
  const minAmountRaw = (req.query as any).minAmount;
  const maxAmountRaw = (req.query as any).maxAmount;
  
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

  // Handle transaction type filtering (Expense/Income/Transfer)
  if (txnType && (txnType === 'Expense' || txnType === 'Income' || txnType === 'Transfer')) {
    where.type = txnType;
    console.log('Filtering by type:', txnType);
  }

  // Handle amount range filtering
  const minAmount = minAmountRaw !== undefined && minAmountRaw !== '' ? Number(minAmountRaw) : undefined;
  const maxAmount = maxAmountRaw !== undefined && maxAmountRaw !== '' ? Number(maxAmountRaw) : undefined;
  if (Number.isFinite(minAmount) || Number.isFinite(maxAmount)) {
    where.amount = {
      ...(Number.isFinite(minAmount) ? { gte: minAmount } : {}),
      ...(Number.isFinite(maxAmount) ? { lte: maxAmount } : {})
    };
    console.log('Filtering by amount range:', { minAmount, maxAmount });
  }

  // Handle search query - supports structured tokens with AND/OR and parentheses
  if (searchQuery && searchQuery.trim()) {
    const fullSearch = searchQuery.trim();
    console.log('Searching for:', fullSearch);

    type Token = { type: 'term' | 'and' | 'or' | 'lparen' | 'rparen'; value?: string };
    type Node = { type: 'term'; value: string } | { type: 'and' | 'or'; children: Node[] };

    const tokenize = (input: string): Token[] => {
      const tokens: Token[] = [];
      let i = 0;
      while (i < input.length) {
        const ch = input[i];
        if (/\s/.test(ch)) { i += 1; continue; }
        if (ch === '(') { tokens.push({ type: 'lparen' }); i += 1; continue; }
        if (ch === ')') { tokens.push({ type: 'rparen' }); i += 1; continue; }
        if (input.slice(i, i + 2) === '&&') { tokens.push({ type: 'and' }); i += 2; continue; }
        if (input.slice(i, i + 2) === '||') { tokens.push({ type: 'or' }); i += 2; continue; }

        // Term token (supports key:"multi word")
        let buf = '';
        while (i < input.length) {
          if (input.slice(i, i + 2) === '&&' || input.slice(i, i + 2) === '||') break;
          const c = input[i];
          if (c === '(' || c === ')') break;
          if (/\s/.test(c)) break;
          buf += c;
          i += 1;
          if (buf.endsWith(':') && input[i] === '"') {
            i += 1;
            let quoted = '';
            while (i < input.length && input[i] !== '"') {
              quoted += input[i];
              i += 1;
            }
            if (input[i] === '"') i += 1;
            buf += `"${quoted}"`;
          }
        }
        if (buf) {
          tokens.push({ type: 'term', value: buf });
        } else {
          i += 1;
        }
      }
      return tokens;
    };

    const tokens = tokenize(fullSearch);
    let pos = 0;
    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];

    const parsePrimary = (): Node | null => {
      const tok = peek();
      if (!tok) return null;
      if (tok.type === 'lparen') {
        consume();
        const expr = parseOr();
        if (peek()?.type === 'rparen') consume();
        return expr;
      }
      if (tok.type === 'term') {
        consume();
        return { type: 'term', value: tok.value || '' };
      }
      return null;
    };

    const parseAnd = (): Node | null => {
      let left = parsePrimary();
      if (!left) return null;
      const children: Node[] = [left];
      while (true) {
        const tok = peek();
        if (tok?.type === 'and') {
          consume();
          const right = parsePrimary();
          if (right) children.push(right);
          continue;
        }
        // Implicit AND between consecutive primaries
        if (tok?.type === 'term' || tok?.type === 'lparen') {
          const right = parsePrimary();
          if (right) children.push(right);
          continue;
        }
        break;
      }
      return children.length === 1 ? children[0] : { type: 'and', children };
    };

    const parseOr = (): Node | null => {
      let left = parseAnd();
      if (!left) return null;
      const children: Node[] = [left];
      while (peek()?.type === 'or') {
        consume();
        const right = parseAnd();
        if (right) children.push(right);
      }
      return children.length === 1 ? children[0] : { type: 'or', children };
    };

    const ast = parseOr();

    const buildTermCondition = (raw: string) => {
      let term = raw.trim();
      if (!term) return null;
      if (term.startsWith('"') && term.endsWith('"')) {
        term = term.slice(1, -1).trim();
      }
      if (!term) return null;

      if (term.startsWith('#')) {
        const tagName = term.slice(1);
        if (!tagName) return null;
        return {
          tags: {
            some: {
              name: {
                equals: tagName,
                mode: 'insensitive'
              }
            }
          }
        };
      }

      const colonIdx = term.indexOf(':');
      if (colonIdx > 0) {
        const key = term.slice(0, colonIdx).toLowerCase();
        let value = term.slice(colonIdx + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).trim();
        }
        if (!value) return null;

        if (key === 'category' || key === 'cat') {
          return {
            category: {
              name: {
                contains: value,
                mode: 'insensitive'
              }
            }
          };
        }
        if (key === 'notes' || key === 'note') {
          return {
            notes: {
              contains: value,
              mode: 'insensitive'
            }
          };
        }
        if (key === 'amount' || key === 'amt') {
          const parsed = parseFloat(value);
          if (!Number.isNaN(parsed)) return { amount: { equals: parsed } };
          return null;
        }
        if (key === 'tag' || key === 'tags') {
          return {
            tags: {
              some: {
                name: {
                  equals: value.startsWith('#') ? value.slice(1) : value,
                  mode: 'insensitive'
                }
              }
            }
          };
        }
      }

      return {
        OR: [
          {
            notes: {
              contains: term,
              mode: 'insensitive'
            }
          },
          {
            category: {
              name: {
                contains: term,
                mode: 'insensitive'
              }
            }
          },
          {
            tags: {
              some: {
                name: {
                  contains: term,
                  mode: 'insensitive'
                }
              }
            }
          }
        ]
      };
    };

    const buildCondition = (node: Node | null): any => {
      if (!node) return null;
      if (node.type === 'term') return buildTermCondition(node.value);
      const childConds = node.children.map(buildCondition).filter(Boolean) as any[];
      if (childConds.length === 0) return null;
      if (childConds.length === 1) return childConds[0];
      return node.type === 'and' ? { AND: childConds } : { OR: childConds };
    };

    const searchCondition = buildCondition(ast);
    if (searchCondition) {
      if (where.AND) {
        where.AND.push(searchCondition);
      } else {
        where.AND = [searchCondition];
      }
    }
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

  // console.log('Final where clause:', JSON.stringify(where, null, 2));
  // console.log('Search query:', searchQuery);

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
        attachmentPath: true,
        splitGroupId: true,
        tags: true,
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            color: true
          }
        }
      },
      skip, 
      take: limit 
    }),
    prisma.transaction.count({ where }),
  ]);

  // Compute monthly net from the full filtered set (not paginated)
  // so month separators in UI stay consistent with dashboard-style totals.
  const monthlyNetSource = await prisma.transaction.findMany({
    where,
    select: {
      date: true,
      amount: true,
      type: true,
      category: {
        select: {
          type: true,
        }
      }
    }
  });

  const monthlyNetByMonth: Record<string, number> = {};
  for (const txn of monthlyNetSource) {
    const d = dayjs(txn.date);
    const monthKey = d.format('YYYY-MM');
    const resolvedType = txn.category?.type || txn.type;
    const amt = Number(txn.amount) || 0;

    if (!(monthKey in monthlyNetByMonth)) monthlyNetByMonth[monthKey] = 0;
    if (resolvedType === 'Expense') monthlyNetByMonth[monthKey] -= amt;
    if (resolvedType === 'Income') monthlyNetByMonth[monthKey] += amt;
  }

  res.json({ page, limit, total, items, monthlyNetByMonth });
});

// Get existing notes for autocomplete - MUST be before /:id route
transactionsRouter.get("/notes", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const query = String(req.query.q || '').toLowerCase();
  
  const notesWithCategory = await prisma.transaction.findMany({
    where: { 
      userId,
      notes: { 
        not: null,
        contains: query,
        mode: 'insensitive'
      }
    },
    select: { 
      notes: true,
      category: {
        select: {
          id: true,
          name: true,
          type: true,
          color: true
        }
      }
    },
    orderBy: { date: 'desc' },
    take: 50 // Get recent 50 matching transactions
  });
  
  // Deduplicate notes, keeping the most recent one (first in array due to desc sort)
  const seenNotes = new Set<string>();
  const suggestions: any[] = [];

  for (const t of notesWithCategory) {
    if (t.notes && !seenNotes.has(t.notes)) {
      seenNotes.add(t.notes);
      suggestions.push({
        note: t.notes,
        category: t.category
      });
      if (suggestions.length >= 8) break;
    }
  }
  
  res.json(suggestions);
});

// Get existing tags for autocomplete
transactionsRouter.get("/tags", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const query = String(req.query.q || '').toLowerCase();
  
  const tags = await prisma.tag.findMany({
    where: {
      userId,
      name: {
        contains: query,
        mode: 'insensitive'
      }
    },
    select: { name: true },
    take: 10
  });
  
  const suggestions = tags.map(t => t.name);
  res.json(suggestions);
});

transactionsRouter.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const item = await prisma.transaction.findFirst({ where: { id, userId: req.userId! } });
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

transactionsRouter.get("/:id/attachment", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const item = await prisma.transaction.findFirst({ where: { id, userId: req.userId! } });
  
  if (!item || !item.attachmentPath) {
    return res.status(404).json({ error: "Attachment not found" });
  }
  
  const filePath = path.resolve(item.attachmentPath);
  // Security check
  if (!filePath.startsWith(path.resolve('uploads'))) {
     return res.status(403).json({ error: "Access denied" });
  }
  
  if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on server" });
  }

  res.sendFile(filePath);
});

transactionsRouter.post("/", requireAuth, upload.single('receipt'), async (req: AuthRequest, res) => {
  // Convert numeric fields from string if coming from multipart form
  const rawBody = { ...req.body };
  // If file is present, fields might be strings
  if (req.file || req.headers['content-type']?.includes('multipart/form-data')) {
    if (rawBody.accountId) rawBody.accountId = Number(rawBody.accountId);
    if (rawBody.categoryId) rawBody.categoryId = Number(rawBody.categoryId);
    if (rawBody.amount) rawBody.amount = Number(rawBody.amount);
    if (rawBody.recurringTransactionId) rawBody.recurringTransactionId = Number(rawBody.recurringTransactionId);
    if (rawBody.assetItemId) rawBody.assetItemId = Number(rawBody.assetItemId);
    if (rawBody.tags && typeof rawBody.tags === 'string') {
        try {
            rawBody.tags = JSON.parse(rawBody.tags);
        } catch (e) {
            rawBody.tags = [rawBody.tags];
        }
    }
    if (rawBody.splits && typeof rawBody.splits === 'string') {
        try { rawBody.splits = JSON.parse(rawBody.splits); } catch (e) {}
    }
  }

  const parse = createSchema.safeParse(rawBody);
  if (!parse.success) {
    if (req.file) fs.unlinkSync(req.file.path); // Cleanup
    console.error(parse.error); return res.status(400).json({ error: "Invalid payload", details: env.isProduction ? undefined : parse.error });
  }
  const data = parse.data;

  // Security Check: Verify account ownership
  const account = await prisma.account.findFirst({
    where: { id: data.accountId, userId: req.userId! }
  });
  if (!account) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: "Access denied to account" });
  }

  // Security Check: Verify asset item ownership
  if (data.assetItemId) {
    const assetItem = await prisma.assetItem.findFirst({
      where: { id: data.assetItemId, group: { userId: req.userId! } }
    });
    if (!assetItem) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: "Access denied to asset item" });
    }
  }

  const baseDate = dayjs(data.date, ["YYYY-MM-DD", "DD/MM/YYYY", "YYYY-MM-DDTHH:mm:ss.SSSZ" as any], true).isValid()
    ? dayjs(data.date, ["YYYY-MM-DD", "DD/MM/YYYY", "YYYY-MM-DDTHH:mm:ss.SSSZ" as any], true).toDate()
    : new Date(data.date);

  if (data.splits && data.splits.length > 0) {
    // Security Check: Verify splits category ownership
    for (const split of data.splits) {
      const splitCat = await prisma.category.findFirst({
        where: { id: split.categoryId, userId: req.userId! }
      });
      if (!splitCat) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: "Access denied to split category" });
      }
    }

    const splitGroupId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdItems: any[] = [];
    for (const split of data.splits) {
      const splitCat = await prisma.category.findFirst({ where: { id: split.categoryId, userId: req.userId! } });
      const splitType = splitCat?.type || "Expense";
      const item = await prisma.transaction.create({
        data: {
          userId: req.userId!,
          accountId: data.accountId,
          categoryId: split.categoryId,
          date: baseDate,
          amount: split.amount,
          type: splitType,
          notes: split.notes || '',
          splitGroupId: splitGroupId,
          assetItemId: data.assetItemId,
          attachmentPath: req.file ? req.file.path : undefined,
          tags: data.tags ? {
            connectOrCreate: data.tags.map((tag: string) => ({
                where: { userId_name: { userId: req.userId!, name: tag } },
                create: { userId: req.userId!, name: tag }
            }))
          } : undefined
        },
        include: { tags: true }
      });
      createdItems.push(item);
    }
    return res.status(201).json({ id: createdItems[0].id, splits: createdItems, splitGroupId });
  } else {
    if (!data.categoryId) {
        return res.status(400).json({ error: "Category is required if no splits are provided" });
    }
    // Security Check: Verify category ownership
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, userId: req.userId! }
    });
    if (!category) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: "Access denied to category" });
    }

    const type = category.type || "Expense";
    const item = await prisma.transaction.create({
      data: {
        userId: req.userId!,
        accountId: data.accountId,
        categoryId: data.categoryId,
        date: baseDate,
        amount: data.amount,
        type,
        notes: data.notes,
        recurringTransactionId: data.recurringTransactionId,
        assetItemId: data.assetItemId,
        attachmentPath: req.file ? req.file.path : undefined,
        tags: data.tags ? {
          connectOrCreate: data.tags.map((tag: string) => ({
              where: { userId_name: { userId: req.userId!, name: tag } },
              create: { userId: req.userId!, name: tag }
          }))
        } : undefined
      },
      include: { tags: true }
    });
    return res.status(201).json(item);
  }
});

// Shortcut expense schema — accountId is the account to charge
const shortcutExpenseSchema = z.object({
  amount: z.number().positive("Amount must be a positive number"),
  accountId: z.number().int("accountId must be an integer"),
  notes: z.string().optional(),
  type: z.enum(["Expense", "Income"]).default("Expense"),
  categoryId: z.number().int("categoryId must be an integer").optional(),
  categoryName: z.string().optional(),
});

// Shortcut endpoint: create an expense/income quickly
transactionsRouter.post(
  "/addExpenseFromShortcut",
  requireAuth,
  async (req: AuthRequest, res) => {
    const parse = shortcutExpenseSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }
    const data = parse.data;

    // 4. LOGICA DI BUSINESS (Categoria di default)
    // Dobbiamo trovare una categoria "di servizio" (es. "Da categorizzare")
    // che sia di tipo "Expense" e appartenga a questo utente.
    
    const userId = req.userId!;

    // Verify the account belongs to the authenticated user
    const account = await prisma.account.findFirst({ where: { id: data.accountId, userId } });
    if (!account) return res.status(403).json({ error: "Account not found or access denied" });


    const defaultCategoryName = "Uncategorized";

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

    // 5. Create the transaction
    try {
      const item = await prisma.transaction.create({
        data: {
          userId: userId,
          accountId: data.accountId,
          categoryId: defaultCategory.id,
          date: new Date(),
          amount: data.amount,
          type: "Expense",
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

// Shortcut endpoint: create any type of transaction quickly
transactionsRouter.post(
  "/addTransactionFromShortcut",
  requireAuth,
  async (req: AuthRequest, res) => {
    const parse = shortcutExpenseSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }
    const data = parse.data;

    const userId = req.userId!;

    // Verify the account belongs to the authenticated user
    const account = await prisma.account.findFirst({ where: { id: data.accountId, userId } });
    if (!account) return res.status(403).json({ error: "Account not found or access denied" });

    let categoryId: number;
    
    // If categoryId is provided, use it directly
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
      let category = await prisma.category.findFirst({
        where: {
          userId: userId,
          name: { equals: data.categoryName, mode: "insensitive" },
        },
      });
      
      if (!category) {
        // Format to TitleCase
        const formattedName = data.categoryName
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        category = await prisma.category.create({
          data: {
            userId: userId,
            name: formattedName,
            type: data.type,
          },
        });
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

    // 5. Create the transaction
    try {
      const item = await prisma.transaction.create({
        data: {
          userId: userId,
          accountId: data.accountId,
          categoryId: categoryId,
          date: new Date(),
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

transactionsRouter.put("/:id", requireAuth, upload.single('receipt'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  
  // Convert numeric fields from string if coming from multipart form
  const rawBody = { ...req.body };
  if (req.file || req.headers['content-type']?.includes('multipart/form-data')) {
    if (rawBody.accountId) rawBody.accountId = Number(rawBody.accountId);
    if (rawBody.categoryId) rawBody.categoryId = Number(rawBody.categoryId);
    if (rawBody.amount) rawBody.amount = Number(rawBody.amount);
    if (rawBody.recurringTransactionId) rawBody.recurringTransactionId = Number(rawBody.recurringTransactionId);
    if (rawBody.assetItemId) rawBody.assetItemId = Number(rawBody.assetItemId);
    if (rawBody.tags && typeof rawBody.tags === 'string') {
        try {
            rawBody.tags = JSON.parse(rawBody.tags);
        } catch (e) {
            rawBody.tags = [rawBody.tags];
        }
    }
    if (rawBody.splits && typeof rawBody.splits === 'string') {
        try { rawBody.splits = JSON.parse(rawBody.splits); } catch (e) {}
    }
  }

  const parse = createSchema.safeParse(rawBody);
  if (!parse.success) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error(parse.error); return res.status(400).json({ error: "Invalid payload", details: env.isProduction ? undefined : parse.error });
  }
  const data = parse.data;

  // Security Check: Verify account ownership
  const account = await prisma.account.findFirst({
    where: { id: data.accountId, userId: req.userId! }
  });
  if (!account) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: "Access denied to account" });
  }

  // Security Check: Verify category ownership
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId: req.userId! }
  });
  if (!category) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: "Access denied to category" });
  }

  // Security Check: Verify asset item ownership
  if (data.assetItemId) {
    const assetItem = await prisma.assetItem.findFirst({
      where: { id: data.assetItemId, group: { userId: req.userId! } }
    });
    if (!assetItem) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: "Access denied to asset item" });
    }
  }

  const type = category.type || "Expense";
  
  // Handle file replacement or deletion
  let attachmentPath: string | undefined = undefined;
  const shouldDeleteAttachment = req.body.deleteAttachment === 'true' || req.body.deleteAttachment === true;

  if (req.file || shouldDeleteAttachment) {
    if (req.file) {
        attachmentPath = req.file.path;
    }
    
    // Try to delete old file if we are replacing it OR explicitly deleting it
    const oldItem = await prisma.transaction.findFirst({ where: { id, userId: req.userId! } });
    if (oldItem?.attachmentPath && fs.existsSync(oldItem.attachmentPath)) {
      try { fs.unlinkSync(oldItem.attachmentPath); } catch(e) { console.error(e); }
    }
  }

  const updateData: any = {
    accountId: data.accountId,
    categoryId: data.categoryId,
    date: dayjs(data.date, ["YYYY-MM-DD", "DD/MM/YYYY", "YYYY-MM-DDTHH:mm:ss.SSSZ" as any], true).isValid()
      ? dayjs(data.date, ["YYYY-MM-DD", "DD/MM/YYYY", "YYYY-MM-DDTHH:mm:ss.SSSZ" as any], true).toDate()
      : new Date(data.date),
    amount: data.amount,
    type,
    notes: data.notes,
    assetItemId: data.assetItemId,
  };
  
  if (attachmentPath) {
      updateData.attachmentPath = attachmentPath;
  } else if (shouldDeleteAttachment) {
      updateData.attachmentPath = null;
  }

  if (data.tags) {
      updateData.tags = {
        set: [],
        connectOrCreate: data.tags.map(tag => ({
            where: { userId_name: { userId: req.userId!, name: tag } },
            create: { userId: req.userId!, name: tag }
        }))
      };
  }

  const existing = await prisma.transaction.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  const item = await prisma.transaction.update({
    where: { id },
    data: updateData,
    include: { tags: true, category: true }
  });
  res.json(item);
});

transactionsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const del = await prisma.transaction.deleteMany({ where: { id, userId: req.userId! } });
  if (del.count === 0) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

// Delete ALL transactions for current user — requires explicit confirmation body
transactionsRouter.delete("/", requireAuth, async (req: AuthRequest, res) => {
  if (req.body?.confirm !== "DELETE_ALL") {
    return res.status(400).json({ error: 'Must send { "confirm": "DELETE_ALL" } to confirm bulk deletion' });
  }
  const del = await prisma.transaction.deleteMany({ where: { userId: req.userId! } });
  res.json({ deleted: del.count });
});

// CSV import (multipart/form-data)
const uploadCsv = multer({ storage: multer.memoryStorage() });

transactionsRouter.post("/import", requireAuth, uploadCsv.single("file"), async (req: AuthRequest & { file?: Express.Multer.File }, res) => {
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

  // Helper for date parsing to ensure consistency
  function parseDate(raw: string): Date {
    raw = String(raw || "").trim();
    if (dayjs(raw, "DD/MM/YYYY", true).isValid()) return dayjs(raw, "DD/MM/YYYY", true).toDate();
    if (dayjs(raw, "YYYY-MM-DDTHH:mm:ss.SSSZ" as any, true).isValid()) return dayjs(raw).toDate();
    if (dayjs(raw, "YYYY-MM-DD", true).isValid()) return dayjs(raw, "YYYY-MM-DD", true).toDate();
    return new Date(raw);
  }

  // Fetch existing transactions to prevent duplicates
  // We build a frequency map of existing transactions (Date + Amount + Notes)
  const existingTxns = await prisma.transaction.findMany({
    where: { userId: req.userId! },
    select: { date: true, amount: true, notes: true }
  });
  
  const existingMap = new Map<string, number>();
  for (const t of existingTxns) {
    // Signature: YYYY-MM-DD_Amount_Notes
    const sig = `${dayjs(t.date).format('YYYY-MM-DD')}_${Number(t.amount).toFixed(2)}_${(t.notes || '').trim()}`;
    existingMap.set(sig, (existingMap.get(sig) || 0) + 1);
  }

  for (const row of rows) {
    rowNum += 1;
    const rowDelim = detectDelimiter(row);
    const cells = splitLine(row, rowDelim).map((c) => c.trim());
    if (!cells.length) continue;
    try {
      // Check for duplicates
      const rawDate = String(cells[idx["date"]] || "").trim();
      const dateObj = parseDate(rawDate);
      const amountVal = parseAmountLocale(String(cells[idx["amount"]] ?? "0"));
      const notesVal = idx["notes"] !== undefined ? (cells[idx["notes"]] || "").trim() : "";
      
      const sig = `${dayjs(dateObj).format('YYYY-MM-DD')}_${amountVal.toFixed(2)}_${notesVal}`;
      
      if ((existingMap.get(sig) || 0) > 0) {
        existingMap.set(sig, existingMap.get(sig)! - 1);
        // Skip duplicate
        continue;
      }

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
            cat = await prisma.category.findFirst({ where: { id: catId, userId: req.userId! } });
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
              // If category name is "Income" (case-insensitive), force type to "Income"
              const isIncome = name.toLowerCase() === 'income';
              cat = await prisma.category.create({ 
                data: { 
                  userId: req.userId!, 
                  name, 
                  type: isIncome ? "Income" : "Expense" 
                } 
              });
            }
            catId = cat.id;
          }
        }
      } else if (idx["categoryid"] !== undefined) {
        catId = Number(cells[idx["categoryid"]]);
        cat = await prisma.category.findFirst({ where: { id: catId, userId: req.userId! } });
      }
      if (!catId) throw new Error("Missing category");
      if (!cat) {
        cat = await prisma.category.findFirst({ where: { id: catId, userId: req.userId! } });
      }
      if (!cat) throw new Error("Category not found or access denied");
      const inferredType = cat.type || "Expense";
      
      let accountId = await ensurePrimaryAccount(req.userId!);
      if (idx["accountid"] !== undefined && cells[idx["accountid"]]) {
        const parsedAccId = Number(cells[idx["accountid"]]);
        const userAccount = await prisma.account.findFirst({ where: { id: parsedAccId, userId: req.userId! } });
        if (!userAccount) throw new Error("Account not found or access denied");
        accountId = userAccount.id;
      }
      const item = await prisma.transaction.create({
        data: {
          userId: req.userId!,
          date: dateObj,
          amount: amountVal,
          type: inferredType,
          accountId,
          categoryId: catId,
          notes: notesVal || undefined,
        },
      });
      created.push(item.id);
    } catch (e) {
      // skip invalid rows
      // eslint-disable-next-line no-console
      // console.warn(`${logPrefix} row#${rowNum} skipped:`, { row, error: (e as Error)?.message });
    }
  }
  // eslint-disable-next-line no-console
  console.log(`${logPrefix} imported=${created.length}`);
  res.json({ imported: created.length, ids: created });
});

// Bulk delete transactions
const bulkDeleteSchema = z.object({
  ids: z.array(z.number().int()).min(1, "At least one ID required"),
});

transactionsRouter.post("/bulk-delete", requireAuth, async (req: AuthRequest, res) => {
  const parse = bulkDeleteSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload", details: env.isProduction ? undefined : parse.error });
  
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

transactionsRouter.patch("/bulk-update-category", requireAuth, async (req: AuthRequest, res) => {
  const parse = bulkUpdateCategorySchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload", details: env.isProduction ? undefined : parse.error });
  
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
    return res.status(400).json({ error: "Invalid payload", details: env.isProduction ? undefined : parse.error });
  }
  
  const data = parse.data;
  const userId = req.userId!;
  
  // console.log("Delete by details request:", data);
  
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
  
  // console.log("Delete where clause:", JSON.stringify(where, null, 2));
  
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
  
  // console.log("Found matching transactions:", matchingTransactions.length);
  
  if (matchingTransactions.length === 0) {
    return res.status(404).json({ error: "No matching transaction found" });
  }
  
  // Delete the transactions
  const result = await prisma.transaction.deleteMany({
    where,
  });
  
  // console.log("Deleted transactions:", result.count);
  
  res.json({ 
    deleted: result.count,
    transactions: matchingTransactions,
  });
});

// ============================================================================
// ENDPOINT: PARSE SCREENSHOT (Gemini AI OCR + Matcher)
// ============================================================================
transactionsRouter.post(
  "/parse-screenshot",
  requireAuth,
  upload.array("screenshots", 10),
  async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const files = req.files as Express.Multer.File[];

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.email !== "dani24iania@gmail.com") {
        if (files && files.length > 0) {
          for (const file of files) {
            if (file.path) {
              try {
                fs.unlinkSync(file.path);
              } catch (e) {
                console.error("Failed to delete temp file:", e);
              }
            }
          }
        }
        return res.status(403).json({ error: "Gemini AI scanning is currently restricted to authorized administrators." });
      }

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "At least one screenshot file is required." });
      }

      // Fetch user's categories and accounts for mapping context
      const categories = await prisma.category.findMany({
        where: { userId },
        select: { id: true, name: true, type: true }
      });
      const accounts = await prisma.account.findMany({
        where: { userId },
        select: { id: true, name: true, type: true }
      });

      // Parse all screenshots in parallel
      const parsePromises = files.map(async (file) => {
        const fileContent = file.buffer || fs.readFileSync(file.path);
        const parsed = await parseScreenshot(
          fileContent,
          file.mimetype,
          categories,
          accounts
        );

        // Clean up the uploaded file if disk storage was used
        if (file.path) {
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            console.error("Failed to delete temp file:", e);
          }
        }
        return parsed;
      });

      const results = await Promise.all(parsePromises);
      const parsedTransactions = results.flat();

      // Fetch existing transactions for duplicate detection
      const existingTxns = await prisma.transaction.findMany({
        where: { userId },
        select: { date: true, amount: true, notes: true }
      });

      // Map parsed transactions and flag duplicates
      const items = parsedTransactions.map((tx) => {
        // A simple duplicate check: same date and same amount (rounded to 2 decimal places)
        const isDuplicate = existingTxns.some((ex) => {
          const sameDate = dayjs(ex.date).format("YYYY-MM-DD") === tx.date;
          const sameAmount = Math.abs(Number(ex.amount) - tx.amount) < 0.01;
          return sameDate && sameAmount;
        });

        return {
          ...tx,
          isDuplicate
        };
      });

      res.json({ transactions: items });
    } catch (error: any) {
      console.error("[Parse Screenshot Error]:", error);
      res.status(500).json({ error: error.message || "Failed to process screenshot." });
    }
  }
);

// ============================================================================
// ENDPOINT: BULK CREATE TRANSACTIONS
// ============================================================================
const bulkCreateSchema = z.object({
  transactions: z.array(
    z.object({
      date: z.string(),
      amount: z.number(),
      type: z.enum(["Income", "Expense", "Transfer"]),
      notes: z.string().optional().nullable(),
      categoryId: z.number().int(),
      accountId: z.number().int()
    })
  )
});

transactionsRouter.post(
  "/bulk-create",
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const parsedBody = bulkCreateSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: "Invalid transactions array format", details: parsedBody.error });
      }

      const { transactions } = parsedBody.data;

      // Verify that all accounts and categories belong to the user
      const accountIds = [...new Set(transactions.map(t => t.accountId))];
      const categoryIds = [...new Set(transactions.map(t => t.categoryId))];

      const userAccounts = await prisma.account.findMany({
        where: { id: { in: accountIds }, userId },
        select: { id: true }
      });
      const userCategories = await prisma.category.findMany({
        where: { id: { in: categoryIds }, userId },
        select: { id: true }
      });

      if (userAccounts.length !== accountIds.length) {
        return res.status(403).json({ error: "One or more accounts are invalid or access denied." });
      }
      if (userCategories.length !== categoryIds.length) {
        return res.status(403).json({ error: "One or more categories are invalid or access denied." });
      }

      // Create transactions in a single database transaction
      const createdTxns = await prisma.$transaction(
        transactions.map((tx) =>
          prisma.transaction.create({
            data: {
              userId,
              date: new Date(tx.date),
              amount: tx.amount,
              type: tx.type,
              notes: tx.notes || null,
              accountId: tx.accountId,
              categoryId: tx.categoryId
            }
          })
        )
      );

      res.status(201).json({ createdCount: createdTxns.length, items: createdTxns });
    } catch (error) {
      console.error("[Bulk Create Error]:", error);
      res.status(500).json({ error: "Failed to create transactions in bulk." });
    }
  }
);





