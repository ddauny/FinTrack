/**
 * Test script for bond coupon generation.
 *
 * Creates a test user, account, category, asset group+item with BondData,
 * then runs processBondCoupons() at various simulated dates
 * and verifies that coupons are generated on the correct working days.
 *
 * Usage:  npx tsx src/scripts/testBondCoupons.ts
 */

import { prisma } from '../db/prisma.js'
import { processBondCoupons } from '../services/recurringScheduler.js'
import Holidays from 'date-holidays'

const hd = new Holidays('IT')

// ─── Helpers ──────────────────────────────────────────────
function fmt(d: Date) {
  return d.toISOString().slice(0, 10)
}

function dayName(d: Date) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
}

function getNextWorkingDay(date: Date): Date {
  const next = new Date(date)
  while (true) {
    const day = next.getDay()
    const isWeekend = day === 0 || day === 6
    const isHoliday = hd.isHoliday(next)
    if (!isWeekend && !isHoliday) break
    next.setDate(next.getDate() + 1)
  }
  return next
}

// ─── Main ─────────────────────────────────────────────────
async function main() {
  console.log('=== BOND COUPON TEST ===\n')

  // 1) Cleanup previous test data
  await prisma.transaction.deleteMany({ where: { notes: { startsWith: 'Cedola: TEST-BTP' } } })
  // Delete bond + item if they exist from a previous run
  const existingItems = await prisma.assetItem.findMany({ where: { name: { startsWith: 'TEST-BTP' } } })
  for (const item of existingItems) {
    await prisma.couponTier.deleteMany({ where: { bond: { itemId: item.id } } })
    await prisma.bondData.deleteMany({ where: { itemId: item.id } })
    await prisma.assetValuation.deleteMany({ where: { itemId: item.id } })
    await prisma.assetItem.delete({ where: { id: item.id } })
  }
  await prisma.assetGroup.deleteMany({ where: { name: 'TEST-BTP-GROUP' } })
  await prisma.category.deleteMany({ where: { name: 'TEST-BTP-INCOME' } })
  await prisma.account.deleteMany({ where: { name: 'TEST-BTP-ACCOUNT' } })

  // 2) Get or create a test user
  let user = await prisma.user.findFirst()
  if (!user) {
    console.log('No user found — creating a test user...')
    user = await prisma.user.create({ data: { email: 'test@btp.it', password: 'test' } })
  }
  console.log(`Using user: ${user.email} (id=${user.id})`)

  // 3) Create test account + category
  const account = await prisma.account.create({ data: { userId: user.id, name: 'TEST-BTP-ACCOUNT', type: 'Checking' } })
  const category = await prisma.category.create({ data: { userId: user.id, name: 'TEST-BTP-INCOME', type: 'Income' } })

  // 4) Create asset group + item + bond data
  //    Purchase date: 2025-12-15 — frequency: 3 months
  //    Expected coupon dates: 2026-03-15 (Sat→Mon 2026-03-16), 2026-06-15 (Mon), 2026-09-15 (Tue), 2026-12-15 (Tue)
  const purchaseDate = new Date('2025-12-15')
  const maturityDate = new Date('2030-12-15')

  const group = await prisma.assetGroup.create({ data: { userId: user.id, name: 'TEST-BTP-GROUP' } })
  const item = await prisma.assetItem.create({
    data: {
      groupId: group.id,
      name: 'TEST-BTP Valore Dic 2030',
      bondData: {
        create: {
          isin: 'IT0000000000',
          purchaseDate,
          nominalValue: 10000,
          purchasePrice: 100,
          bankCommissions: 0,
          maturityDate,
          couponRate: 4.0,       // 4% annuo lordo
          couponFrequency: 3,    // trimestrale
          taxRate: 12.5,
          linkedAccountId: account.id,
          linkedCategoryId: category.id,
        }
      }
    },
    include: { bondData: true }
  })
  console.log(`Created bond: ${item.name}, purchase=${fmt(purchaseDate)}, freq=3M, rate=4%\n`)

  // 5) Calculate expected coupon dates
  console.log('── Expected coupon schedule ──')
  const theoreticalDates: Date[] = []
  const d = new Date(purchaseDate)
  for (let i = 0; i < 8; i++) {
    d.setMonth(d.getMonth() + 3)
    if (d > maturityDate) break
    const theoretical = new Date(d)
    const actual = getNextWorkingDay(new Date(d))
    const shifted = fmt(theoretical) !== fmt(actual)
    theoreticalDates.push(theoretical)
    const holiday = hd.isHoliday(theoretical)
    const reason = shifted
      ? `→ ${fmt(actual)} (${dayName(actual)})${holiday ? ` [festivo: ${(holiday as any)[0]?.name}]` : ` [${dayName(theoretical)}=weekend]`}`
      : `(${dayName(actual)})`
    console.log(`  ${i + 1}. Theoretical: ${fmt(theoretical)} ${reason}`)
  }

  // 6) Run processBondCoupons at various simulated dates and check results
  console.log('\n── Running coupon processor tests ──')

  // Test A: Run at 2026-03-09 — NO coupon yet (first coupon theoretical is 2026-03-15)
  await processBondCoupons(new Date('2026-03-09'))
  let txns = await prisma.transaction.findMany({ where: { notes: { startsWith: 'Cedola: TEST-BTP' } }, orderBy: { date: 'asc' } })
  console.log(`\nTest A — Run at 2026-03-09 (before first coupon):`)
  console.log(`  Transactions created: ${txns.length}`)
  assert(txns.length === 0, 'Should be 0 transactions before first coupon date')

  // Test B: Run at 2026-03-15 — Theoretical date is Saturday 2026-03-15, actual=Monday 2026-03-16
  // So even running on the 15th, since today(15th) < actual(16th), no coupon should be created yet
  await processBondCoupons(new Date('2026-03-15'))
  txns = await prisma.transaction.findMany({ where: { notes: { startsWith: 'Cedola: TEST-BTP' } }, orderBy: { date: 'asc' } })
  console.log(`\nTest B — Run at 2026-03-15 (theoretical date, but Saturday → shifted to Mon 16):`)
  console.log(`  Transactions created: ${txns.length}`)
  // The 15th is a Saturday; actual payment = Mon 16th. Running on 15th: actualPaymentDate(16) <= nowLocal(15) is false → no coupon
  assert(txns.length === 0, 'Should be 0 — actual payment date is Mon 16th, today is Sat 15th')

  // Test C: Run at 2026-03-16 — actual payment date (Monday). Should create 1 coupon.
  await processBondCoupons(new Date('2026-03-16'))
  txns = await prisma.transaction.findMany({ where: { notes: { startsWith: 'Cedola: TEST-BTP' } }, orderBy: { date: 'asc' } })
  console.log(`\nTest C — Run at 2026-03-16 (Mon, actual payment day):`)
  console.log(`  Transactions created: ${txns.length}`)
  assert(txns.length === 1, 'Should be 1 coupon on Mon 2026-03-16')
  console.log(`  Date: ${fmt(txns[0].date)} (${dayName(txns[0].date)})`)
  assert(fmt(txns[0].date) === '2026-03-16', 'Coupon date should be 2026-03-16')

  // Verify the amount: 10000 * 4% * (3/12) * (1 - 12.5%) = 10000 * 0.01 * 0.875 = 87.50
  const expectedNet = 10000 * (4 / 100) * (3 / 12) * (1 - 12.5 / 100) // = 87.50
  console.log(`  Amount: €${txns[0].amount} (expected: €${expectedNet.toFixed(2)})`)
  assert(Math.abs(txns[0].amount - expectedNet) < 0.01, `Amount should be €${expectedNet.toFixed(2)}`)

  // Test D: Run again at 2026-03-16 — should NOT create duplicates
  await processBondCoupons(new Date('2026-03-16'))
  txns = await prisma.transaction.findMany({ where: { notes: { startsWith: 'Cedola: TEST-BTP' } }, orderBy: { date: 'asc' } })
  console.log(`\nTest D — Run again at 2026-03-16 (idempotency check):`)
  console.log(`  Transactions created: ${txns.length}`)
  assert(txns.length === 1, 'Should still be 1 — no duplicates')

  // Test E: Run at 2026-06-15 — second coupon (Jun 15 is a Monday in 2026). Should create 1 more.
  await processBondCoupons(new Date('2026-06-15'))
  txns = await prisma.transaction.findMany({ where: { notes: { startsWith: 'Cedola: TEST-BTP' } }, orderBy: { date: 'asc' } })
  console.log(`\nTest E — Run at 2026-06-15 (second coupon, Mon):`)
  console.log(`  Transactions created: ${txns.length}`)
  assert(txns.length === 2, 'Should be 2 coupons total')
  console.log(`  Dates: ${txns.map(t => fmt(t.date)).join(', ')}`)

  // Test F: Run far in the future — 2027-01-01. Should generate all coupons up to that date.
  // Expected: 2026-03-16, 2026-06-15, 2026-09-15, 2026-12-15 = 4 coupons
  await processBondCoupons(new Date('2027-01-01'))
  txns = await prisma.transaction.findMany({ where: { notes: { startsWith: 'Cedola: TEST-BTP' } }, orderBy: { date: 'asc' } })
  console.log(`\nTest F — Run at 2027-01-01 (backfill all 2026 coupons):`)
  console.log(`  Transactions created: ${txns.length}`)
  console.log(`  Dates: ${txns.map(t => `${fmt(t.date)} (${dayName(t.date)})`).join(', ')}`)
  // Should be 4 quarterly coupons for 2026, plus 2027-03-15 is after 2027-01-01 so not yet
  // Actually let's check: theoretical dates from 2025-12-15 + 3M = 2026-03-15, +3M = 2026-06-15, +3M = 2026-09-15, +3M = 2026-12-15, +3M = 2027-03-15
  //   2027-03-15 > 2027-01-01 → not included. So 4 total.
  assert(txns.length === 4, 'Should be 4 coupons for all of 2026')
  // Verify all dates are working days (not weekends or holidays)
  for (const t of txns) {
    const day = t.date.getDay()
    const isHol = hd.isHoliday(t.date)
    const ok = day !== 0 && day !== 6 && !isHol
    console.log(`  ${fmt(t.date)} ${dayName(t.date)} → ${ok ? '✓ working day' : '✗ NOT a working day!'}`)
    assert(ok, `${fmt(t.date)} should be a working day`)
  }

  // 7) Test with tiered coupon rates (BTP Valore style)
  console.log('\n── Tiered coupon test ──')
  // Cleanup
  await prisma.transaction.deleteMany({ where: { notes: { startsWith: 'Cedola: TEST-BTP' } } })

  // Update the bond to use tiered rates: Year 1-2 = 3.25%, Year 3-4 = 4.0%
  await prisma.couponTier.deleteMany({ where: { bondId: item.bondData!.id } })
  await prisma.bondData.update({
    where: { id: item.bondData!.id },
    data: {
      couponRate: null,  // null when using tiers
      couponTiers: {
        create: [
          { fromYear: 1, toYear: 2, rate: 3.25 },
          { fromYear: 3, toYear: 5, rate: 4.0 },
        ]
      }
    }
  })
  console.log('Updated bond to tiered: Y1-2 → 3.25%, Y3-5 → 4.0%\n')

  // Run at 2027-01-01 — all 4 coupons in first year should use 3.25%
  await processBondCoupons(new Date('2027-01-01'))
  txns = await prisma.transaction.findMany({ where: { notes: { startsWith: 'Cedola: TEST-BTP' } }, orderBy: { date: 'asc' } })
  console.log(`Tiered test — Run at 2027-01-01:`)
  const expectedTier1Net = Math.round(10000 * (3.25 / 100) * (3 / 12) * 100) / 100 - Math.round(Math.round(10000 * (3.25 / 100) * (3 / 12) * 100) / 100 * (12.5 / 100) * 100) / 100
  for (const t of txns) {
    console.log(`  ${fmt(t.date)} (${dayName(t.date)}) → €${t.amount} ${Math.abs(t.amount - expectedTier1Net) < 0.01 ? '✓ tier 1 rate' : ''}`)
  }
  // First 4 coupons (year 1) should all have the 3.25% rate
  // Gross = 10000 * 3.25% * 3/12 = 81.25. Tax = 81.25 * 12.5% = 10.16. Net = 71.09
  const gross1 = Math.round(10000 * (3.25 / 100) * (3 / 12) * 100) / 100 // 81.25
  const tax1 = Math.round(gross1 * (12.5 / 100) * 100) / 100             // 10.16
  const net1 = gross1 - tax1                                               // 71.09
  console.log(`  Expected tier 1 net: €${net1.toFixed(2)} (gross: €${gross1}, tax: €${tax1})`)
  for (const t of txns) {
    assert(Math.abs(t.amount - net1) < 0.01, `Tier 1 amount should be €${net1.toFixed(2)}, got €${t.amount}`)
  }

  // Now run at 2028-06-01 — coupons in year 3 should use 4.0%
  await processBondCoupons(new Date('2028-06-01'))
  txns = await prisma.transaction.findMany({ where: { notes: { startsWith: 'Cedola: TEST-BTP' } }, orderBy: { date: 'asc' } })
  console.log(`\nTiered test — Run at 2028-06-01 (year 3 starts):`)
  const gross2 = Math.round(10000 * (4.0 / 100) * (3 / 12) * 100) / 100 // 100.00
  const tax2 = Math.round(gross2 * (12.5 / 100) * 100) / 100             // 12.50
  const net2 = gross2 - tax2                                               // 87.50
  console.log(`  Total transactions: ${txns.length}`)
  // Year 1: 4 coupons, Year 2: 4 coupons (still 3.25%), 
  // Year 3: coupons from Dec'27+3 = Mar'28 (4%) and Jun'28 is > Jun'01 so Mar'28 the only one in year 3 by Jun 1
  // Actually purchase=Dec15'25, theoretical dates: Mar15'26, Jun15'26, Sep15'26, Dec15'26 (Y1), 
  //   Mar15'27, Jun15'27, Sep15'27, Dec15'27 (Y2), Mar15'28 (Y3 starts), Jun15'28 would be > Jun01 → no
  // Wait: Jun15'28 > Jun01'28 → not generated. So Mar15'28 only new one.
  // Total by Jun1'28: Y1(4) + Y2(4) + Y3(1 = Mar15'28) = 9
  const tier2Txns = txns.filter(t => Math.abs(t.amount - net2) < 0.01)
  const tier1Txns = txns.filter(t => Math.abs(t.amount - net1) < 0.01)
  console.log(`  Tier 1 (3.25%) coupons: ${tier1Txns.length}`)
  console.log(`  Tier 2 (4.0%) coupons: ${tier2Txns.length}`)
  assert(tier1Txns.length === 8, 'Should have 8 coupons at 3.25% (Year 1 + Year 2)')
  assert(tier2Txns.length >= 1, 'Should have at least 1 coupon at 4.0% (Year 3)')

  // 8) Cleanup
  console.log('\n── Cleaning up test data ──')
  await prisma.transaction.deleteMany({ where: { notes: { startsWith: 'Cedola: TEST-BTP' } } })
  await prisma.couponTier.deleteMany({ where: { bondId: item.bondData!.id } })
  await prisma.bondData.deleteMany({ where: { itemId: item.id } })
  await prisma.assetValuation.deleteMany({ where: { itemId: item.id } })
  await prisma.assetItem.delete({ where: { id: item.id } })
  await prisma.assetGroup.delete({ where: { id: group.id } })
  await prisma.category.delete({ where: { id: category.id } })
  await prisma.account.delete({ where: { id: account.id } })

  console.log('\n✅ ALL TESTS PASSED!')
  process.exit(0)
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`\n❌ ASSERTION FAILED: ${msg}`)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
