import { prisma } from '../db/prisma.js'

// Calculate next date based on frequency
function calculateNextDate(currentDate: Date, frequency: string): Date {
  const next = new Date(currentDate)
  
  switch (frequency) {
    case 'WEEKLY':
      next.setDate(next.getDate() + 7)
      break
    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14)
      break
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1)
      break
    case 'BIMONTHLY':
      next.setMonth(next.getMonth() + 2)
      break
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3)
      break
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1)
      break
    default:
      throw new Error(`Unknown frequency: ${frequency}`)
  }
  
  return next
}

export async function processRecurringTransactions() {
  try {
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Start of today
    
    // Find all recurring transactions that are due
    const dueRecurring = await prisma.recurringTransaction.findMany({
      where: {
        isActive: true,
        nextDate: {
          lte: now
        },
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      }
    })
    
    console.log(`Processing ${dueRecurring.length} recurring transactions...`)
    
    for (const recurring of dueRecurring) {
      try {
        // Create the transaction
        await prisma.transaction.create({
          data: {
            userId: recurring.userId,
            accountId: recurring.accountId,
            categoryId: recurring.categoryId,
            amount: recurring.amount,
            type: recurring.type,
            notes: recurring.notes,
            date: recurring.nextDate,
            recurringTransactionId: recurring.id
          }
        })
        
        // Calculate next occurrence
        const nextDate = calculateNextDate(recurring.nextDate, recurring.frequency)
        
        // Check if we should deactivate (past end date)
        const shouldDeactivate = recurring.endDate && nextDate > recurring.endDate
        
        // Update the recurring transaction
        await prisma.recurringTransaction.update({
          where: { id: recurring.id },
          data: {
            nextDate: nextDate,
            isActive: shouldDeactivate ? false : true
          }
        })
        
        console.log(`Created transaction for recurring #${recurring.id}, next: ${nextDate.toISOString()}`)
      } catch (error) {
        console.error(`Error processing recurring transaction #${recurring.id}:`, error)
      }
    }
    
    console.log('Recurring transactions processing complete')
  } catch (error) {
    console.error('Error in processRecurringTransactions:', error)
  }
}

// Run once per day at midnight (or on startup if it's past midnight)
export function startRecurringScheduler() {
  // Run immediately on startup
  processRecurringTransactions()
  
  // Then run daily at midnight
  const now = new Date()
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // Tomorrow
    0, 0, 0 // Midnight
  )
  const msToMidnight = night.getTime() - now.getTime()
  
  setTimeout(() => {
    processRecurringTransactions()
    // Then every 24 hours
    setInterval(processRecurringTransactions, 24 * 60 * 60 * 1000)
  }, msToMidnight)
  
  console.log(`Recurring transaction scheduler started. Next run at ${night.toISOString()}`)
}
