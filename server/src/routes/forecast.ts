import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import dayjs from "dayjs";

export const forecastRouter = Router();

// ─── Linear regression helper ───────────────────────────────
function linearRegression(points: { x: number; y: number }[]) {
    const n = points.length;
    if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0 };
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (const p of points) {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumX2 += p.x * p.x;
    }
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return { slope: 0, intercept: sumY / n };
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

// ─── GET /net-worth  ────────────────────────────────────────
// Returns historical net worth + 6-month linear projection
forecastRouter.get("/net-worth", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;

        const valuations = await prisma.assetValuation.findMany({
            where: { item: { group: { userId } } },
            select: { month: true, value: true },
            orderBy: { month: "asc" },
        });

        // Aggregate by month
        const totalsByMonth = new Map<string, number>();
        for (const v of valuations) {
            const key = dayjs(v.month).startOf("month").format("YYYY-MM-01");
            totalsByMonth.set(key, (totalsByMonth.get(key) || 0) + Number(v.value));
        }

        const monthKeys = Array.from(totalsByMonth.keys())
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        // Filter out zero-value months
        const history = monthKeys
            .filter(k => (totalsByMonth.get(k) || 0) !== 0)
            .map(k => ({ date: k, value: totalsByMonth.get(k) || 0 }));

        // Linear regression on indexed months
        const points = history.map((h, i) => ({ x: i, y: h.value }));
        const { slope, intercept } = linearRegression(points);

        // Project 6 months forward
        const lastDate = history.length > 0 ? dayjs(history[history.length - 1].date) : dayjs();
        const projection: { date: string; value: number }[] = [];
        for (let i = 1; i <= 6; i++) {
            const futureDate = lastDate.add(i, "month").format("YYYY-MM-01");
            const projectedValue = Math.round((slope * (points.length - 1 + i) + intercept) * 100) / 100;
            projection.push({ date: futureDate, value: projectedValue });
        }

        res.json({ history, projection });
    } catch (error) {
        console.error("Error in net-worth forecast:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ─── GET /year-over-year?year1=YYYY&year2=YYYY ─────────────
forecastRouter.get("/year-over-year", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const year1 = Number(req.query.year1) || dayjs().year() - 1;
        const year2 = Number(req.query.year2) || dayjs().year();

        const start1 = new Date(`${year1}-01-01`);
        const end1 = new Date(`${year1}-12-31T23:59:59.999Z`);
        const start2 = new Date(`${year2}-01-01`);
        const end2 = new Date(`${year2}-12-31T23:59:59.999Z`);

        // Fetch all transactions for both years with category info
        const [txns1, txns2] = await Promise.all([
            prisma.transaction.findMany({
                where: { userId, date: { gte: start1, lte: end1 } },
                include: { category: { select: { type: true } } },
            }),
            prisma.transaction.findMany({
                where: { userId, date: { gte: start2, lte: end2 } },
                include: { category: { select: { type: true } } },
            }),
        ]);

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const aggregate = (txns: typeof txns1) => {
            const income = new Array(12).fill(0);
            const expense = new Array(12).fill(0);
            for (const t of txns) {
                const m = new Date(t.date).getMonth();
                const amount = Number(t.amount);
                if (t.category?.type === "Income") income[m] += amount;
                else if (t.category?.type === "Expense") expense[m] += amount;
            }
            return { income, expense };
        };

        const y1 = aggregate(txns1);
        const y2 = aggregate(txns2);

        res.json({
            months,
            year1,
            year2,
            year1Income: y1.income,
            year1Expense: y1.expense,
            year2Income: y2.income,
            year2Expense: y2.expense,
        });
    } catch (error) {
        console.error("Error in year-over-year:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ─── GET /monthly-forecast ──────────────────────────────────
// Current month: actual + projected from recurring transactions
forecastRouter.get("/monthly-forecast", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const now = dayjs();
        const monthStart = now.startOf("month").toDate();
        const monthEnd = now.endOf("month").toDate();
        const today = now.toDate();

        // Actual transactions this month
        const actualTxns = await prisma.transaction.findMany({
            where: { userId, date: { gte: monthStart, lte: monthEnd } },
            include: { category: { select: { type: true, name: true } } },
        });

        let actualIncome = 0, actualExpenses = 0;
        const expenseByCategory: Record<string, number> = {};
        const incomeByCategory: Record<string, number> = {};
        const dailyExpenses: Record<number, number> = {};
        const dailyIncome: Record<number, number> = {};

        for (const t of actualTxns) {
            const amount = Number(t.amount);
            const day = dayjs(t.date).date();
            if (t.category?.type === "Income") {
                actualIncome += amount;
                incomeByCategory[t.category.name] = (incomeByCategory[t.category.name] || 0) + amount;
                dailyIncome[day] = (dailyIncome[day] || 0) + amount;
            } else if (t.category?.type === "Expense") {
                actualExpenses += amount;
                expenseByCategory[t.category.name] = (expenseByCategory[t.category.name] || 0) + amount;
                dailyExpenses[day] = (dailyExpenses[day] || 0) + amount;
            }
        }

        // Previous month data for comparison
        const prevMonthStart = now.subtract(1, "month").startOf("month").toDate();
        const prevMonthEnd = now.subtract(1, "month").endOf("month").toDate();
        const prevTxns = await prisma.transaction.findMany({
            where: { userId, date: { gte: prevMonthStart, lte: prevMonthEnd } },
            include: { category: { select: { type: true } } },
        });

        let prevIncome = 0, prevExpenses = 0;
        for (const t of prevTxns) {
            const amount = Number(t.amount);
            if (t.category?.type === "Income") prevIncome += amount;
            else if (t.category?.type === "Expense") prevExpenses += amount;
        }

        // Recurring transactions that should fire in remaining days of month
        const recurringTxns = await prisma.recurringTransaction.findMany({
            where: { userId, isActive: true },
        });

        let projectedIncome = 0, projectedExpenses = 0;

        for (const rt of recurringTxns) {
            const amount = Number(rt.amount);
            let nextDate = dayjs(rt.nextDate);

            while (nextDate.isBefore(dayjs(today), "day") || nextDate.isSame(dayjs(today), "day")) {
                nextDate = advanceDate(nextDate, rt.frequency);
            }

            while (nextDate.isBefore(dayjs(monthEnd)) || nextDate.isSame(dayjs(monthEnd), "day")) {
                if (rt.type === "Income") projectedIncome += amount;
                else projectedExpenses += amount;
                nextDate = advanceDate(nextDate, rt.frequency);
            }
        }

        const totalIncome = actualIncome + projectedIncome;
        const totalExpenses = actualExpenses + projectedExpenses;
        const estimatedBalance = totalIncome - totalExpenses;
        const daysInMonth = now.daysInMonth();
        const daysPassed = now.date();

        // Build daily cumulative data
        const dailyCumulative: { day: number; expenses: number; income: number }[] = [];
        let cumExp = 0, cumInc = 0;
        for (let d = 1; d <= daysPassed; d++) {
            cumExp += dailyExpenses[d] || 0;
            cumInc += dailyIncome[d] || 0;
            dailyCumulative.push({ day: d, expenses: Math.round(cumExp * 100) / 100, income: Math.round(cumInc * 100) / 100 });
        }

        // Top expense categories
        const topExpenses = Object.entries(expenseByCategory)
            .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 6);

        // Top income categories
        const topIncome = Object.entries(incomeByCategory)
            .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 6);

        // Average daily spending
        const avgDailySpending = daysPassed > 0 ? Math.round((actualExpenses / daysPassed) * 100) / 100 : 0;
        const projectedMonthlyExpenses = Math.round(avgDailySpending * daysInMonth * 100) / 100;

        // Savings rate
        const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 10000) / 100 : 0;

        res.json({
            actualIncome: Math.round(actualIncome * 100) / 100,
            actualExpenses: Math.round(actualExpenses * 100) / 100,
            projectedIncome: Math.round(projectedIncome * 100) / 100,
            projectedExpenses: Math.round(projectedExpenses * 100) / 100,
            estimatedBalance: Math.round(estimatedBalance * 100) / 100,
            daysInMonth,
            daysPassed,
            monthLabel: now.format("MMMM YYYY"),
            // New fields
            topExpenses,
            topIncome,
            dailyCumulative,
            avgDailySpending,
            projectedMonthlyExpenses,
            savingsRate,
            prevMonthIncome: Math.round(prevIncome * 100) / 100,
            prevMonthExpenses: Math.round(prevExpenses * 100) / 100,
            prevMonthBalance: Math.round((prevIncome - prevExpenses) * 100) / 100,
        });
    } catch (error) {
        console.error("Error in monthly-forecast:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

function advanceDate(d: dayjs.Dayjs, frequency: string): dayjs.Dayjs {
    switch (frequency) {
        case "WEEKLY": return d.add(1, "week");
        case "BIWEEKLY": return d.add(2, "week");
        case "MONTHLY": return d.add(1, "month");
        case "BIMONTHLY": return d.add(2, "month");
        case "QUARTERLY": return d.add(3, "month");
        case "YEARLY": return d.add(1, "year");
        default: return d.add(1, "month");
    }
}
