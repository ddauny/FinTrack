import { prisma } from '../db/prisma.js'

/**
 * Script to remove duplicate recurring transactions
 * Keeps only the first transaction for each recurring transaction + date combination
 */
async function removeDuplicates() {
  try {
    console.log('Searching for duplicate recurring transactions...')
    
    // Find all transactions with recurringTransactionId
    const recurringTxns = await prisma.transaction.findMany({
      where: {
        recurringTransactionId: {
          not: null
        }
      },
      orderBy: [
        { recurringTransactionId: 'asc' },
        { date: 'asc' },
        { createdAt: 'asc' } // Keep the oldest one
      ]
    })
    
    console.log(`Found ${recurringTxns.length} recurring transactions`)
    
    // Group by recurringTransactionId + date
    const seen = new Set<string>()
    const duplicateIds: number[] = []
    
    for (const txn of recurringTxns) {
      const key = `${txn.recurringTransactionId}_${txn.date.toISOString().split('T')[0]}`
      
      if (seen.has(key)) {
        // This is a duplicate
        duplicateIds.push(txn.id)
        console.log(`Found duplicate: Transaction #${txn.id} (recurring #${txn.recurringTransactionId}, date: ${txn.date.toISOString()})`)
      } else {
        seen.add(key)
      }
    }
    
    if (duplicateIds.length === 0) {
      console.log('No duplicates found!')
      return
    }
    
    console.log(`Found ${duplicateIds.length} duplicate transactions. Deleting...`)
    
    const result = await prisma.transaction.deleteMany({
      where: {
        id: {
          in: duplicateIds
        }
      }
    })
    
    console.log(`Deleted ${result.count} duplicate transactions`)
    
  } catch (error) {
    console.error('Error removing duplicates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

removeDuplicates()
