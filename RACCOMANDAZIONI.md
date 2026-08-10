# Raccomandazioni per FinTrack

Analisi del codebase (server Express/Prisma + client React) al 2026-08-05.
Ogni punto è ancorato a un file/riga concreto, non a un principio generico. Ordinate per impatto.

**Stato**: i punti 1-6 sono stati sistemati (branch `security-fixes`, mergiato in `marco`). Punto 7 sistemato. Il resto è ancora da fare.

## Sicurezza

### ✅ 1. `JWT_SECRET` ha un fallback insicuro — FIXATO
`server/src/config/env.ts:7` — `process.env.JWT_SECRET ?? "development_secret_change_me"`.
Se in produzione la variabile d'ambiente non è impostata (es. `.env.prod` incompleto), il server parte comunque firmando i token con un segreto pubblico e noto: chiunque può forgiare un JWT valido per qualsiasi `userId`.
**Fix applicato**: `env.ts` ora fa `throw` all'avvio se `NODE_ENV === "production"` e `JWT_SECRET` non è settato, invece di usare il default.

### ✅ 2. Nessun rate limiting — FIXATO
Nessuna dipendenza `express-rate-limit` o simile (`server/package.json`), nessun middleware di questo tipo in `server/src/index.ts`.
- `/api/auth/login` è quindi vulnerabile a brute-force sulle password.
- `/api/transactions/extract` (estrazione screenshot via AI, `server/src/routes/transactions.ts:694`) chiama un provider AI esterno pagato dall'utente: senza limite, un token rubato o un bug client può generare costi ripetuti in loop.
**Fix applicato**: `express-rate-limit` su `/api/auth/login` e `/api/auth/register` (10 richieste/15min per IP) e su `/api/transactions/extract` (30/ora per IP).

### ✅ 3. CORS aperto a qualunque origine — FIXATO
`server/src/index.ts:16` — `app.use(cors())` senza opzioni riflette qualsiasi `Origin`.
Con auth Bearer (non cookie) il rischio principale è mitigato, ma resta comunque un'apertura non necessaria se il frontend gira sempre da un'origine nota.
**Fix applicato**: `cors({ origin: env.clientOrigin })` quando `CLIENT_ORIGIN` è impostata nell'env; resta aperto se non impostata, per non rompere il setup dev/proxy attuale.

### ✅ 4. Nessuna revoca dei token — FIXATO
Login emette JWT con `expiresIn: "7d"` (`server/src/routes/auth.ts:57`) e non esiste alcun meccanismo di blacklist/refresh. Un token rubato resta valido fino a 7 giorni anche dopo un cambio password o un logout "sospetto".
**Fix applicato**: aggiunta colonna `User.tokenVersion` (migration `20260805150000_add_token_version`). I JWT (login e automation token) includono `tv: tokenVersion` alla firma; `requireAuth` ora fa una lookup DB e confronta `tv` con il valore corrente, invalidando ogni token già emesso quando la versione cambia. Nuovo endpoint `POST /api/settings/logout-all-devices` incrementa `tokenVersion` (bottone "Sign Out Everywhere" in Impostazioni → Profilo). **Nota**: la migration non è stata applicata a un DB reale in questa sessione (nessun Postgres raggiungibile) — va eseguita con `prisma migrate deploy` prima del deploy.

### ✅ 5. `/api/auth/forgot-password` era un placeholder che mentiva — RIMOSSO
Rispondeva sempre `{ ok: true }` senza fare nulla e non era collegato dalla UI.
**Fix applicato**: endpoint rimosso. Implementare un vero flusso di reset password richiede un provider email (SMTP/API key) che oggi non esiste nel progetto — da riprogettare insieme all'infrastruttura email quando servirà davvero.

### 6. `automationToken` — correzione: non era codice morto
Analisi iniziale sbagliata: avevo concluso che nessun middleware lo controllasse. In realtà `settings.ts:150-161` genera un JWT **senza scadenza** con lo stesso segreto e lo stesso payload `{ sub }` di un login normale — funziona già oggi passandolo come `Authorization: Bearer <token>` (vedi testo in `SettingsPage.tsx:694`), riusando lo stesso `requireAuth`. Nessuna modifica necessaria: il fix del punto 4 lo copre automaticamente (bumping `tokenVersion` invalida anche l'automation token, che va rigenerato dopo un "Sign Out Everywhere").

## Affidabilità

### ✅ 7. Nessun error handler globale + quasi nessun try/catch nelle route — FIXATO
`server/src/index.ts` non registrava middleware d'errore (`app.use((err, req, res, next) => ...)`), e questi file non contenevano un solo `try {`: `accounts.ts`, `assets.ts`, `auth.ts`, `budgets.ts`, `categories.ts`, `tags.ts`.
Express 4 (qui in uso, non Express 5) **non** cattura automaticamente le eccezioni/rejection lanciate in handler `async`. Se una query Prisma falliva (connessione persa, vincolo violato, ecc.) dentro una di queste route, la promise rejectava, nessuno la gestiva, e la richiesta restava appesa: il client vedeva la fetch bloccata fino al proprio timeout invece di un 500 pulito. Il gestore globale `process.on("unhandledRejection")` (`server/src/index.ts:11-13`) si limitava a loggare, senza mai rispondere al client.
**Fix applicato**: invece di avvolgere manualmente ogni singolo handler async in tutti i file route (~80 handler in 13 file), aggiunta la dipendenza `express-async-errors` (zero-dep, patcha `Router`/`Layer` di Express affinché ogni rejection in un handler async chiami automaticamente `next(err)`) — un solo `import "express-async-errors"` in cima a `server/src/index.ts`, prima della registrazione delle route. Aggiunto un error middleware finale in `index.ts` che logga e risponde `500 { error: "Internal server error" }`. Copre automaticamente anche le route future, senza bisogno di ricordarsi di avvolgere ogni nuovo handler. Self-check: `server/src/errorHandling.test.ts` (`npm test` in `server/`, usa `node:test`, nessuna nuova dipendenza di test).

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

1. ~~**JWT_SECRET fail-fast in produzione** (punto 1) — rischio più alto, fix di poche righe.~~ ✅ fatto
2. ~~**Error handler globale** (punto 7) — stabilità, fix concentrato.~~ ✅ fatto
3. ~~**Rate limiting su login ed extract** (punto 2) — costo/abuso.~~ ✅ fatto
4. **`.env.example`** (punto 9) — previene la causa del punto 1.
5. Il resto (test/CI) è utile ma non urgente per un'app self-hosted a uso personale/familiare.
