# Per-user AI provider key for screenshot import

## Context

The screenshot-import feature (merged into `marco`) currently calls Google Gemini using a single instance-wide `GEMINI_API_KEY` read from server env. Every user of the app shares the owner's key and consumes the owner's billing quota with no visibility or control. This spec replaces that with a per-user, encrypted, provider-agnostic configuration: each user brings their own API key (any OpenAI-compatible vision provider), managed from Settings, and the screenshot-import endpoint refuses to run for a user who hasn't configured one — no silent fallback to a shared key.

## Data model

Add four nullable columns directly to `User` (`server/prisma/schema.prisma`), mirroring the existing `automationToken` pattern of storing a per-user secret directly on the user row rather than a separate table:

```prisma
model User {
  ...
  screenshotAiProvider     String?  // free-form label, e.g. "Gemini", "OpenAI", "Custom"
  screenshotAiBaseUrl      String?  // e.g. https://generativelanguage.googleapis.com/v1beta/openai
  screenshotAiModel        String?  // e.g. "gemini-2.5-flash"
  screenshotAiKeyEncrypted String?  // ciphertext only, never returned in plaintext via any API
}
```

Standard Prisma migration (`prisma migrate dev --name add_screenshot_ai_config`). All columns nullable — no impact on existing users or other features.

Naming is deliberately scoped to this one use case (`screenshotAi*`), not a generic "AI config" — no other feature needs this today, so we don't generalize ahead of need.

## Encryption at rest

New file `server/src/utils/crypto.ts`:
- `encryptSecret(plaintext: string): string` and `decryptSecret(ciphertext: string): string`
- AES-256-GCM via Node's built-in `crypto` module (no new dependency)
- Random IV per encryption call; stored format is `base64(iv):base64(authTag):base64(ciphertext)`
- Symmetric key comes from a new required env var `ENCRYPTION_KEY` (32 raw bytes, base64-encoded — generated via `openssl rand -base64 32`)

`ENCRYPTION_KEY` is added to `server/src/config/env.ts`, `.env.dev`, `.env.prod`, and documented in the README with the generation command. If `ENCRYPTION_KEY` is missing, the app still starts, but any endpoint that would encrypt/decrypt a `screenshotAi*` secret responds `503` (same pattern as the old `geminiApiKey`-missing behavior) — the feature is inert rather than the app refusing to boot.

## Generic vision adapter

`server/src/services/screenshotOcr.ts` is rewritten to drop the `@google/genai` SDK entirely and call any OpenAI-Chat-Completions-compatible endpoint via native `fetch`:

```
POST {baseUrl}/chat/completions
Authorization: Bearer {apiKey}
Content-Type: application/json

{
  "model": model,
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": EXTRACTION_PROMPT },
      { "type": "image_url", "image_url": { "url": "data:{mimeType};base64,{...}" } }
    ]
  }],
  "temperature": 0.1,
  "max_tokens": 2048
}
```

The response's `choices[0].message.content` is fed into the existing `extractJsonArray()` parser, which is already provider-agnostic and needs no changes. This works unmodified for:
- **OpenAI** — native format, `https://api.openai.com/v1`
- **Gemini** — via Google's OpenAI-compatibility endpoint, `https://generativelanguage.googleapis.com/v1beta/openai`
- Any other provider (self-hosted, OpenRouter, Groq, etc.) that speaks the same Chat Completions format

`extractTransactionsFromImage(buffer, mimeType, config: { baseUrl, apiKey, model })` replaces the old signature that only took `(buffer, mimeType)` and read the key from env. The old `resolveModel`/`MODEL_CANDIDATES`/`cachedModel` runtime model-discovery logic is deleted — the model string now comes directly from the user's saved config, not auto-resolved.

A second exported function, `validateProviderConfig({ baseUrl, apiKey, model }): Promise<{ ok: true } | { ok: false, message: string }>`, makes the same call with a minimal text-only prompt and small `max_tokens`, used to verify credentials before saving.

## Settings: API

`server/src/routes/settings.ts` gains three endpoints, all `requireAuth`:

