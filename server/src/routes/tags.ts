import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { z } from "zod";

export const tagsRouter = Router();

const tagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
});

// List all tags for current user
tagsRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  const tags = await prisma.tag.findMany({
    where: { userId: req.userId! },
    orderBy: { name: "asc" },
  });
  res.json(tags);
});

// Create a new tag
tagsRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  const parse = tagSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload", details: parse.error });

  const { name, color } = parse.data;
  const userId = req.userId!;

  // Check for duplicates
  const existing = await prisma.tag.findUnique({
    where: { userId_name: { userId, name } },
  });
  if (existing) return res.status(409).json({ error: "Tag already exists" });

  const tag = await prisma.tag.create({
    data: { userId, name, color },
  });
  res.status(201).json(tag);
});

// Update a tag
tagsRouter.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parse = tagSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload", details: parse.error });

  const existing = await prisma.tag.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) return res.status(404).json({ error: "Tag not found" });

  const tag = await prisma.tag.update({
    where: { id },
    data: { name: parse.data.name, color: parse.data.color },
  });
  res.json(tag);
});

// Delete a tag
tagsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const del = await prisma.tag.deleteMany({ where: { id, userId: req.userId! } });
  if (del.count === 0) return res.status(404).json({ error: "Tag not found" });
  res.status(204).end();
});
