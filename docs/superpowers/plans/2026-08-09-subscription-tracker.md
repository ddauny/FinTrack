# Subscription Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/subscriptions` page that lists active/paused recurring expenses with a total monthly-equivalent cost, and lets the user pause, reactivate, or delete them.

**Architecture:** Frontend-only. A new pure helper module normalizes recurring-expense amounts to a monthly figure; a new page component fetches the existing `/api/recurring-transactions`, `/api/categories`, `/api/accounts` endpoints, filters/sorts/groups client-side, and reuses the existing `update`/`remove` calls for pause/reactivate/delete. Routing and nav are wired last so the page is reachable and QA-able.

**Tech Stack:** React 18 + TypeScript (client), existing `api` client in `client/src/lib/api.ts`, Tailwind CSS. No new dependencies, no backend changes, no schema changes.

## Global Constraints

- No backend/schema changes — `server/src/routes/recurringTransactions.ts` already supports everything needed (list, patch `isActive`, delete).
- `Category` has no `color` field (`server/prisma/schema.prisma:82-91`) — category display is plain text, not a colored badge.
- No new npm dependencies in either `client` or `server`.
- Client has no test framework installed — verification is `tsc --noEmit` for type safety plus manual browser QA (per spec's Testing section), not an automated test suite.
- UI copy in English, matching the rest of the app (see `TransactionsPage.tsx`'s existing frequency labels: "Weekly", "Every 2 weeks", "Monthly", "Every 2 months", "Quarterly", "Yearly").
- Reuse existing formatters (`formatEUR`, `formatDateDMY` from `client/src/lib/format.ts`) and the existing `PrivacyNumber` component (`client/src/components/PrivacyNumber.tsx`) — do not invent new ones.

---

### Task 1: Monthly-equivalent helper module

**Files:**
- Create: `client/src/lib/subscriptions.ts`

**Interfaces:**
- Produces: `monthlyEquivalent(amount: number, frequency: string): number` and `FREQUENCY_LABELS: Record<string, string>`, both consumed by Task 2.

- [ ] **Step 1: Write the helper module**

```ts
// client/src/lib/subscriptions.ts

export const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Every 2 weeks',
  MONTHLY: 'Monthly',
  BIMONTHLY: 'Every 2 months',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
}

export function monthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case 'WEEKLY': return amount * 52 / 12
    case 'BIWEEKLY': return amount * 26 / 12
    case 'MONTHLY': return amount
    case 'BIMONTHLY': return amount / 2
    case 'QUARTERLY': return amount / 3
    case 'YEARLY': return amount / 12
    default: return amount
  }
}
```

- [ ] **Step 2: Sanity-check the logic with a throwaway script (no test framework installed — see Global Constraints)**

Run:

```bash
node -e "
function monthlyEquivalent(amount, frequency) {
  switch (frequency) {
    case 'WEEKLY': return amount * 52 / 12
    case 'BIWEEKLY': return amount * 26 / 12
    case 'MONTHLY': return amount
    case 'BIMONTHLY': return amount / 2
    case 'QUARTERLY': return amount / 3
    case 'YEARLY': return amount / 12
    default: return amount
  }
}
const cases = [
  [monthlyEquivalent(12, 'MONTHLY'), 12],
  [monthlyEquivalent(120, 'YEARLY'), 10],
  [monthlyEquivalent(30, 'QUARTERLY'), 10],
  [monthlyEquivalent(20, 'BIMONTHLY'), 10],
  [monthlyEquivalent(10, 'WEEKLY'), 10 * 52 / 12],
  [monthlyEquivalent(10, 'BIWEEKLY'), 10 * 26 / 12],
]
for (const [got, want] of cases) {
  if (Math.abs(got - want) > 1e-9) throw new Error('mismatch: got ' + got + ' want ' + want)
}
console.log('OK')
"
```

Expected: prints `OK` with no thrown error.

- [ ] **Step 3: Type-check**

Run: `cd client && npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/subscriptions.ts
git commit -m "feat: add monthly-equivalent normalization helper for subscriptions"
```

---

### Task 2: Subscriptions page component

**Files:**
- Create: `client/src/pages/SubscriptionsPage.tsx`

**Interfaces:**
- Consumes: `monthlyEquivalent`, `FREQUENCY_LABELS` from `client/src/lib/subscriptions.ts` (Task 1); `api.recurringTransactions.{list,update,remove}`, `api.categories.list`, `api.accounts.list` from `client/src/lib/api.ts` (existing); `formatEUR`, `formatDateDMY` from `client/src/lib/format.ts` (existing); `PrivacyNumber` from `client/src/components/PrivacyNumber.tsx` (existing); `Account`, `Category` types from `client/src/types` (existing).
- Produces: exported `SubscriptionsPage` React component, consumed by Task 3 (routing).

- [ ] **Step 1: Write the page component**

```tsx
// client/src/pages/SubscriptionsPage.tsx
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Account, Category } from '../types'
import { formatEUR, formatDateDMY } from '../lib/format'
import { PrivacyNumber } from '@/components/PrivacyNumber'
import { monthlyEquivalent, FREQUENCY_LABELS } from '../lib/subscriptions'

interface RecurringExpense {
  id: number
  accountId: number
  categoryId: number
  amount: number | string
  type: string
  notes: string | null
  frequency: string
  nextDate: string
  isActive: boolean
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col justify-center items-center h-64 space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      <div className="text-stone-600 dark:text-stone-300 text-sm">Loading subscriptions...</div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white dark:bg-stone-800 p-12 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 text-center flex flex-col justify-center items-center">
      <div className="text-4xl mb-3">📅</div>
      <div className="text-stone-500 dark:text-stone-400 text-sm">{message}</div>
    </div>
  )
}

export function SubscriptionsPage() {
  const [items, setItems] = useState<RecurringExpense[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<number, Category>>({})
  const [accountMap, setAccountMap] = useState<Record<number, Account>>({})
  const [loading, setLoading] = useState(true)
  const [showPaused, setShowPaused] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.recurringTransactions.list(),
      api.categories.list(),
      api.accounts.list(),
    ]).then(([recurring, categories, accounts]) => {
      setItems((recurring as RecurringExpense[]).filter(r => r.type === 'Expense'))
      setCategoryMap(Object.fromEntries((categories as Category[]).map(c => [c.id, c])))
      setAccountMap(Object.fromEntries((accounts as Account[]).map(a => [a.id, a])))
    }).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handlePause = async (id: number) => {
    await api.recurringTransactions.update(id, { isActive: false })
    load()
  }
  const handleReactivate = async (id: number) => {
    await api.recurringTransactions.update(id, { isActive: true })
    load()
  }
  const handleDelete = async (id: number) => {
    if (!confirm('Delete this subscription? This cannot be undone.')) return
    await api.recurringTransactions.remove(id)
    load()
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto hide-scrollbar">
        <div className="p-3 max-w-7xl mx-auto"><LoadingSpinner /></div>
      </div>
    )
  }

  const active = [...items]
    .filter(r => r.isActive)
    .sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())
  const paused = items.filter(r => !r.isActive)

  const totalMonthly = active.reduce((sum, r) => sum + monthlyEquivalent(Number(r.amount), r.frequency), 0)

  const labelFor = (r: RecurringExpense) => r.notes || categoryMap[r.categoryId]?.name || `Subscription #${r.id}`

  return (
    <div className="h-full overflow-y-auto hide-scrollbar">
      <div className="p-3 space-y-3 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Subscriptions</h1>

        <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700">
          <div className="text-sm text-stone-500 dark:text-stone-400">Total monthly equivalent</div>
          <div className="text-2xl font-bold text-stone-900 dark:text-white">
            <PrivacyNumber value={totalMonthly}>{formatEUR(totalMonthly)}</PrivacyNumber>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">Active ({active.length})</h2>
          {active.length === 0 ? (
            <EmptyState message="No active subscriptions. Create a recurring expense from the Transactions page to see it here." />
          ) : (
            <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700">
              {active.map(r => (
                <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-stone-900 dark:text-white">{labelFor(r)}</div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      {categoryMap[r.categoryId]?.name || 'Uncategorized'} · {accountMap[r.accountId]?.name || 'Unknown account'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-stone-900 dark:text-white">
                      <PrivacyNumber value={Number(r.amount)}>{formatEUR(r.amount)}</PrivacyNumber>
                      {' '}<span className="text-xs font-normal text-stone-500 dark:text-stone-400">/ {FREQUENCY_LABELS[r.frequency] || r.frequency}</span>
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">Next: {formatDateDMY(r.nextDate)}</div>
                  </div>
                  <div className="text-right text-sm text-stone-500 dark:text-stone-400 min-w-[90px]">
                    <PrivacyNumber value={monthlyEquivalent(Number(r.amount), r.frequency)}>
                      {formatEUR(monthlyEquivalent(Number(r.amount), r.frequency))}
                    </PrivacyNumber>
                    <div className="text-xs">/mo equiv.</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handlePause(r.id)} className="px-3 py-1.5 text-xs font-medium rounded-lg text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors">Pause</button>
                    <button onClick={() => handleDelete(r.id)} className="px-3 py-1.5 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {paused.length > 0 && (
          <div className="space-y-2">
            <button onClick={() => setShowPaused(s => !s)} className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <span className={`transition-transform ${showPaused ? 'rotate-90' : ''}`}>▸</span>
              Paused ({paused.length})
            </button>
            {showPaused && (
              <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700">
                {paused.map(r => (
                  <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3 opacity-70">
                    <div>
                      <div className="font-semibold text-stone-900 dark:text-white">{labelFor(r)}</div>
                      <div className="text-xs text-stone-500 dark:text-stone-400">
                        {categoryMap[r.categoryId]?.name || 'Uncategorized'} · {accountMap[r.accountId]?.name || 'Unknown account'}
                      </div>
                    </div>
                    <div className="text-right font-semibold text-stone-900 dark:text-white">
                      <PrivacyNumber value={Number(r.amount)}>{formatEUR(r.amount)}</PrivacyNumber>
                      {' '}<span className="text-xs font-normal text-stone-500 dark:text-stone-400">/ {FREQUENCY_LABELS[r.frequency] || r.frequency}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleReactivate(r.id)} className="px-3 py-1.5 text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors">Reactivate</button>
                      <button onClick={() => handleDelete(r.id)} className="px-3 py-1.5 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

Note: the spec's mockup showed `dd MMM` date formatting; this reuses the existing `formatDateDMY` (`dd/mm/yyyy`) instead of inventing a new formatter, since that's the formatter every other list page (`TransactionsPage.tsx`) already uses for dates — smaller diff, one less formatting convention in the codebase.

- [ ] **Step 2: Type-check**

Run: `cd client && npx tsc --noEmit -p tsconfig.json`
Expected: no errors. (The component isn't reachable/renderable yet — it isn't routed until Task 3 — so this step is compile-only verification.)

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/SubscriptionsPage.tsx
git commit -m "feat: add SubscriptionsPage component"
```

---

### Task 3: Wire up routing and navigation, manual QA

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/TopNav.tsx`

**Interfaces:**
- Consumes: `SubscriptionsPage` from `client/src/pages/SubscriptionsPage.tsx` (Task 2).

- [ ] **Step 1: Add the route in `client/src/App.tsx`**

Add the import next to the other page imports:

```ts
import { ForecastPage } from './pages/ForecastPage'
import { SubscriptionsPage } from './pages/SubscriptionsPage'
```

Add the route next to `/forecast`, inside `<Routes>`:

```tsx
            <Route path="/forecast" element={<PrivateRoute><ForecastPage /></PrivateRoute>} />
            <Route path="/subscriptions" element={<PrivateRoute><SubscriptionsPage /></PrivateRoute>} />
```

- [ ] **Step 2: Add the desktop nav link in `client/src/components/TopNav.tsx`**

In the desktop nav block, add the new link right after Forecast and before Settings:

```tsx
            {link('/forecast', 'Forecast')}
            {link('/subscriptions', 'Subscriptions')}
            {link('/settings', 'Settings')}
```

- [ ] **Step 3: Add the mobile nav link in `client/src/components/TopNav.tsx`**

In the mobile menu block, add the matching link in the same position:

```tsx
              {mobileLink('/forecast', 'Forecast')}
              {mobileLink('/subscriptions', 'Subscriptions')}
              {mobileLink('/settings', 'Settings')}
```

- [ ] **Step 4: Type-check**

Run: `cd client && npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 5: Manual QA in the browser**

Start the stack (the Vite dev proxy targets the `app-dev` Docker hostname, so the plain `vite` dev server alone won't reach the API — use the documented Docker workflow):

```bash
./scripts/start-dev.sh
```

Then, at `http://localhost:5173`, log in and walk through:
1. Click "Subscriptions" in the nav (desktop and, via the hamburger menu, mobile width) — page loads without console errors.
2. If there are no `Expense`-type recurring transactions yet, create one or two from Transactions (toggle "Recurring Transaction" in the add-transaction form) with different frequencies (e.g. one `MONTHLY`, one `YEARLY`) — confirm they appear under "Active", sorted by next date ascending.
3. Confirm the "Total monthly equivalent" header matches the sum of each row's `/mo equiv.` figure.
4. Click "Pause" on one — it disappears from Active and appears under "Paused (n)" when expanded; the total updates.
5. Click "Reactivate" on the paused one — it moves back to Active.
6. Click "Delete" on one — confirm dialog appears; confirming removes it permanently.
7. Toggle "Hide numbers" (top nav eye icon) — amounts mask to `••••••` on this page too.
8. Toggle dark mode — page is legible in both themes.
9. With zero active and zero paused subscriptions, confirm the empty state renders with a sensible message.

- [ ] **Step 6: Commit**

```bash
git add client/src/App.tsx client/src/components/TopNav.tsx
git commit -m "feat: route and nav entry for Subscriptions page"
```

---

## Self-Review

**Spec coverage:**
- Data source / filter (`type === 'Expense'`, active/paused split) — Task 2, Step 1 (`load`, `active`, `paused`).
- Monthly-equivalent normalization — Task 1.
- Header total — Task 2, Step 1 (`totalMonthly`).
- Sort by `nextDate` ascending — Task 2, Step 1 (`active.sort(...)`).
- Label fallback (`notes` → category name → `Subscription #id`) — Task 2, Step 1 (`labelFor`).
- Category has no color, plain text — Task 2, Step 1 (category name rendered as plain text, no color styling).
- Paused section, collapsible, with Reactivate — Task 2, Step 1 (`showPaused` toggle + `paused.map`).
- Pause/Reactivate/Delete actions call existing endpoints, refetch after — Task 2, Step 1 (`handlePause`, `handleReactivate`, `handleDelete`).
- No create/edit UI on this page — Task 2, Step 1 (no create form; empty state links the user to Transactions conceptually via QA script, not a literal in-app link, since no such link target/component was specified beyond the message).
- Nav placement (standalone route + TopNav entry) — Task 3.
- No automated test added, pure function extracted for future testability, manual QA — Task 1 Step 2 (throwaway sanity check) + Task 3 Step 5 (manual QA).

**Placeholder scan:** No "TBD"/"TODO"/"handle edge cases" strings; every step has runnable code or an exact command.

**Type consistency:** `RecurringExpense` (Task 2) matches the fields actually returned by `GET /api/recurring-transactions` (`server/src/routes/recurringTransactions.ts`: `id, accountId, categoryId, amount, type, notes, frequency, startDate, nextDate, endDate, isActive` — `startDate`/`endDate` omitted from the local interface since unused by this page, not because they don't exist). `monthlyEquivalent(amount: number, frequency: string)` signature matches its Task 1 definition and every Task 2 call site (`Number(r.amount)` is always passed, never the raw `string | number`). `FREQUENCY_LABELS` keyed by the same six frequency strings used in `TransactionsPage.tsx`.

**One deviation from the written spec, corrected in this plan:** the spec's row mockup showed `dd MMM` dates; this plan uses the existing `formatDateDMY` (`dd/mm/yyyy`) instead, since introducing a second date-format convention for one page isn't justified — noted inline in Task 2.
