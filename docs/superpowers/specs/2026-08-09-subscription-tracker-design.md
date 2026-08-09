# Subscription tracker page

## Context

`RecurringTransaction` (`server/prisma/schema.prisma:127`) already has full CRUD (`server/src/routes/recurringTransactions.ts`): list, create, patch (`isActive`, `endDate`, `categoryId`), delete. `nextDate` is kept current by `processRecurringTransactions()` (`server/src/services/recurringScheduler.ts`). The only way to see them today is indirectly, as a badge on individual generated transactions in `TransactionsPage.tsx` — there is no place to see all recurring expenses at a glance, know the total monthly outflow, or manage (pause/resume/delete) a series without hunting down one of its generated transactions.

This spec adds a dedicated, frontend-only **Subscriptions** page: a filtered, aggregated view over the existing `RecurringTransaction` data. No backend changes, no schema changes — everything needed (list/patch/delete, plus category and account lookups for display) already exists.

## Scope decisions

- **What counts as a "subscription"**: any `RecurringTransaction` with `type === 'Expense'`. Confirmed with the user that this deliberately also includes non-"subscription" fixed costs (rent, loan payments) rather than adding an `isSubscription` field — no schema change, accepted trade-off.
- **Actions available on this page**: view, pause/resume (`isActive` toggle), delete. Creating a new recurring transaction stays where it already lives (the "Recurring Transaction" toggle in `TransactionsPage.tsx`'s add/edit form) — not duplicated here.
- **Paused items**: shown in a separate collapsible "In pausa" section with a Reactivate action. Without this, pausing a subscription from this page would be a dead end — nothing else in the app surfaces or reactivates paused recurring transactions.
- **Navigation**: new standalone top-level route `/subscriptions`, with its own `TopNav` entry (desktop + mobile), matching how Transactions/Assets/Forecast are surfaced — not folded into an existing page as a tab.

## Data flow

On mount, `SubscriptionsPage` fetches in parallel:
- `api.recurringTransactions.list()` — existing endpoint, unfiltered
- `api.categories.list()` — to resolve `categoryId → { name, color }`
- `api.accounts.list()` — to resolve `accountId → name`

Client-side filter: `type === 'Expense'`, split into `active = isActive === true` and `paused = isActive === false`. `active` sorted by `nextDate` ascending (soonest charge first).

Category/account maps are built the same way `SettingsPage.tsx` already does it (`Record<number, Category>` keyed by id) — no new pattern introduced.

## Monthly-equivalent normalization

A recurring expense's `amount` is only comparable across rows once normalized to a monthly figure. New pure function, `client/src/lib/subscriptions.ts`:

```ts
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

The page header shows the sum of `monthlyEquivalent(...)` over `active` only, wrapped in `PrivacyNumber` (existing component, same hide-numbers behavior as the rest of the app).

Extracted as a standalone exported function (rather than inlined in the component) specifically so it stays unit-testable later without restructuring — the one piece of real logic on this page.

## Page layout

`client/src/pages/SubscriptionsPage.tsx`, following the visual language and prop threading (`dark`, `hideNumbers`) already used by `ForecastPage.tsx`'s tabs (e.g. `SavingsGoalsTab`):

```
Subscriptions
─────────────────────────────────────────
 Totale mensile equivalente: € 87,40
─────────────────────────────────────────
 Attivi (3)
 Netflix          € 12,99 / mese   pross. 14 set   [Pausa]    [Elimina]
 Affitto          € 800,00 / mese  pross. 1 set     [Pausa]    [Elimina]
 Assicurazione    € 240,00 / anno  pross. 3 gen     [Pausa]    [Elimina]

 ▸ In pausa (1)
 Spotify          € 9,99 / mese                     [Riattiva] [Elimina]
```

Row fields: label (`notes` if set, else category name — mirrors how `TransactionsPage` already falls back), category name (small badge, using category color), account name, `amount` + human frequency label, `nextDate` (formatted `dd MMM`; omitted for paused rows since it's stale), monthly-equivalent contribution (active rows only), action buttons.

Empty state (no active or paused Expense recurring transactions at all): message + link to `/transactions` to create the first one — reuses the existing `EmptyState` pattern (each page currently defines its own small `EmptyState`/`LoadingSpinner`; this page follows the same per-page convention rather than extracting a shared component, consistent with the current codebase).

## Interactions

- **Pausa** → `api.recurringTransactions.update(id, { isActive: false })`, then refetch list.
- **Riattiva** → `api.recurringTransactions.update(id, { isActive: true })`, then refetch list.
- **Elimina** → native `confirm()` guard (matches `SavingsGoalsTab.handleDelete`), then `api.recurringTransactions.remove(id)`, then refetch list.
- Fetch/mutation errors: logged via `.catch(console.error)`, no dedicated error banner — matches the existing tabs' error handling level (`SavingsGoalsTab`, etc.); no evidence in the codebase that a heavier pattern is expected for a view of this kind.

## Testing

The client has no test framework installed today (tracked separately, `RACCOMANDAZIONI.md` point 8, out of scope here). `monthlyEquivalent()` is extracted as a pure, exported function specifically so it's trivial to unit-test once a runner exists — no test is added now. Verification for this change is manual: run the dev server, seed/create a few recurring expenses with different frequencies, confirm the monthly total, next-date sort, pause/reactivate/delete flows, and the empty state, in both light/dark and hide-numbers modes.

## Out of scope

- Editing amount/frequency/category/account of an existing recurring transaction from this page (today's `PATCH` only supports `isActive`, `endDate`, `categoryId`; broader editing would need a new endpoint — not requested).
- Any `isSubscription` distinction from other fixed recurring costs (rent, loans) — explicitly deferred, see Scope decisions.
- Multi-currency normalization — no `currency` field exists anywhere in the schema.
