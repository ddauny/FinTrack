# External Income Sources — Implementation Plan

Add a generic system that lets users configure external API endpoints to fetch projected income (e.g., tutoring earnings from a custom management tool). Values are fetched live with caching and integrated into the monthly forecast.

## User Review Required

> [!IMPORTANT]
> **Auth Type Coverage** — The plan supports: Bearer Token, API Key (header or query param), and Custom Header. If you need other auth types (e.g., Basic Auth, OAuth2), let me know.

> [!IMPORTANT]
> **Response Field** — We support dot notation (e.g., `totale_previsto`, `data.amount`) to extract the value from nested JSON. Confirm this covers your use case.

---

## Proposed Changes

### Database — Prisma Schema

#### [MODIFY] [schema.prisma](file:///data/apps/Fintrack/server/prisma/schema.prisma)

Add new `ExternalIncomeSource` model:

```prisma
model ExternalIncomeSource {
  id              Int       @id @default(autoincrement())
  userId          Int
  name            String                    // "Ripetizioni", "Freelance", etc.
  icon            String?                   // emoji
  color           String?                   // hex color
  apiUrl          String                    // full URL to call
  httpMethod      String    @default("GET") // "GET" or "POST"
  
  // Auth configuration — dynamic
  authType        String    @default("BEARER") // "BEARER" | "API_KEY_HEADER" | "API_KEY_QUERY" | "CUSTOM_HEADER" | "NONE"
  authToken       String?                   // token/key value
  authHeaderName  String?                   // custom header name (e.g. "X-Api-Key")
  authQueryParam  String?                   // query param name (e.g. "api_key")
  
  // Response parsing
  responseField   String                    // dot notation path to value (e.g. "totale_previsto")
  
  // Cache
  cacheTtlMinutes Int       @default(15)    // 5, 15, 60, 360, 1440
  lastFetchedAt   DateTime?
  lastFetchedValue Decimal?
  lastFetchError  String?                   // null = OK, else error message
  
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Add `externalIncomeSources ExternalIncomeSource[]` to the `User` model.

---

### Backend — CRUD + Proxy API

#### [NEW] [externalIncomeSources.ts](file:///data/apps/Fintrack/server/src/routes/externalIncomeSources.ts)

New Express router with the following endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all sources for user |
| `POST` | `/` | Create new source (validated with Zod) |
| `PUT` | [/:id](file:///data/apps/Fintrack/client/src/pages/SettingsPage.tsx#60-65) | Update source |
| `DELETE` | [/:id](file:///data/apps/Fintrack/client/src/pages/SettingsPage.tsx#60-65) | Delete source |
| `POST` | `/:id/test` | Test connection: calls the external API and returns `{ ok, value, error }` |
| `POST` | `/:id/refresh` | Force-refresh: fetches fresh value and updates cache |

**External API call logic** (shared helper `fetchExternalValue`):
1. Build request based on `httpMethod`, `authType`, `authToken`, etc.
2. Call external API with a **5s timeout** (to not block FinTrack)
3. Parse JSON response, extract value using `responseField` (dot notation)
4. Update `lastFetchedAt`, `lastFetchedValue`, `lastFetchError` in DB
5. Return the numeric value

---

#### [MODIFY] [index.ts (routes)](file:///data/apps/Fintrack/server/src/routes/index.ts)

Export the new `externalIncomeSourcesRouter`.

#### [MODIFY] [index.ts (server)](file:///data/apps/Fintrack/server/src/index.ts)

Register route: `app.use("/api/external-income-sources", externalIncomeSourcesRouter)`

---

### Backend — Forecast Integration

#### [MODIFY] [forecast.ts](file:///data/apps/Fintrack/server/src/routes/forecast.ts)

In the `/monthly-forecast` endpoint, after computing recurring projections:

1. Fetch all active `ExternalIncomeSource` for user
2. For each source: check if cache is still valid (`lastFetchedAt + cacheTtlMinutes > now`)
   - If **valid** → use `lastFetchedValue`
   - If **expired** → call `fetchExternalValue()`, update cache
3. Add new fields to response:
   ```json
   {
     "externalIncome": [
       { "name": "Ripetizioni", "icon": "📚", "color": "#10b981", "value": 505.0, "lastUpdated": "...", "error": null }
     ],
     "totalExternalIncome": 505.0
   }
   ```
4. Add `totalExternalIncome` to `totalIncome` and `estimatedBalance`

---

### Client — API Layer

#### [MODIFY] [api.ts](file:///data/apps/Fintrack/client/src/lib/api.ts)

Add `externalIncomeSources` namespace:

```ts
externalIncomeSources: {
  list: () => apiGet<any[]>('/api/external-income-sources'),
  create: (data: any) => apiJson<any>('/api/external-income-sources', 'POST', data),
  update: (id: number, data: any) => apiJson<any>(`/api/external-income-sources/${id}`, 'PUT', data),
  remove: (id: number) => apiJson<void>(`/api/external-income-sources/${id}`, 'DELETE'),
  test: (id: number) => apiJson<{ ok: boolean; value?: number; error?: string }>(`/api/external-income-sources/${id}/test`, 'POST', {}),
  refresh: (id: number) => apiJson<{ value: number }>(`/api/external-income-sources/${id}/refresh`, 'POST', {}),
},
```

---

### Client — Settings UI

#### [MODIFY] [SettingsPage.tsx](file:///data/apps/Fintrack/client/src/pages/SettingsPage.tsx)

Add a new **"External Income Sources"** section after the "Automation & Integration" section:

- **List view**: Cards showing each configured source with name, icon, URL (truncated), last fetched value, status badge (✅ OK / ❌ Error), and cache TTL
- **Add/Edit modal** with fields:
  - Name (text)
  - Icon (emoji picker, same style as Savings Goals)
  - Color (color picker, same style as Savings Goals)
  - API URL (text)
  - HTTP Method (select: GET / POST)
  - Auth Type (select: None / Bearer Token / API Key Header / API Key Query / Custom Header)
  - Auth Token/Key (text, shown conditionally)
  - Auth Header Name (text, shown if Custom Header or API Key Header selected)
  - Auth Query Param Name (text, shown if API Key Query selected)
  - Response Field (text, with help text explaining dot notation)
  - Cache TTL (select: 5 min / 15 min / 1 hour / 6 hours / 24 hours)
- **Test Connection** button in the modal → shows success + extracted value, or error message
- **Delete** with confirmation

---

### Client — Monthly Summary Integration

#### [MODIFY] [MonthlySummaryPage.tsx](file:///data/apps/Fintrack/client/src/pages/MonthlySummaryPage.tsx)

In the Income forecast card (the green "Actual vs Projected" card):

- Add a new row for each external source: `📡 {name}: €{value}` styled with the source's color
- Show a small "updated X min ago" badge
- If there's an error, show a ⚠️ warning icon with tooltip
- Update the "Total estimated" to include external income

---

## Verification Plan

### Browser Testing
1. **Settings CRUD**: Open Settings → External Income Sources → Add a new source → verify it appears in the list → Edit → Delete
2. **Test Connection**: Add a source with a known working URL → click "Test Connection" → verify it shows the value
3. **Monthly Summary**: Navigate to Monthly Summary → verify external income row appears in the Income card → verify total is updated
4. **Cache**: Refresh Monthly Summary within TTL → verify no new API call is made (check "last updated" time stays the same)
5. **Error handling**: Add a source with a broken URL → verify error badge appears in Settings → verify ⚠️ in Monthly Summary

### Manual Verification
- Verify the user's actual tutoring API endpoint works correctly with the configured source
