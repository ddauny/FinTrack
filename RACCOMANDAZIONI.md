# Raccomandazioni per FinTrack

Analisi del codebase (server Express/Prisma + client React) al 2026-08-05.
Ogni punto è ancorato a un file/riga concreto, non a un principio generico. Ordinate per impatto.

## Sicurezza

### 1. `JWT_SECRET` ha un fallback insicuro
`server/src/config/env.ts:7` — `process.env.JWT_SECRET ?? "development_secret_change_me"`.
Se in produzione la variabile d'ambiente non è impostata (es. `.env.prod` incompleto), il server parte comunque firmando i token con un segreto pubblico e noto: chiunque può forgiare un JWT valido per qualsiasi `userId`.
**Fix**: in `env.ts`, se `NODE_ENV === "production"` e `JWT_SECRET` non è settato, `throw`/`process.exit(1)` all'avvio invece di usare il default.

### 2. Nessun rate limiting
Nessuna dipendenza `express-rate-limit` o simile (`server/package.json`), nessun middleware di questo tipo in `server/src/index.ts`.
- `/api/auth/login` è quindi vulnerabile a brute-force sulle password.
- `/api/transactions/extract` (estrazione screenshot via AI, `server/src/routes/transactions.ts:694`) chiama un provider AI esterno pagato dall'utente: senza limite, un token rubato o un bug client può generare costi ripetuti in loop.
**Fix**: `express-rate-limit` (già ottima per la ladder "dipendenza minima") su `/api/auth/*` (es. 5 tentativi/15min per IP) e su `/api/transactions/extract`.

### 3. CORS aperto a qualunque origine
`server/src/index.ts:16` — `app.use(cors())` senza opzioni riflette qualsiasi `Origin`.
Con auth Bearer (non cookie) il rischio principale è mitigato, ma resta comunque un'apertura non necessaria se il frontend gira sempre da un'origine nota.
**Fix**: `cors({ origin: env.clientOrigin })` con `CLIENT_ORIGIN` da env.

### 4. Nessuna revoca dei token
Login emette JWT con `expiresIn: "7d"` (`server/src/routes/auth.ts:57`) e non esiste alcun meccanismo di blacklist/refresh. Un token rubato resta valido fino a 7 giorni anche dopo un cambio password o un logout "sospetto".
**Fix minimo**: se in futuro aggiungi cambio-password, invalidare i token esistenti (es. `tokenVersion` incrementale sull'utente, controllato in `requireAuth`). Non necessario oggi se il rischio è accettato per un'app self-hosted mono-utente per account.

### 5. `/api/auth/forgot-password` è un placeholder che mente
`server/src/routes/auth.ts:61-64` risponde sempre `{ ok: true }` senza fare nulla. Non è collegato dalla UI (nessun riferimento in `client/src`), quindi oggi è solo codice morto che, se mai esposto in UI, darebbe un falso senso di sicurezza ("email di reset inviata" quando non lo è).
**Fix**: implementare il flusso reale (invio email con token one-time) oppure rimuovere l'endpoint finché non serve.

### 6. `automationToken` è generato ma non usato per autenticare
`server/src/routes/settings.ts` genera e salva un `automationToken` per utente (per iPhone Shortcuts), ma nessun middleware lo controlla come credenziale alternativa a `requireAuth` — ho cercato ogni riferimento (`x-automation-token` ecc.) e non ne esiste uno lato server.
**Fix**: se la feature "Shortcuts/automazione" serve davvero, aggiungi in `requireAuth` (o in un middleware dedicato) il controllo di un header tipo `X-Automation-Token` contro il valore salvato. Altrimenti è un campo DB morto da rimuovere.

## Affidabilità

### 7. Nessun error handler globale + quasi nessun try/catch nelle route
`server/src/index.ts` non registra middleware d'errore (`app.use((err, req, res, next) => ...)`), e questi file non contengono un solo `try {`: `accounts.ts`, `assets.ts`, `auth.ts`, `budgets.ts`, `categories.ts`, `tags.ts`.
Express 4 (qui in uso, non Express 5) **non** cattura automaticamente le eccezioni/rejection lanciate in handler `async`. Se una query Prisma fallisce (connessione persa, vincolo violato, ecc.) dentro una di queste route, la promise rejecta, nessuno la gestisce, e la richiesta resta appesa: il client vede la fetch bloccata fino al proprio timeout invece di un 500 pulito. Il gestore globale `process.on("unhandledRejection")` (`server/src/index.ts:8-10`) si limita a loggare, non risponde mai al client.
**Fix**: un wrapper `asyncHandler(fn)` che fa `.catch(next)` intorno a ogni handler async, più un error middleware finale in `index.ts` che risponde `500 { error }`. Una modifica in un solo posto (il wrapper) copre tutte le route, coerente con "fix una volta dove passano tutti i chiamanti".

## Test & CI

### 8. Zero test automatici, zero CI
Nessun file `*.test.ts`/`*.spec.ts` nel repo, nessuna dipendenza di test (`vitest`/`jest`) in nessuno dei tre `package.json`, nessuna cartella `.github/workflows`. `server/package.json:11` ha letteralmente `"lint": "echo 'No linter configured'"`.
Per un'app che fa calcoli su denaro (forecast, dashboard summary, budget), un refactor può silenziosamente rompere un calcolo senza che nessuno se ne accorga fino a quando l'utente non nota un saldo sbagliato.
**Fix minimo, non uno scaffolding completo**: `vitest` (zero-config, già compatibile con Vite lato client) con una manciata di test mirati sui punti a più rischio — `server/src/services` per i calcoli di forecast/net worth, e i controlli di autenticazione. Una GitHub Action che fa `tsc --noEmit` su client e server ad ogni push è quasi gratis e avrebbe intercettato regressioni di tipo prima ancora dei test.

## DevOps

### 9. Nessun `.env.example`
Solo `.env.dev` (non versionato, giustamente) esiste. Le variabili richieste (`PORT`, `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, ecc.) sono documentate solo a frammenti nel README e nel codice.
**Fix**: un `.env.example` con le chiavi e un commento su ciascuna — riduce il rischio di partire in prod senza `JWT_SECRET`/`ENCRYPTION_KEY` (vedi punto 1).

---

## Priorità consigliata

1. **JWT_SECRET fail-fast in produzione** (punto 1) — rischio più alto, fix di poche righe.
2. **Error handler globale + asyncHandler** (punto 7) — stabilità, fix concentrato.
3. **Rate limiting su login ed extract** (punto 2) — costo/abuso.
4. **`.env.example`** (punto 9) — previene la causa del punto 1.
5. Il resto (CORS, forgot-password, automationToken, test/CI) è utile ma non urgente per un'app self-hosted a uso personale/familiare.
