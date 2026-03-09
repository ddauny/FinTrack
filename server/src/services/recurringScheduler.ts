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
        // Check if a transaction already exists for this recurring transaction on this date
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            recurringTransactionId: recurring.id,
            date: recurring.nextDate
          }
        })

        if (existingTransaction) {
          console.log(`Transaction already exists for recurring #${recurring.id} on ${recurring.nextDate.toISOString()}, skipping...`)

          // Still update nextDate to avoid checking this date again
          const nextDate = calculateNextDate(recurring.nextDate, recurring.frequency)
          const shouldDeactivate = recurring.endDate && nextDate > recurring.endDate

          await prisma.recurringTransaction.update({
            where: { id: recurring.id },
            data: {
              nextDate: nextDate,
              isActive: shouldDeactivate ? false : true
            }
          })

          continue
        }

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

import Holidays from 'date-holidays';

// Initialize Italian holidays for sliding logic
const hd = new Holidays('IT');

function getNextWorkingDay(date: Date): Date {
  const next = new Date(date);
  while (true) {
    const day = next.getDay();
    const isWeekend = day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
    const isHoliday = hd.isHoliday(next);

    if (!isWeekend && !isHoliday) {
      break;
    }
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export async function processBondCoupons(testDate?: Date) {
  try {
    const nowLocal = testDate ? new Date(testDate) : new Date();
    // Use start of today local to avoid generating coupons of "today" before the start of the day
    nowLocal.setHours(0, 0, 0, 0);

    // Find all BTPs with automatic coupon generation enabled (i.e. have a linked account and category)
    const bonds = await prisma.bondData.findMany({
      where: {
        linkedAccountId: { not: null },
        linkedCategoryId: { not: null },
        purchaseDate: { not: null } // We need a start date to calculate frequencies
      },
      include: {
        couponTiers: true,
        item: {
          include: {
            group: true // Need this to find the userId
          }
        }
      }
    });

    console.log(`Processing coupons for ${bonds.length} auto-enrolled bonds...`);

    for (const bond of bonds) {
      if (!bond.purchaseDate) continue;

      const userId = bond.item.group.userId;
      const accountId = bond.linkedAccountId!;
      const categoryId = bond.linkedCategoryId!;

      const purchaseDate = new Date(bond.purchaseDate);
      const maturityDate = new Date(bond.maturityDate);
      const freqMonths = bond.couponFrequency;

      // Iteratively check every coupon date starting from [purchaseDate + freqMonths]
      let currentTheoreticalDate = new Date(purchaseDate);
      currentTheoreticalDate.setMonth(currentTheoreticalDate.getMonth() + freqMonths);

      while (currentTheoreticalDate <= maturityDate && currentTheoreticalDate <= nowLocal) {

        // 1. Calculate the actual payment date (sliding to next working day)
        const actualPaymentDate = getNextWorkingDay(currentTheoreticalDate);

        // We only generate the transaction if the *actual* payment date is in the past/today 
        if (actualPaymentDate <= nowLocal) {

          // Check if this specific coupon payment was already generated.
          // We look for a transaction with exact note match or same exact date to avoid duplicates.
          const expectedNote = `Cedola: ${bond.item.name} (${freqMonths}M)`;

          const existingTransaction = await prisma.transaction.findFirst({
            where: {
              userId,
              accountId,
              categoryId,
              date: actualPaymentDate,
              notes: expectedNote,
            }
          });

          if (!existingTransaction) {
            // Need to create it! 
            // Calculate dynamic amount based on tiers if tiered
            let activeRate = bond.couponRate || 0;

            if (bond.couponTiers && bond.couponTiers.length > 0) {
              const yearsSincePurchase = (currentTheoreticalDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
              const currentYearIndex = Math.floor(yearsSincePurchase) + 1; // 1st year is 1, 2nd year is 2...

              const matchingTier = bond.couponTiers.find(t => currentYearIndex >= t.fromYear && currentYearIndex <= t.toYear);
              if (matchingTier) {
                activeRate = matchingTier.rate;
              } else {
                // fallback to the last valid tier rate if somehow exceeded
                const sortedTiers = [...bond.couponTiers].sort((a, b) => a.toYear - b.toYear);
                activeRate = sortedTiers[sortedTiers.length - 1].rate;
              }
            }

            // Calculation formula: Nominal * Rate% * (freqMonths/12) * (1 - TaxRate%)
            const nominalValueNum = Number(bond.nominalValue);
            const activeRateNum = Number(activeRate);
            const taxRateNum = Number(bond.taxRate);

            const grossAmountUnrounded = nominalValueNum * (activeRateNum / 100) * (freqMonths / 12);
            const grossAmount = Math.round(grossAmountUnrounded * 100) / 100;
            const taxAmount = Math.round(grossAmount * (taxRateNum / 100) * 100) / 100;
            const netAmount = grossAmount - taxAmount;

            await prisma.transaction.create({
              data: {
                userId,
                accountId,
                categoryId,
                amount: netAmount,
                type: 'Income',
                notes: expectedNote,
                date: actualPaymentDate
              }
            });
            console.log(`Created bond coupon transaction for ${bond.item.name}: +€${netAmount.toFixed(2)} on ${actualPaymentDate.toISOString()}`);
          }
        }

        // Advance to next theoretical coupon date
        currentTheoreticalDate.setMonth(currentTheoreticalDate.getMonth() + freqMonths);
      }
    }
  } catch (err) {
    console.error('Error processing bond conditional coupons:', err);
  }
}

// Run once per day at midnight (or on startup if it's past midnight)
export function startRecurringScheduler() {
  // Run immediately on startup
  processRecurringTransactions()
  processBondCoupons()

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
    processBondCoupons()
    // Then every 24 hours
    setInterval(() => {
      processRecurringTransactions()
      processBondCoupons()
    }, 24 * 60 * 60 * 1000)
  }, msToMidnight)

  console.log(`Recurring transaction scheduler started. Next run at ${night.toISOString()}`)
}

