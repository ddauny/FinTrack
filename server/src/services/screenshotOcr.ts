export interface OcrTransaction {
  date: string; // YYYY-MM-DD
  merchant: string;
  amount: number;
  type: "Income" | "Expense";
}

export interface VisionProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const EXTRACTION_PROMPT = `You are an assistant that extracts financial transactions from a banking or payment app screenshot.

Analyze the image and extract ALL transactions visible (there may be more than one). For each transaction provide:
- date: the transaction date in YYYY-MM-DD format. The image may show dates in DD/MM/YYYY, DD.MM.YYYY or Italian formats — convert them.
- merchant: the merchant / payee / payer name (esercente) as shown.
- amount: the transaction amount as a positive number (e.g. 12.50). If the image uses comma as decimal separator, convert to dot.
- type: "Income" if money was received (bonifico in entrata, stipendio, ricarica, rimborso, + sign, green), "Expense" if money was spent (pagamento, pos, bonifico in uscita, addebito, - sign, red). Use visual cues like +/- signs, labels, and colors — not just the numeric sign.

Return ONLY a valid JSON array of objects with exactly these keys: date, merchant, amount, type. No markdown, no explanation. If no transaction is found, return an empty array [].`;

function chatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

// Calls any OpenAI-Chat-Completions-compatible endpoint (OpenAI itself,
// Gemini via Google's OpenAI-compat layer, or any other provider speaking
// the same format) and returns the assistant's text content.
async function callChatCompletions(
  config: VisionProviderConfig,
  content: Array<Record<string, unknown>>,
  maxTokens: number
): Promise<string> {
  const res = await fetch(chatCompletionsUrl(config.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content }],
      temperature: 0.1,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Provider request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json: any = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from model");
  return text;
}

function extractJsonArray(text: string): OcrTransaction[] {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON array found in model response");
  }
  const raw = cleaned.slice(start, end + 1);
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Model response is not an array");
  return parsed
    .map((t: any) => {
      const type = t.type === "Income" ? "Income" : "Expense";
      const amount = Number(String(t.amount).replace(/[^\d.,-]/g, "").replace(",", "."));
      return {
        date: String(t.date ?? "").slice(0, 10),
        merchant: String(t.merchant ?? "").trim(),
        amount: Math.abs(isNaN(amount) ? 0 : amount),
        type,
      } as OcrTransaction;
    })
    .filter((t) => t.date && t.merchant && t.amount > 0);
}

/**
 * Extract transactions from a single screenshot image buffer using the
 * given provider config. Throws on unrecoverable errors (bad key, network,
 * invalid response).
 */
export async function extractTransactionsFromImage(
  buffer: Buffer,
  mimeType: string,
  config: VisionProviderConfig
): Promise<OcrTransaction[]> {
  const text = await callChatCompletions(
    config,
    [
      { type: "text", text: EXTRACTION_PROMPT },
      { type: "image_url", image_url: { url: `data:${mimeType};base64,${buffer.toString("base64")}` } },
    ],
    2048
  );
  return extractJsonArray(text);
}

/**
 * Verifies that baseUrl + apiKey + model actually work together, with a
 * minimal text-only request. Used by the Settings "save" flow before
 * persisting a user's provider config.
 */
export async function validateProviderConfig(
  config: VisionProviderConfig
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await callChatCompletions(config, [{ type: "text", text: "Reply with the single word: ok" }], 5);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Validation request failed" };
  }
}