- `GET /api/settings/ai-provider` → `{ provider: string|null, baseUrl: string|null, model: string|null, configured: boolean }`. `configured` is true only when baseUrl, model, and the encrypted key are all present. The plaintext key is **never** returned by this or any other endpoint.
- `PUT /api/settings/ai-provider` → body `{ provider: string, baseUrl: string (url), model: string (min 1), apiKey: string (min 1) }`. Calls `validateProviderConfig()` with the plaintext key first; on failure returns `400 { error: string }` without saving anything; on success, encrypts the key via `encryptSecret()` and persists all four fields, then returns the same shape as GET (no key).
- `DELETE /api/settings/ai-provider` → clears all four fs fields to `null`, returns `{ configured: false }`.

If `ENCRYPTION_KEY` is not configured server-side, all three respond `503`.

## Settings: UI

`client/src/pages/SettingsPage.tsx` gains a new card, "Import da Screenshot (AI)", visually consistent with the existing "Automation & Integration" section.

- **Not configured / editing state**: a preset selector (Gemini / OpenAI / Custom) that prefills Base URL + Model on selection (still editable), a password-style API Key input, and a "Salva e verifica" button that calls `PUT` and shows a loading state during the validation round-trip. Inline error message on `400`.
- **Configured state**: shows the provider label + model, with "Modifica" (re-opens the edit form) and "Rimuovi" (calls `DELETE`) actions.

Presets (client-side only, just prefill defaults — the backend treats `provider` as an opaque label and doesn't branch on it):
- **Gemini**: `baseUrl = https://generativelanguage.googleapis.com/v1beta/openai`, `model = gemini-2.5-flash`
- **OpenAI**: `baseUrl = https://api.openai.com/v1`, `model = gpt-4o-mini`
- **Custom**: all fields blank

New client additions:
- `client/src/lib/api.ts`: `settings.getAiProviderConfig()`, `settings.saveAiProviderConfig(payload)`, `settings.deleteAiProviderConfig()`
- `client/src/types/index.ts`: `AiProviderConfig { provider: string | null; baseUrl: string | null; model: string | null; configured: boolean }`

## Transactions route changes

`server/src/routes/transactions.ts`, `POST /extract`:
- Removes the old `if (!env.geminiApiKey) return res.status(503)...` instance-wide gate.
- Looks up the authenticated user's `screenshotAiBaseUrl`, `screenshotAiModel`, `screenshotAiKeyEncrypted`. If any is missing, responds `400 { error: "AI_NOT_CONFIGURED", message: "Configura la tua chiave AI nelle Impostazioni per usare l'import da screenshot." }` — no fallback to any shared/instance key.
- Otherwise decrypts the key via `decryptSecret()` and passes `{ baseUrl, apiKey, model }` into `extractTransactionsFromImage()` for each uploaded file.

`POST /bulk-import` is unaffected — it never touched the AI key.

## Frontend gating

`client/src/components/ImportScreenshotsModal.tsx` reuses its existing `handleExtract()` catch block: when the `/extract` response has `error === "AI_NOT_CONFIGURED"`, the modal shows a dedicated message with a link/button to Settings instead of the generic "Extraction failed: ..." text. No extra pre-check API call before opening the modal — the existing error-handling path is sufficient and keeps the change small.

## Cleanup

- Remove `geminiApiKey` from `server/src/config/env.ts` (superseded by per-user keys).
- Remove `@google/genai` from `server/package.json` and the lockfile (`npm uninstall @google/genai`) — no longer used now that the adapter is a plain `fetch` call.
- Update README and `.env.dev`/`.env.prod` documentation: drop `GEMINI_API_KEY`, document the new required `ENCRYPTION_KEY` and the fact that each user configures their own key from Settings.

## Testing / verification

- `tsc --noEmit` on the server — confirm no error and no lingering references to `env.geminiApiKey`.
- `npm run build` on the client.
- Manual: in Settings, add a key (Gemini or OpenAI preset) — confirm an invalid key is rejected at save time with a clear message, and a valid key saves successfully.
- Manual: run the full screenshot-import flow end-to-end using the newly configured per-user key.
- Manual: as a user with no key configured, confirm attempting an import shows the blocking "configure your key" message rather than a raw error.
