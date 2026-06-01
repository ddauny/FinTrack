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

    // 1. Treemap Data: AssetGroup -> AssetItem (with nested children) -> Final Current Value
    const groups = await prisma.assetGroup.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            children: { include: { valuations: { orderBy: { month: 'desc' }, take: 1 } } },
            valuations: { orderBy: { month: 'desc' }, take: 1 }
          }
        }
      }
    });

    const treemapData = groups.map(group => {
      const topLevelItems = group.items.filter(i => !i.parentItemId);
      let groupValue = 0;
      
      const children = topLevelItems.map(item => {
        const itemVal = item.valuations.length > 0 ? Number(item.valuations[0].value) : 0;
        
        let childrenVal = 0;
        const mappedChildren = item.children.map(child => {
          const cVal = child.valuations.length > 0 ? Number(child.valuations[0].value) : 0;
          childrenVal += cVal;
          return { name: child.name, value: cVal };
        });

        const totalVal = itemVal + childrenVal;
        groupValue += totalVal;

        return {
          name: item.name,
          value: totalVal,
          children: mappedChildren.length > 0 ? mappedChildren : undefined
        };
      });

      return {
        name: group.name,
        value: groupValue,
        children
      };
    });

    // 2. Contribution vs Market Growth
    const txns = await prisma.transaction.findMany({
      where: {
        userId,
        assetItemId: { not: null },
        ...(start && { date: { gte: start } }),
        ...(end && { date: { lte: end } })
      }
    });
    
    const valuations = await prisma.assetValuation.findMany({
      where: {
        item: {
          OR: [
            { group: { userId } },
            { parentItem: { group: { userId } } }
          ]
        },
        ...(start && { month: { gte: start } }),
        ...(end && { month: { lte: end } })
      },
      include: { item: true }
    });

    // Group by month
    const sortedMonths = Array.from(new Set([
      ...txns.map(t => dayjs(t.date).format('YYYY-MM')),
      ...valuations.map(v => dayjs(v.month).format('YYYY-MM'))
    ])).sort();

    const txnsPre = await prisma.transaction.aggregate({
      where: {
        userId,
        assetItemId: { not: null },
        ...(start && { date: { lt: start } })
      },
      _sum: { amount: true }
    });
    let cumulativeContrib = Number(txnsPre._sum.amount || 0);

    const contributionGrowth: any[] = [];
    let lastValuation = 0;
    
    for (const monthStr of sortedMonths) {
      const monthTxns = txns.filter(t => dayjs(t.date).format('YYYY-MM') === monthStr);
      for (const t of monthTxns) {
         cumulativeContrib += Number(t.amount);
      }

      const monthVals = valuations.filter(v => dayjs(v.month).format('YYYY-MM') === monthStr);
      let monthValuation = 0;
      if (monthVals.length > 0) {
        monthValuation = monthVals.reduce((sum, v) => sum + Number(v.value), 0);
        lastValuation = monthValuation;
      } else {
        monthValuation = lastValuation;
      }

      contributionGrowth.push({
        month: monthStr,
        contribution: cumulativeContrib,
        valuation: monthValuation
      });
    }

    // 3. CAGR and Total Return
    const finalValuation = contributionGrowth.length > 0 ? contributionGrowth[contributionGrowth.length - 1].valuation : 0;
    const finalContribution = cumulativeContrib;

    const totalReturn = finalContribution > 0 ? ((finalValuation - finalContribution) / finalContribution) * 100 : 0;
    
    let cagr = 0;
    if (start && end && finalContribution > 0) {
       const years = dayjs(end).diff(dayjs(start), 'year', true);
       if (years > 0) {
          cagr = (Math.pow(finalValuation / finalContribution, 1 / years) - 1) * 100;
       }
    }

    // 4. MoM Correlation Matrix
    const correlationMatrix: Record<string, Record<string, number>> = {};
    const groupsNames = groups.map(g => g.name);
    
    const groupMoMs: Record<string, number[]> = {};
    
    for (const group of groups) {
      const gVals = valuations.filter(v => 
        group.items.some(i => i.id === v.item.id || i.children.some(c => c.id === v.item.id))
      );
      const moVals: Record<string, number> = {};
      for (const v of gVals) {
        const m = dayjs(v.month).format('YYYY-MM');
        moVals[m] = (moVals[m] || 0) + Number(v.value);
      }
      const moms: number[] = [];
      for (let i = 1; i < sortedMonths.length; i++) {
         const m1 = sortedMonths[i-1];
         const m2 = sortedMonths[i];
         const v1 = moVals[m1] || 0;
         const v2 = moVals[m2] || 0;
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

    return res.json({
      treemapData,
      contributionGrowth,
      metrics: { totalReturn, cagr },
      correlationMatrix
    });
  } catch (error) {
     console.error('Error in portfolio-analytics:', error);
     return res.status(500).json({ error: 'Internal server error' });
  }
});
