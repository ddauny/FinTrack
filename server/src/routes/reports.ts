import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

export const reportsRouter = Router();
dayjs.extend(customParseFormat);

// [SOLUZIONE] Funzione identica a quella funzionante in transactionsRouter
// Restituisce Date objects per start-of-day e end-of-day
function parseRange(q: any) {
  let start: Date | null = null;
  let end: Date | null = null;

  if (q.start) {
    const parsedStart = dayjs(String(q.start), ["YYYY-MM-DD", "DD/MM/YYYY"], true);
    if (parsedStart.isValid()) {
      start = parsedStart.startOf('day').toDate();
    }
  }
  // Default start date se non valida o non fornita
  if (!start) {
     start = new Date("1970-01-01T00:00:00.000Z"); // Inizio epoca UTC
  }


  if (q.end) {
    const parsedEnd = dayjs(String(q.end), ["YYYY-MM-DD", "DD/MM/YYYY"], true);
    if (parsedEnd.isValid()) {
      end = parsedEnd.endOf('day').toDate(); // Fine del giorno
    }
  }
   // Default end date se non valida o non fornita
   if (!end) {
       end = dayjs().endOf('day').toDate(); // Fine di oggi
   }

  // Assicura che end non sia prima di start
  if (start && end && end < start) {
      // Scambia se le date sono invertite
      const tempStart = dayjs(end).startOf('day').toDate();
      const tempEnd = dayjs(start).endOf('day').toDate();
      return { start: tempStart, end: tempEnd };
  }

  return { start, end }; // Ritorna oggetti Date pronti per Prisma
}

// Funzione maybeCsv invariata (con miglioramento escaping)
function maybeCsv(req: any, res: any, rows: any[], headers: string[]) {
  if (String(req.query.format).toLowerCase() === "csv") {
    const escapeCsv = (val: any) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const csv = [headers.join(",")]
      .concat(rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(",")))
      .join("\n");
    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", "attachment; filename=report.csv");
    return res.send(csv);
  }
  return res.json(rows);
}


// --- Endpoint Corretti ---

reportsRouter.get("/cashflow", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { start, end } = parseRange(req.query); // Ora restituisce Date corrette

  const rows = await prisma.$queryRaw<any[]>`SELECT
    to_char(date_trunc('month', t.date), 'YYYY-MM') as period,
    SUM(CASE WHEN c.type='Income' THEN t.amount ELSE 0 END) as income,
    SUM(CASE WHEN c.type='Expense' THEN t.amount ELSE 0 END) as expense
    FROM "Transaction" t
    JOIN "Category" c ON c.id = t."categoryId"
    WHERE t."userId"=${userId}
      -- [FIXED] Usa >= e <= con gli oggetti Date corretti (start/end of day)
      AND t.date >= ${start}
      AND t.date <= ${end}
    GROUP BY date_trunc('month', t.date)
    ORDER BY date_trunc('month', t.date)`;

  // Converte i tipi numerici (potrebbero essere stringhe/BigInt da $queryRaw)
   const result = rows.map(r => ({
     period: r.period,
     income: Number(r.income || 0),
     expense: Number(r.expense || 0)
   }));

  return maybeCsv(req, res, result, ["period", "income", "expense"]);
});

reportsRouter.get("/spending-by-category", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { start, end } = parseRange(req.query); // Ora restituisce Date corrette

  const rows = await prisma.$queryRaw<any[]>`SELECT c.name as category, SUM(t.amount) as total
    FROM "Transaction" t JOIN "Category" c ON c.id=t."categoryId"
    WHERE t."userId"=${userId} AND c.type='Expense'
      -- [FIXED] Usa >= e <= con gli oggetti Date corretti
      AND t.date >= ${start}
      AND t.date <= ${end}
    GROUP BY c.name ORDER BY total DESC`;

   const result = rows.map(r => ({
     category: r.category,
     total: Number(r.total || 0)
   }));

  return maybeCsv(req, res, result, ["category", "total"]);
});

