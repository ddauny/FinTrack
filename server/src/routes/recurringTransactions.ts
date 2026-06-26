import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db/prisma.js'
import { requireAuth, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get all recurring transactions for user
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const recurring = await prisma.recurringTransaction.findMany({
      where: { userId: req.userId! },
      orderBy: [
        { nextDate: 'asc' },
        { isActive: 'desc' },
        { createdAt: 'asc' }
      ]
    })
    res.json(recurring)
  } catch (error) {
    console.error('Error fetching recurring transactions:', error)
    res.status(500).json({ error: 'Failed to fetch recurring transactions' })
  }
})

// Create recurring transaction
const createSchema = z.object({
  accountId: z.number(),
  categoryId: z.number(),
  amount: z.number(),
  type: z.enum(['Income', 'Expense', 'Transfer']),
  notes: z.string().optional(),
  assetItemId: z.number().int().optional().nullable(),
  frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'YEARLY', 'SEMIANNUAL']),
  startDate: z.string(), // ISO date string
  endDate: z.string().optional() // ISO date string
})

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = createSchema.parse(req.body)
    const startDate = new Date(data.startDate)

    const recurring = await prisma.recurringTransaction.create({
      data: {
        userId: req.userId!,
        accountId: data.accountId,
        categoryId: data.categoryId,
        amount: data.amount,
        type: data.type,
        notes: data.notes,
        assetItemId: data.assetItemId,
        frequency: data.frequency,
        startDate: startDate,
        nextDate: startDate,
        endDate: data.endDate ? new Date(data.endDate) : null
      }
    })
    res.json(recurring)
  } catch (error) {
    console.error('Error creating recurring transaction:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid recurring transaction payload',
        details: error.flatten()
      })
    }
    res.status(500).json({ error: 'Failed to create recurring transaction' })
  }
})

// Update recurring transaction (mainly for deactivating)
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id)
    const { isActive, endDate, categoryId } = req.body
    
    // Verify ownership
    const existing = await prisma.recurringTransaction.findFirst({
      where: { id, userId: req.userId! }
    })
    
    if (!existing) {
      return res.status(404).json({ error: 'Recurring transaction not found' })
    }
    
    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.recurringTransaction.update({
        where: { id },
        data: {
          isActive: isActive !== undefined ? isActive : undefined,
          endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
          categoryId: categoryId !== undefined ? categoryId : undefined,
          amount: req.body.amount !== undefined ? req.body.amount : undefined,
          frequency: req.body.frequency !== undefined ? req.body.frequency : undefined,
          notes: req.body.notes !== undefined ? req.body.notes : undefined,
          assetItemId: req.body.assetItemId !== undefined ? req.body.assetItemId : undefined,
          nextDate: req.body.nextDate ? new Date(req.body.nextDate) : undefined
        }
      })

      if (req.body.assetItemId !== undefined) {
        await tx.transaction.updateMany({
          where: { recurringTransactionId: id },
          data: { assetItemId: req.body.assetItemId }
        })
      }

      return rec;
    })

    res.json(updated)
  } catch (error) {
    console.error('Error updating recurring transaction:', error)
    res.status(500).json({ error: 'Failed to update recurring transaction' })
  }
})

// Delete recurring transaction
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id)
    
    // Verify ownership
    const existing = await prisma.recurringTransaction.findFirst({
      where: { id, userId: req.userId! }
    })
    
    if (!existing) {
      return res.status(404).json({ error: 'Recurring transaction not found' })
    }
    
    await prisma.recurringTransaction.delete({ where: { id } })
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting recurring transaction:', error)
    res.status(500).json({ error: 'Failed to delete recurring transaction' })
  }
})

export default router
