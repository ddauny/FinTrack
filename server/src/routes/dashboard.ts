import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { getMarketData } from "../services/marketData.js";
import dayjs from "dayjs";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const [accounts, transactions, manualAssets, portfolios, latestTxn, valuations] = await Promise.all([
    prisma.account.findMany({ where: { userId } }),
    prisma.transaction.findMany({ 
      where: { userId }, 
      orderBy: { date: "desc" }, 
      take: 30,
      include: { category: true }
    }),
    prisma.manualAsset.findMany({ where: { userId } }),
    prisma.portfolio.findMany({ where: { userId }, include: { holdings: true } }),
    prisma.transaction.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
    prisma.assetValuation.findMany({
      where: { item: { group: { userId } } },
      select: { month: true, value: true, itemId: true },
      orderBy: { month: "asc" },
    }),
  ]);

  // Include net transactions across all time into cash balance
  const totalIncomeExpense = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId },
    _sum: { amount: true },
  });
  const totalIncome = Number((totalIncomeExpense.find(r => r.type === "Income")?._sum.amount) || 0);
  const totalExpense = Number((totalIncomeExpense.find(r => r.type === "Expense")?._sum.amount) || 0);
  const cashBalance = accounts.reduce((sum, a) => sum + Number(a.initialBalance), 0) + (totalIncome - totalExpense);
  const manualAssetsValue = manualAssets.reduce(
    (sum, a) => sum + Number(a.estimatedValue) - Number(a.associatedDebt),
    0
  );
  const market = getMarketData();
  const portfoliosValue = portfolios.reduce((sum, p) => {
    const holdingsValue = p.holdings.reduce((hsum, h) => {
      const price = market.prices[h.tickerSymbol] ?? Number(h.avgPurchasePrice)
      return hsum + Number(h.quantity) * Number(price)
    }, 0)
    return sum + holdingsValue
  }, 0)

  // Net worth from assets valuations: sum of all items per month; latest month is the 'Net Worth'
  const totalsByMonth = new Map<string, number>();
  const byMonthByGroup = new Map<string, Map<string, number>>(); // month -> (groupName -> total)
  for (const v of valuations) {
    const key = dayjs(v.month).startOf("month").format("YYYY-MM-01");
    totalsByMonth.set(key, (totalsByMonth.get(key) || 0) + Number(v.value));
  }
  // group breakdown per month from AssetItem->AssetGroup
  const monthsSet = new Set<string>(Array.from(totalsByMonth.keys()));
  if (monthsSet.size > 0) {
    const monthRange = Array.from(monthsSet);
    const itemsWithGroups = await prisma.assetItem.findMany({
      where: { group: { userId } },
      select: { id: true, group: { select: { name: true } } },
    });
    const idToGroup = new Map<number, string>();
    for (const it of itemsWithGroups) idToGroup.set(it.id, it.group?.name || "Other");
    for (const v of valuations) {
      const key = dayjs(v.month).startOf("month").format("YYYY-MM-01");
      const groupName = idToGroup.get(v.itemId) || "Other";
      if (!byMonthByGroup.has(key)) byMonthByGroup.set(key, new Map());
      const m = byMonthByGroup.get(key)!;
      m.set(groupName, (m.get(groupName) || 0) + Number(v.value));
    }
  }
  const monthKeys = Array.from(totalsByMonth.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  // Find latest month with non-zero value for Net Worth and Asset Allocation
  let latestKey: string | undefined;
  for (let i = monthKeys.length - 1; i >= 0; i--) {
    const value = totalsByMonth.get(monthKeys[i]) || 0;
    if (value !== 0) {
      latestKey = monthKeys[i];
      break;
    }
  }
  
  const netWorth = latestKey ? (totalsByMonth.get(latestKey) || 0) : 0;

  // Aggregations
  // Use current month for cash flow calculation
  const monthStart = dayjs().startOf("month").toDate();
  const monthEnd = dayjs().endOf("month").toDate();
  // Get income and expense using category types
  const [incomeResult, expenseResult] = await Promise.all([
    prisma.$queryRaw<any[]>`SELECT SUM(t.amount) as total FROM "Transaction" t JOIN "Category" c ON c.id = t."categoryId" WHERE t."userId" = ${userId} AND c.type = 'Income' AND t.date >= ${monthStart} AND t.date <= ${monthEnd}`,
    prisma.$queryRaw<any[]>`SELECT SUM(t.amount) as total FROM "Transaction" t JOIN "Category" c ON c.id = t."categoryId" WHERE t."userId" = ${userId} AND c.type = 'Expense' AND t.date >= ${monthStart} AND t.date <= ${monthEnd}`
  ]);
  
  const incomeCurrentMonth = { _sum: { amount: incomeResult[0]?.total || 0 } };
  const expenseCurrentMonth = { _sum: { amount: expenseResult[0]?.total || 0 } };
  const cashFlowCurrentMonth = Number(incomeCurrentMonth._sum.amount || 0) - Number(expenseCurrentMonth._sum.amount || 0);
  // Get expense breakdown using category types
  const expenseByCategoryResult = await prisma.$queryRaw<any[]>`SELECT t."categoryId", SUM(t.amount) as total FROM "Transaction" t JOIN "Category" c ON c.id = t."categoryId" WHERE t."userId" = ${userId} AND c.type = 'Expense' AND t.date >= ${monthStart} GROUP BY t."categoryId"`;
  const expenseByCategory = expenseByCategoryResult.map((e: any) => ({ categoryId: e.categoryId, _sum: { amount: e.total } }));
  const categories = await prisma.category.findMany({ where: { userId } });
  const catName = new Map(categories.map(c => [c.id, c.name]));
  const expenseBreakdown = expenseByCategory.map(e => ({ category: catName.get(e.categoryId) || String(e.categoryId), total: Number(e._sum.amount || 0) }));

  // Net Worth Over Time: filter out months with zero value
  const netWorthHistory = monthKeys
    .filter(k => (totalsByMonth.get(k) || 0) !== 0)
    .map(k => ({ date: k, value: totalsByMonth.get(k) || 0 }));
  
  // Asset Allocation: use latest non-zero month
  const latestAllocation = latestKey ? Array.from((byMonthByGroup.get(latestKey) || new Map()).entries()).map(([name, value]) => ({ class: name, value })) : [];
  

  res.json({
    netWorth,
    cashFlowLast30Days: cashFlowCurrentMonth,
    monthlyExpenses: Number(expenseCurrentMonth._sum.amount || 0),
    recentTransactions: transactions,
    netWorthHistory,
    assetAllocation: latestAllocation,
    expenseBreakdown,
  });
  } catch (error) {
    console.error('Error in dashboard summary:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


