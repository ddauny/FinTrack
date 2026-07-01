import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { decrypt } from "../utils/crypto.js";
import { generateAnalysis } from "../services/ai.js";

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

reportsRouter.get("/period-totals", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { start, end } = parseRange(req.query);

  const rows = await prisma.$queryRaw<any[]>`SELECT c.type, SUM(t.amount) as total
    FROM "Transaction" t
    JOIN "Category" c ON c.id = t."categoryId"
    WHERE t."userId"=${userId}
      AND t.date >= ${start}
      AND t.date <= ${end}
    GROUP BY c.type`;

  const result = rows.map(r => ({
    type: r.type,
    amount: Number(r.total || 0)
  }));

  return res.json(result);
});

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

  // Converte i tipi numerici e calcola il Net Result
   const result = rows.map(r => {
     const income = Number(r.income || 0);
     const expense = Number(r.expense || 0);
     return {
       period: r.period,
       income,
       expense,
       net: income - Math.abs(expense)
     };
   });

  return maybeCsv(req, res, result, ["period", "income", "expense", "net"]);
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
    SUM(CASE WHEN c.type='Income' THEN t.amount ELSE 0 END) as total_income,
    SUM(CASE WHEN c.type='Expense' THEN t.amount ELSE 0 END) as total_expense
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
     total_income: Number(r.total_income || 0),
     total_expense: Number(r.total_expense || 0)
   }));

  return maybeCsv(req, res, result, ["period", "total_income", "total_expense"]);
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

    const rows = await prisma.$queryRaw<any[]>`SELECT c.name as category, c.id as "categoryId",
      SUM(t.amount) as total
      FROM "Transaction" t
      JOIN "Category" c ON c.id = t."categoryId"
      WHERE t."userId"=${userId} AND c.type='Expense'
        -- [FIXED] Usa >= e <= con gli oggetti Date corretti
        AND t.date >= ${start}
        AND t.date <= ${end}
      GROUP BY c.name, c.id ORDER BY total DESC`;

    const numericRows = rows.map(r => ({ ...r, total: Number(r.total || 0), categoryId: Number(r.categoryId) }));
    // Evita maxValue=0 per il grafico radar
    const maxValue = numericRows.length > 0 ? Math.max(1, ...numericRows.map(r => r.total)) : 1;
    const rowsWithMax = numericRows.map(r => ({ ...r, maxValue: maxValue }));

    return maybeCsv(req, res, rowsWithMax, ["category", "total", "maxValue"]);
  } catch (error) {
    console.error('Error in category-analysis:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

reportsRouter.get("/tag-analysis", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { start, end } = parseRange(req.query);

    const rows = await prisma.$queryRaw<any[]>`
      SELECT t.name as tag, SUM(txn.amount) as total
      FROM "Transaction" txn
      JOIN "_TagToTransaction" link ON link."B" = txn.id
      JOIN "Tag" t ON t.id = link."A"
      JOIN "Category" c ON c.id = txn."categoryId"
      WHERE txn."userId" = ${userId}
      AND c.type = 'Expense'
      AND txn.date >= ${start}
      AND txn.date <= ${end}
      GROUP BY t.name
      ORDER BY total DESC
    `;

    const result = rows.map(r => ({
      tag: r.tag,
      total: Number(r.total || 0)
    }));

    return maybeCsv(req, res, result, ["tag", "total"]);
  } catch (error) {
    console.error('Error in tag-analysis:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

reportsRouter.get("/net-worth-trend", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { start, end } = parseRange(req.query);

    const assetGroups = await prisma.assetGroup.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            valuations: {
              where: {
                month: { gte: start, lte: end }
              },
              orderBy: { month: 'asc' }
            },
            children: {
              include: {
                valuations: {
                  where: {
                    month: { gte: start, lte: end }
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Collect all unique months
    const monthsSet = new Set<string>();
    assetGroups.forEach(group => {
      group.items.forEach(item => {
        item.valuations.forEach(v => {
          monthsSet.add(v.month.toISOString().split('T')[0].substring(0, 7));
        });
        item.children.forEach(child => {
          child.valuations.forEach(v => {
            monthsSet.add(v.month.toISOString().split('T')[0].substring(0, 7));
          });
        });
      });
    });
    
    const months = Array.from(monthsSet).sort();
    
    // Calculate total value for each month
    const result = months.map(monthStr => {
      let total = 0;
      assetGroups.forEach(group => {
        group.items.filter(i => !i.parentItemId).forEach(item => {
          const val = item.valuations.find(v => 
            v.month.toISOString().split('T')[0].substring(0, 7) === monthStr
          );
          if (val) {
            total += Number(val.value);
          }
          // Add children
          item.children.forEach(child => {
            const childVal = child.valuations.find(v =>
              v.month.toISOString().split('T')[0].substring(0, 7) === monthStr
            );
            if (childVal) total += Number(childVal.value);
          });
        });
      });
      
      return { date: monthStr + '-01', net_worth: total };
    }).filter(item => item.net_worth > 0);
    
    return res.json(result);
  } catch (error) {
    console.error('Error in net-worth-trend:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Asset Growth Trend - Andamento del valore totale degli asset nel tempo
reportsRouter.get("/asset-growth-trend", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { start, end } = parseRange(req.query);
    
    const assetGroups = await prisma.assetGroup.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            valuations: {
              where: {
                month: { gte: start, lte: end }
              },
              orderBy: { month: 'asc' }
            },
            children: {
              include: {
                valuations: {
                  where: {
                    month: { gte: start, lte: end }
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Raccogli tutti i mesi unici
    const monthsSet = new Set<string>();
    assetGroups.forEach(group => {
      group.items.forEach(item => {
        item.valuations.forEach(v => {
          monthsSet.add(v.month.toISOString().split('T')[0].substring(0, 7));
        });
        item.children.forEach(child => {
          child.valuations.forEach(v => {
            monthsSet.add(v.month.toISOString().split('T')[0].substring(0, 7));
          });
        });
      });
    });
    
    const months = Array.from(monthsSet).sort();
    
    // Calcola il valore totale per ogni mese
    const result = months.map(monthStr => {
      let total = 0;
      assetGroups.forEach(group => {
        group.items.filter(i => !i.parentItemId).forEach(item => {
          const val = item.valuations.find(v => 
            v.month.toISOString().split('T')[0].substring(0, 7) === monthStr
          );
          if (val) {
            total += Number(val.value);
          }
          // Aggiungi figli
          item.children.forEach(child => {
            const childVal = child.valuations.find(v =>
              v.month.toISOString().split('T')[0].substring(0, 7) === monthStr
            );
            if (childVal) total += Number(childVal.value);
          });
        });
      });
      
      return { month: monthStr, value: total };
    }).filter(item => item.value > 0); // Filtra mesi con valore 0
    
    return res.json(result);
  } catch (error) {
    console.error('Error in asset-growth-trend:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Asset Distribution - Distribuzione percentuale per gruppo in un periodo
reportsRouter.get("/asset-distribution", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    
    // Trova il mese più recente con almeno un valore > 0
    const latestValuation = await prisma.assetValuation.findFirst({
      where: {
        item: {
          group: { userId }
        },
        value: { gt: 0 }
      },
      orderBy: { month: 'desc' }
    });

    if (!latestValuation) {
      return res.json([]);
    }

    const latestMonth = latestValuation.month;
    
    const assetGroups = await prisma.assetGroup.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            valuations: {
              where: {
                month: latestMonth
              }
            },
            children: {
              include: {
                valuations: {
                  where: {
                    month: latestMonth
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Calcola il valore totale per ogni gruppo per l'ultimo mese
    const result = assetGroups.map(group => {
      let totalValue = 0;
      
      // Somma solo gli items root (quelli senza parent)
      group.items.filter(i => !i.parentItemId).forEach(item => {
        // Valore diretto dell'item
        const directValue = item.valuations.reduce((sum, v) => sum + Number(v.value), 0);
        
        // Valore dei children (se l'item è parent)
        const childrenValue = item.children.reduce((sum, child) => {
          return sum + child.valuations.reduce((childSum, v) => childSum + Number(v.value), 0);
        }, 0);
        
        // Se l'item ha un valore diretto, usa quello, altrimenti usa la somma dei children
        totalValue += directValue > 0 ? directValue : childrenValue;
      });
      
      return {
        name: group.name,
        value: totalValue
      };
    }).filter(g => g.value > 0);
    
    return res.json(result);
  } catch (error) {
    console.error('Error in asset-distribution:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Asset Group Comparison - Confronto tra gruppi nel tempo
reportsRouter.get("/asset-group-comparison", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { start, end } = parseRange(req.query);
    
    const assetGroups = await prisma.assetGroup.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            valuations: {
              where: {
                month: { gte: start, lte: end }
              },
              orderBy: { month: 'asc' }
            },
            children: {
              include: {
                valuations: {
                  where: {
                    month: { gte: start, lte: end }
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Raccogli tutti i mesi
    const monthsSet = new Set<string>();
    assetGroups.forEach(group => {
      group.items.forEach(item => {
        item.valuations.forEach(v => {
          monthsSet.add(v.month.toISOString().split('T')[0].substring(0, 7));
        });
        item.children.forEach(child => {
          child.valuations.forEach(v => {
            monthsSet.add(v.month.toISOString().split('T')[0].substring(0, 7));
          });
        });
      });
    });
    
    const months = Array.from(monthsSet).sort();
    
    // Crea serie per ogni gruppo
    const series = assetGroups.map(group => {
      const data = months.map(monthStr => {
        let total = 0;
        group.items.filter(i => !i.parentItemId).forEach(item => {
          const val = item.valuations.find(v => 
            v.month.toISOString().split('T')[0].substring(0, 7) === monthStr
          );
          if (val) total += Number(val.value);
          
          item.children.forEach(child => {
            const childVal = child.valuations.find(v =>
              v.month.toISOString().split('T')[0].substring(0, 7) === monthStr
            );
            if (childVal) total += Number(childVal.value);
          });
        });
        return total;
      });
      
      return {
        name: group.name,
        data
      };
    });

    // Filtra i mesi in cui TUTTI i gruppi hanno valore 0
    const validMonthIndices = months
      .map((_, index) => {
        const hasValue = series.some(s => s.data[index] > 0);
        return hasValue ? index : -1;
      })
      .filter(i => i !== -1);

    const filteredMonths = validMonthIndices.map(i => months[i]);
    const filteredSeries = series.map(s => ({
      name: s.name,
      data: validMonthIndices.map(i => s.data[i])
    }));
    
    return res.json({ months: filteredMonths, series: filteredSeries });
  } catch (error) {
    console.error('Error in asset-group-comparison:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Top Assets Evolution - Evoluzione dei principali asset

reportsRouter.get("/top-assets-evolution", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { start, end } = parseRange(req.query);
    
    // Recupera asset che hanno valutazioni nel periodo e sono "top" (per ultimo valore > 0)
    // 1. Troviamo gli ID degli asset che hanno un valore > 0 nell'ultima data disponibile
    const lastValuations = await prisma.assetValuation.findMany({
        where: {
            item: { group: { userId } },
            month: { gte: start, lte: end }
        },
        orderBy: { month: 'desc' },
        distinct: ['itemId'] 
    });
    
    // Ordiniamo per valore decrescente
    const topItemIds = lastValuations
        .sort((a, b) => Number(b.value) - Number(a.value))
        .slice(0, 10) // Top 10
        .map(v => v.itemId);
        
    if (topItemIds.length === 0) return res.json([]);

    const topAssets = await prisma.assetItem.findMany({
      where: { 
          id: { in: topItemIds },
      },
      include: {
        group: true, // Changed from category to group
        valuations: {
          where: {
            month: { gte: start, lte: end }
          },
          orderBy: { month: 'asc' }
        }
      }
    });

    // Costruiamo il result set per la tabella
    const result = topAssets.map(asset => {
        // Valori ordinati per mese
        const vals = asset.valuations;
        if (vals.length === 0) return null;

        const firstVal = Number(vals[0].value);
        const lastVal = Number(vals[vals.length - 1].value);
        
        let percentChange = 0;
        if (firstVal > 0) {
            percentChange = ((lastVal - firstVal) / firstVal) * 100;
        }

        return {
            name: asset.name,
            category: asset.group?.name || 'Uncategorized', // Use group name
            value: lastVal,
            change: percentChange
        };
    }).filter(x => x !== null)
      .sort((a, b) => (b?.value || 0) - (a?.value || 0));
      
    return res.json(result);
  } catch (error) {
    console.error('Error in top-assets-evolution:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Asset Allocation Changes - Variazioni percentuali di allocazione tra mesi
reportsRouter.get("/asset-allocation-changes", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { start, end } = parseRange(req.query);
    
    const assetGroups = await prisma.assetGroup.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            valuations: {
              where: {
                month: { gte: start, lte: end }
              },
              orderBy: { month: 'asc' }
            },
            children: {
              include: {
                valuations: {
                  where: {
                    month: { gte: start, lte: end }
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Raccogli tutti i mesi unici
    const monthsSet = new Set<string>();
    assetGroups.forEach(group => {
      group.items.forEach(item => {
        item.valuations.forEach(v => {
          monthsSet.add(v.month.toISOString().split('T')[0].substring(0, 7));
        });
        item.children.forEach(child => {
          child.valuations.forEach(v => {
            monthsSet.add(v.month.toISOString().split('T')[0].substring(0, 7));
          });
        });
      });
    });
    
    const months = Array.from(monthsSet).sort();
    
    // Calcola il valore totale e per gruppo per ogni mese
    const monthlyData = months.map(monthStr => {
      let total = 0;
      const groups: { [key: string]: number } = {};
      
      assetGroups.forEach(group => {
        let groupTotal = 0;
        
        group.items.filter(i => !i.parentItemId).forEach(item => {
          const val = item.valuations.find(v => 
            v.month.toISOString().split('T')[0].substring(0, 7) === monthStr
          );
          if (val) {
            groupTotal += Number(val.value);
          }
          
          // Aggiungi figli
          item.children.forEach(child => {
            const childVal = child.valuations.find(v =>
              v.month.toISOString().split('T')[0].substring(0, 7) === monthStr
            );
            if (childVal) groupTotal += Number(childVal.value);
          });
        });
        
        groups[group.name] = groupTotal;
        total += groupTotal;
      });
      
      return { month: monthStr, total, groups };
    });
    
    // Filtra i mesi con valore totale = 0
    const validMonthlyData = monthlyData.filter(m => m.total > 0);
    
    // Calcola le percentuali di allocazione e le variazioni
    const result = validMonthlyData.map((current, index) => {
      const allocations: { [key: string]: number } = {};
      const changes: { [key: string]: number } = {};
      
      // Calcola percentuali di allocazione per il mese corrente
      Object.keys(current.groups).forEach(groupName => {
        allocations[groupName] = current.total > 0 
          ? (current.groups[groupName] / current.total) * 100 
          : 0;
      });
      
      // Calcola variazioni rispetto al mese precedente
      if (index > 0) {
        const previous = validMonthlyData[index - 1];
        
        Object.keys(current.groups).forEach(groupName => {
          const currentAllocation = allocations[groupName];
          const previousAllocation = previous.total > 0 
            ? (previous.groups[groupName] / previous.total) * 100 
            : 0;
          
          changes[groupName] = currentAllocation - previousAllocation;
        });
      }
      
      return {
        month: current.month,
        total: current.total,
        allocations,
        changes: index > 0 ? changes : null
      };
    });
    
    return res.json(result);
  } catch (error) {
    console.error('Error in asset-allocation-changes:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

reportsRouter.get("/monthly-category-trends", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { start, end } = parseRange(req.query);

    const rows = await prisma.$queryRaw<any[]>`
      SELECT 
        EXTRACT(YEAR FROM t.date) as year,
        EXTRACT(MONTH FROM t.date) as month,
        c.id as "categoryId",
        c.name as "categoryName",
        c.type as "categoryType",
        SUM(t.amount) as total
      FROM "Transaction" t
      JOIN "Category" c ON c.id = t."categoryId"
      WHERE t."userId"=${userId}
        AND t.date >= ${start}
        AND t.date <= ${end}
      GROUP BY EXTRACT(YEAR FROM t.date), EXTRACT(MONTH FROM t.date), c.id, c.name, c.type
      ORDER BY year DESC, month DESC, total DESC
    `;

    const result = rows.map(r => ({
      year: Number(r.year),
      month: Number(r.month),
      categoryId: Number(r.categoryId),
      categoryName: r.categoryName,
      categoryType: r.categoryType,
      total: Number(r.total || 0),
      period: `${r.year}-${String(r.month).padStart(2, '0')}`
    }));

    return res.json(result);
  } catch (error) {
    console.error('Error in monthly-category-trends:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

reportsRouter.get("/portfolio-analytics", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { start, end } = parseRange(req.query);

    // 1. Fetch asset groups with items and children
    const allGroups = await prisma.assetGroup.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            children: true
          }
        }
      }
    });

    const groups = allGroups.filter(g => g.isInvestment);
    const groupIds = groups.map(g => g.id);

    // Fetch all asset items in the selected groups (root + children)
    const assetItems = await prisma.assetItem.findMany({
      where: {
        OR: [
          { groupId: { in: groupIds } },
          { parentItem: { groupId: { in: groupIds } } }
        ]
      }
    });
    const assetItemIds = assetItems.map(i => i.id);

    // Fetch directly-linked transactions AND investment contribution (PAC) transactions
    // PAC transactions use isAssetLinked categories and represent periodic investment deposits
    const [directTxns, pacTxns, valuations] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, assetItemId: { in: assetItemIds } },
        include: { category: true }
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          assetItemId: null,
          category: { isAssetLinked: true }
        },
        include: { category: true }
      }),
      prisma.assetValuation.findMany({
        where: {
          item: {
            OR: [
              { groupId: { in: groupIds } },
              { parentItem: { groupId: { in: groupIds } } }
            ]
          }
        },
        orderBy: { month: 'asc' },
        include: { item: true }
      })
    ]);

    // Build lookup maps for valuations and direct transactions
    const itemValuations = new Map<number, any[]>();
    for (const v of valuations) {
      if (!itemValuations.has(v.itemId)) itemValuations.set(v.itemId, []);
      itemValuations.get(v.itemId)!.push(v);
    }

    const itemTxns = new Map<number, any[]>();
    for (const t of directTxns) {
      if (t.assetItemId) {
        if (!itemTxns.has(t.assetItemId)) itemTxns.set(t.assetItemId, []);
        itemTxns.get(t.assetItemId)!.push(t);
      }
    }

    // All sorted months (valuations + all investment transactions)
    const allSortedMonths = Array.from(new Set([
      ...directTxns.map(t => dayjs(t.date).format('YYYY-MM')),
      ...pacTxns.map(t => dayjs(t.date).format('YYYY-MM')),
      ...valuations.map(v => dayjs(v.month).format('YYYY-MM'))
    ])).sort();

    // Separate root items from children
    const rootItems = assetItems.filter(i => !i.parentItemId);

    // Helper: round to 2 decimal places to eliminate Prisma Decimal floating-point noise
    const r2 = (n: number) => Math.round(n * 100) / 100;

    // For each root item, compute its effective monthly valuation:
    // = own valuation if it exists, OR sum of children valuations for that month
    const getEffectiveVal = (item: any, monthStr: string): number | null => {
      const ownVals = itemValuations.get(item.id) || [];
      const ownEntry = ownVals.find((v: any) => dayjs(v.month).format('YYYY-MM') === monthStr);
      if (ownEntry) return r2(Number(ownEntry.value));

      const children = assetItems.filter((c: any) => c.parentItemId === item.id);
      if (children.length > 0) {
        let sum = 0; let hasAny = false;
        for (const child of children) {
          const childVals = itemValuations.get(child.id) || [];
          const childEntry = childVals.find((v: any) => dayjs(v.month).format('YYYY-MM') === monthStr);
          if (childEntry) { sum += r2(Number(childEntry.value)); hasAny = true; }
        }
        if (hasAny) return r2(sum);
      }
      return null;
    };

    const getCarriedForwardVal = (itemId: number, targetMonthStr: string): number => {
      const ownVals = itemValuations.get(itemId) || [];
      const sortedVals = [...ownVals].sort((a, b) => dayjs(a.month).valueOf() - dayjs(b.month).valueOf());
      
      let lastVal = 0;
      for (const v of sortedVals) {
        const mStr = dayjs(v.month).format('YYYY-MM');
        if (mStr <= targetMonthStr) {
          lastVal = r2(Number(v.value));
        } else {
          break;
        }
      }
      return lastVal;
    };

    const getEffectiveCarriedForwardVal = (item: any, targetMonthStr: string): number => {
      const ownVal = getCarriedForwardVal(item.id, targetMonthStr);
      if (ownVal > 0) return ownVal;

      const children = assetItems.filter((c: any) => c.parentItemId === item.id);
      if (children.length > 0) {
        let sum = 0;
        for (const child of children) {
          sum += getEffectiveCarriedForwardVal(child, targetMonthStr);
        }
        return r2(sum);
      }
      return 0;
    };

    interface ItemState {
      itemId: number;
      hasValuations: boolean;
      m_first?: string;
      v_first?: number;
      valVal: number;
      history: Map<string, { valuation: number }>;
    }

    // Build valuation states (one per root item, tracking only valuation)
    const itemStates: ItemState[] = [];
    for (const item of rootItems) {
      const firstValMonth = allSortedMonths.find(m => getEffectiveVal(item, m) !== null) ?? null;
      const firstValValue = firstValMonth ? getEffectiveVal(item, firstValMonth) : null;
      const hasValuations = firstValMonth !== null;

      itemStates.push({
        itemId: item.id,
        hasValuations,
        m_first: firstValMonth ?? undefined,
        v_first: firstValValue ?? undefined,
        valVal: 0,
        history: new Map()
      });
    }

    // === CONTRIBUTION calculation (separate from valuation) ===
    // Global start: earliest initialContributionDate among root items (or first valuation month)
    const rootItemsWithStart = rootItems.filter(i => (i as any).initialContributionDate);
    const globalStartMonth = rootItemsWithStart.length > 0
      ? rootItemsWithStart
          .map(i => dayjs((i as any).initialContributionDate).format('YYYY-MM'))
          .sort()[0]
      : (allSortedMonths[0] ?? null);

    // Sum of all initialContributions (flat total at start)
    const totalInitialContrib = r2(rootItems.reduce((sum, i) => {
      return sum + ((i as any).initialContribution != null ? r2(Number((i as any).initialContribution)) : 0);
    }, 0));

    // PAC transactions by month (isAssetLinked, not current month)
    const currentCalendarMonth = dayjs().format('YYYY-MM');
    const pacByMonth = new Map<string, number>();
    for (const t of pacTxns) {
      const m = dayjs(t.date).format('YYYY-MM');
      if (m === currentCalendarMonth) continue;
      const amt = (t.type === 'Expense' || t.type === 'Transfer') ? r2(Number(t.amount)) : -r2(Number(t.amount));
      pacByMonth.set(m, r2((pacByMonth.get(m) || 0) + amt));
    }
    // Direct txns by month (for contribution tracking)
    const directByMonth = new Map<string, number>();
    for (const t of directTxns) {
      const m = dayjs(t.date).format('YYYY-MM');
      if (m === currentCalendarMonth) continue;
      const amt = (t.type === 'Expense' || t.type === 'Transfer') ? r2(Number(t.amount)) : -r2(Number(t.amount));
      directByMonth.set(m, r2((directByMonth.get(m) || 0) + amt));
    }

    // Find the effective end month based on user filter or last available month
    const endMonthFilter = end ? dayjs(end).format('YYYY-MM') : null;
    let effectiveEndMonth = allSortedMonths.length > 0 ? allSortedMonths[allSortedMonths.length - 1] : '';
    if (endMonthFilter && allSortedMonths.length > 0) {
      const matchingMonths = allSortedMonths.filter(m => m <= endMonthFilter);
      if (matchingMonths.length > 0) effectiveEndMonth = matchingMonths[matchingMonths.length - 1];
    }

    const itemValInEndMonth = new Map<number, number>();
    const overallTimeline: { month: string; contribution: number; valuation: number }[] = [];

    let runningContrib = 0;
    let contribStarted = false;

    for (const monthStr of allSortedMonths) {
      if (monthStr === currentCalendarMonth) continue;

      // === CONTRIBUTION ===
      if (globalStartMonth !== null) {
        if (monthStr < globalStartMonth) {
          runningContrib = 0;
        } else if (monthStr === globalStartMonth) {
          // At start month: set initial capital + any PAC that month
          runningContrib = r2(totalInitialContrib + (pacByMonth.get(monthStr) || 0) + (directByMonth.get(monthStr) || 0));
          contribStarted = true;
        } else if (contribStarted) {
          // After start: accumulate PAC + direct transactions
          runningContrib = r2(runningContrib + (pacByMonth.get(monthStr) || 0) + (directByMonth.get(monthStr) || 0));
        }
      }

      // === VALUATION ===
      let monthTotalValuation = 0;
      for (const state of itemStates) {
        const itemObj = rootItems.find(i => i.id === state.itemId)!;
        const effectiveVal = getEffectiveVal(itemObj, monthStr);

        if (state.hasValuations) {
          if (monthStr < state.m_first!) {
            state.valVal = 0;
          } else if (monthStr === state.m_first!) {
            state.valVal = state.v_first!;
          } else {
            state.valVal = effectiveVal !== null ? effectiveVal : state.valVal;
          }
        } else {
          state.valVal = 0;
        }
        if (state.valVal < 0) state.valVal = 0;
        state.history.set(monthStr, { valuation: state.valVal });
        monthTotalValuation = r2(monthTotalValuation + state.valVal);
      }

      if (monthStr === effectiveEndMonth) {
        for (const s of itemStates) {
          itemValInEndMonth.set(s.itemId, s.valVal);
        }
      }

      overallTimeline.push({ month: monthStr, contribution: runningContrib, valuation: monthTotalValuation });
    }



    // Filter the timeline by date range
    let filteredTimeline = overallTimeline;
    const startMonthFilter = start ? dayjs(start).format('YYYY-MM') : null;
    if (startMonthFilter) {
      filteredTimeline = filteredTimeline.filter(t => t.month >= startMonthFilter);
    }
    if (endMonthFilter) {
      filteredTimeline = filteredTimeline.filter(t => t.month <= endMonthFilter);
    }

    // 3. CAGR and Total Return
    const finalValuation = filteredTimeline.length > 0 ? filteredTimeline[filteredTimeline.length - 1].valuation : 0;
    const finalContribution = filteredTimeline.length > 0 ? filteredTimeline[filteredTimeline.length - 1].contribution : 0;

    const totalReturn = finalContribution > 0 ? ((finalValuation - finalContribution) / finalContribution) * 100 : 0;
    
    let cagr = 0;
    if (start && end && finalContribution > 0) {
       const years = dayjs(end).diff(dayjs(start), 'year', true);
       if (years > 0.08) {
          cagr = (Math.pow(Math.max(0, finalValuation) / finalContribution, 1 / years) - 1) * 100;
       }
    }

    // Generate Treemap Data: use getEffectiveCarriedForwardVal for accurate carried-forward end-month values
    const treemapData = groups.map(group => {
      const topLevelItems = group.items.filter(i => !i.parentItemId);
      let groupValue = 0;

      const children = topLevelItems.map(item => {
        // Use getEffectiveCarriedForwardVal which handles own valuation OR sum of children (carried forward)
        const totalVal = effectiveEndMonth ? getEffectiveCarriedForwardVal(item, effectiveEndMonth) : 0;
        groupValue += totalVal;

        // For treemap children display: get individual children values carried forward
        const subChildren = (item.children || []).map((child: any) => {
          const val = effectiveEndMonth ? getEffectiveCarriedForwardVal(child, effectiveEndMonth) : 0;
          return { name: child.name, value: val };
        }).filter((c: any) => c.value > 0);

        return {
          name: item.name,
          value: totalVal,
          children: subChildren.length > 0 ? subChildren : undefined
        };
      });

      return { name: group.name, value: groupValue, children };
    });

    const concentrationRisk = treemapData.map(g => ({
        name: g.name,
        percentage: finalValuation > 0 ? (g.value / finalValuation) * 100 : 0
    })).sort((a,b) => b.percentage - a.percentage);

    // 4. MoM Correlation Matrix (for filtered months)
    const correlationMatrix: Record<string, Record<string, number>> = {};
    const groupsNames = groups.map(g => g.name);
    
    const groupMoMs: Record<string, number[]> = {};

    const filteredMonthsList = allSortedMonths.filter(m => {
      if (startMonthFilter && m < startMonthFilter) return false;
      if (endMonthFilter && m > endMonthFilter) return false;
      return true;
    });

    const getGroupVal = (group: typeof groups[0], mStr: string) => {
      let sum = 0;
      for (const item of group.items) {
        const state = itemStates.find(s => s.itemId === item.id);
        if (state) {
          sum += state.history.get(mStr)?.valuation || 0;
        }
      }
      return sum;
    };

    for (const group of groups) {
      const moms: number[] = [];
      for (let i = 0; i < filteredMonthsList.length; i++) {
        const currentMonth = filteredMonthsList[i];
        
        // Find previous month relative to current month in allSortedMonths to compute MoM return correctly
        const allIdx = allSortedMonths.indexOf(currentMonth);
        const prevMonth = allIdx > 0 ? allSortedMonths[allIdx - 1] : null;
        if (!prevMonth) continue;

        const v1 = getGroupVal(group, prevMonth);
        const v2 = getGroupVal(group, currentMonth);
        const ret = v1 > 0 ? (v2 - v1) / v1 : 0;
        moms.push(ret);
      }
      groupMoMs[group.name] = moms;
    }

    const pearsonCorrelation = (xs: number[], ys: number[]) => {
      if (xs.length !== ys.length || xs.length === 0) return 0;
      const mx = xs.reduce((a,b) => a+b, 0) / xs.length;
      const my = ys.reduce((a,b) => a+b, 0) / ys.length;
      let sx = 0, sy = 0, sxy = 0;
      for (let i = 0; i < xs.length; i++) {
        const rx = xs[i] - mx;
        const ry = ys[i] - my;
        sx += rx * rx;
        sy += ry * ry;
        sxy += rx * ry;
      }
      if (sx === 0 || sy === 0) return 0;
      return sxy / Math.sqrt(sx * sy);
    };

    for (const g1 of groupsNames) {
      correlationMatrix[g1] = {};
      for (const g2 of groupsNames) {
        correlationMatrix[g1][g2] = g1 === g2 ? 1.0 : pearsonCorrelation(groupMoMs[g1], groupMoMs[g2]);
      }
    }

    // New Metric: Saving Rate (Last 12 months)
    const yearAgo = dayjs().subtract(1, 'year').toDate();
    const incomeTxns = await prisma.transaction.aggregate({
        where: { userId, category: { type: 'Income' }, date: { gte: yearAgo } },
        _sum: { amount: true }
    });
    const expenseTxns = await prisma.transaction.aggregate({
        where: { userId, category: { type: 'Expense' }, date: { gte: yearAgo } },
        _sum: { amount: true }
    });
    const totalInc = Number(incomeTxns._sum.amount || 0);
    const totalExp = Math.abs(Number(expenseTxns._sum.amount || 0));
    const savingRate = totalInc > 0 ? ((totalInc - totalExp) / totalInc) * 100 : 0;

    return res.json({
      treemapData,
      contributionGrowth: filteredTimeline,
      metrics: { totalReturn, cagr, savingRate, finalValuation, finalContribution },
      correlationMatrix,
      concentrationRisk
    });
  } catch (error) {
     console.error('Error in portfolio-analytics:', error);
     return res.status(500).json({ error: 'Internal server error' });
  }
});

reportsRouter.post("/ai-chat", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { prompt } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    let apiKey: string | null = null;
    if (user.geminiApiKey) {
      try {
        apiKey = decrypt(user.geminiApiKey);
      } catch (err) {
        return res.status(500).json({ error: "Failed to load Gemini API key securely." });
      }
    }

    if (!apiKey) {
      return res.status(403).json({ error: "Gemini API key is not configured. Please configure it in Settings." });
    }

    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: "Prompt is required" });

    // Fetch minimal context for the AI
    const assetGroups = await prisma.assetGroup.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            valuations: { orderBy: { month: "desc" }, take: 24 } // last 2 years
          }
        }
      }
    });

    const oneYearAgo = dayjs().subtract(1, 'year').toDate();
    const recentTxns = await prisma.transaction.findMany({
      where: { userId, date: { gte: oneYearAgo } },
      select: { amount: true, date: true, type: true, category: { select: { name: true } } }
    });

    // Group transactions by month, type, and category to preserve exact context (e.g., Income vs Expense)
    const monthlySummary: any = {};
    for (const tx of recentTxns) {
      const m = dayjs(tx.date).format("YYYY-MM");
      const type = tx.type; // Income, Expense, Transfer
      const cat = tx.category?.name || "Uncategorized";
      if (!monthlySummary[m]) monthlySummary[m] = {};
      if (!monthlySummary[m][type]) monthlySummary[m][type] = {};
      if (!monthlySummary[m][type][cat]) monthlySummary[m][type][cat] = 0;
      monthlySummary[m][type][cat] += Number(tx.amount);
    }

    const context = {
      assets: assetGroups.map(g => ({
        name: g.name,
        items: g.items.map((i: any) => ({
          name: i.name,
          recentValuations: i.valuations.map((v: any) => ({ month: dayjs(v.month).format("YYYY-MM"), value: Number(v.value) }))
        }))
      })),
      monthlySpendingSummary: monthlySummary
    };

    const analysis = await generateAnalysis(prompt, context, apiKey);
    res.json(analysis);

  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: "AI failed to process your request." });
  }
});

