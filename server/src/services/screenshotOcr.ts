import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";

export interface OcrTransaction {
  date: string; // YYYY-MM-DD
  merchant: string;
  amount: number;
  type: "Income" | "Expense";
}

const EXTRACTION_PROMPT = `You are an assistant that extracts financial transactions from a banking or payment app screenshot.

Analyze the image and extract ALL transactions visible (there may be more than one). For each transaction provide:
- date: the transaction date in YYYY-MM-DD format. The image may show dates in DD/MM/YYYY, DD.MM.YYYY or Italian formats — convert them.
- merchant: the merchant / payee / payer name (esercente) as shown.
- amount: the transaction amount as a positive number (e.g. 12.50). If the image uses comma as decimal separator, convert to dot.
- type: "Income" if money was received (bonifico in entrata, stipendio, ricarica, rimborso, + sign, green), "Expense" if money was spent (pagamento, pos, bonifico in uscita, addebito, - sign, red). Use visual cues like +/- signs, labels, and colors — not just the numeric sign.

Return ONLY a valid JSON array of objects with exactly these keys: date, merchant, amount, type. No markdown, no explanation. If no transaction is found, return an empty array [].`;

// Model candidates in preference order; verified at runtime and cached.
// See https://ai.google.dev/gemini-api/docs/models for the current list.
const MODEL_CANDIDATES = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

let cachedModel: string | null = null;

function getClient(): GoogleGenAI {
  if (!env.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey: env.geminiApiKey });
}

async function resolveModel(ai: GoogleGenAI): Promise<string> {
  if (cachedModel) return cachedModel;
  try {
    // list available models and pick the first candidate that is available
    const pager = await ai.models.list();
    const available = new Set<string>();
    for await (const m of pager as any) {
      if (m?.name) available.add(String(m.name).replace(/^models\//, ""));
    }
    for (const c of MODEL_CANDIDATES) {
      if (available.has(c)) {
        cachedModel = c;
        return c;
      }
    }
  } catch {
    // If listing fails (permissions/network), fall back to default candidate
  }
  cachedModel = MODEL_CANDIDATES[0];
  return cachedModel;
}

function extractJsonArray(text: string): OcrTransaction[] {
  // Strip markdown fences if present
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  // Try to find the first JSON array in the text
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
 * Extract transactions from a single screenshot image buffer using Gemini Vision.
 * Throws on unrecoverable errors (missing key, network, invalid response).
 */
export async function extractTransactionsFromImage(
  buffer: Buffer,
  mimeType: string
): Promise<OcrTransaction[]> {
  const ai = getClient();
  const model = await resolveModel(ai);

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: EXTRACTION_PROMPT },
          { inlineData: { mimeType, data: buffer.toString("base64") } },
        ],
      },
    ],
    config: {
      temperature: 0.1,
      maxOutputTokens: 2048,
    },
  });

  const text = (response as any).text ?? "";
  if (!text) throw new Error("Empty response from model");
  return extractJsonArray(text);
}
