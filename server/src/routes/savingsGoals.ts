import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { z } from "zod";

export const savingsGoalsRouter = Router();

const goalSchema = z.object({
    name: z.string().min(1),
    targetAmount: z.number().positive(),
    currentAmount: z.number().min(0).optional(),
    deadline: z.string().optional().nullable(),
    icon: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
});

// GET /  — List all savings goals
savingsGoalsRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
    try {
        const goals = await prisma.savingsGoal.findMany({
            where: { userId: req.userId! },
            orderBy: { createdAt: "desc" },
        });
        res.json(goals);
    } catch (error) {
        console.error("Error fetching savings goals:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /  — Create a savings goal
savingsGoalsRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
    try {
        const parse = goalSchema.safeParse(req.body);
        if (!parse.success) return res.status(400).json({ error: "Invalid payload", details: parse.error.flatten() });

        const data = parse.data;
        const goal = await prisma.savingsGoal.create({
            data: {
                userId: req.userId!,
                name: data.name,
                targetAmount: data.targetAmount,
                currentAmount: data.currentAmount ?? 0,
                deadline: data.deadline ? new Date(data.deadline) : null,
                icon: data.icon ?? null,
                color: data.color ?? null,
            },
        });
        res.status(201).json(goal);
    } catch (error) {
        console.error("Error creating savings goal:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// PUT /:id  — Update a savings goal
savingsGoalsRouter.put("/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
        const id = Number(req.params.id);
        const parse = goalSchema.safeParse(req.body);
        if (!parse.success) return res.status(400).json({ error: "Invalid payload", details: parse.error.flatten() });

        const data = parse.data;
        const updated = await prisma.savingsGoal.updateMany({
            where: { id, userId: req.userId! },
            data: {
                name: data.name,
                targetAmount: data.targetAmount,
                currentAmount: data.currentAmount ?? 0,
                deadline: data.deadline ? new Date(data.deadline) : null,
                icon: data.icon ?? null,
                color: data.color ?? null,
            },
        });
        if (updated.count === 0) return res.status(404).json({ error: "Not found" });

        const goal = await prisma.savingsGoal.findUnique({ where: { id } });
        res.json(goal);
    } catch (error) {
        console.error("Error updating savings goal:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /:id  — Delete a savings goal
savingsGoalsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
        const id = Number(req.params.id);
        const del = await prisma.savingsGoal.deleteMany({ where: { id, userId: req.userId! } });
        if (del.count === 0) return res.status(404).json({ error: "Not found" });
        res.status(204).end();
    } catch (error) {
        console.error("Error deleting savings goal:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