reportsRouter.get("/trends", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { start, end } = parseRange(req.query); // Ora restituisce Date corrette

  const rows = await prisma.$queryRaw<any[]>`SELECT
    to_char(date_trunc('month', t.date), 'YYYY-MM') as period,
    SUM(CASE WHEN c.type='Income' THEN t.amount ELSE 0 END) as income,
    SUM(CASE WHEN c.type='Expense' THEN t.amount ELSE 0 END) as expense
    FROM "Transaction" t
    JOIN "Category" c ON c.id = t."categoryId"
    WHERE t."userId"=${userId}
      -- [FIXED] Usa >= e <= con gli oggetti Date corretti
      AND t.date >= ${start}
      AND t.date <= ${end}
    GROUP BY date_trunc('month', t.date)
    ORDER BY date_trunc('month', t.date)`;

   const result = rows.map(r => ({
     period: r.period,
     income: Number(r.income || 0),
     expense: Number(r.expense || 0)
   }));

  return maybeCsv(req, res, result, ["period", "income", "expense"]);
});

reportsRouter.get("/networth-history", requireAuth, async (_req: AuthRequest, res) => {
  return res.json([]); // Invariato
});

reportsRouter.get("/test", requireAuth, async (req: AuthRequest, res) => {
  try {
    return res.json({ message: "Test endpoint working", userId: req.userId });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } // Invariato
});

reportsRouter.get("/monthly-expenses", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { start, end } = parseRange(req.query); // Ora restituisce Date corrette

    const rows = await prisma.$queryRaw<any[]>`SELECT
      EXTRACT(YEAR FROM t.date) as year,
      EXTRACT(MONTH FROM t.date) as month,
      SUM(t.amount) as total
      FROM "Transaction" t
      JOIN "Category" c ON c.id = t."categoryId"
      WHERE t."userId"=${userId} AND c.type='Expense'
        -- [FIXED] Usa >= e <= con gli oggetti Date corretti
        AND t.date >= ${start}
        AND t.date <= ${end}
      GROUP BY EXTRACT(YEAR FROM t.date), EXTRACT(MONTH FROM t.date)
      ORDER BY year, month`;

    const formattedData = rows.map(row => ({
      month: `${row.year}-${String(row.month).padStart(2, '0')}`,
      total: Number(row.total || 0)
    }));

    return maybeCsv(req, res, formattedData, ["month", "total"]);
  } catch (error) {
    console.error('Error in monthly-expenses:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

reportsRouter.get("/category-analysis", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { start, end } = parseRange(req.query); // Ora restituisce Date corrette

    const rows = await prisma.$queryRaw<any[]>`SELECT c.name as category,
      SUM(t.amount) as total
      FROM "Transaction" t
      JOIN "Category" c ON c.id = t."categoryId"
      WHERE t."userId"=${userId} AND c.type='Expense'
        -- [FIXED] Usa >= e <= con gli oggetti Date corretti
        AND t.date >= ${start}
        AND t.date <= ${end}
      GROUP BY c.name ORDER BY total DESC`;

    const numericRows = rows.map(r => ({ ...r, total: Number(r.total || 0) }));
    // Evita maxValue=0 per il grafico radar
    const maxValue = numericRows.length > 0 ? Math.max(1, ...numericRows.map(r => r.total)) : 1;
    const rowsWithMax = numericRows.map(r => ({ ...r, maxValue: maxValue }));

    return maybeCsv(req, res, rowsWithMax, ["category", "total", "maxValue"]);
  } catch (error) {
    console.error('Error in category-analysis:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

reportsRouter.get("/net-worth-trend", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { start, end } = parseRange(req.query); // Ora restituisce Date corrette
    return res.json([]); // Invariato
  } catch (error) {
    console.error('Error in net-worth-trend:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});