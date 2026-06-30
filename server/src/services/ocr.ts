import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ParsedTransaction {
  date: string; // YYYY-MM-DD
  amount: number;
  type: "Income" | "Expense" | "Transfer";
  notes: string;
  suggestedCategoryId?: number | null;
  suggestedAccountId?: number | null;
}

/**
 * Parses a screenshot of bank transactions using the Gemini Multimodal API.
 * This is designed as an abstraction so it can be swapped for a local service later.
 */
export async function parseScreenshot(
  fileBuffer: Buffer,
  mimeType: string,
  categories: { id: number; name: string; type: string }[],
  accounts: { id: number; name: string; type: string }[]
): Promise<ParsedTransaction[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the environment variables.");
  }

  // Initialize the Gemini client
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Use gemini-2.5-flash as it is fast, cheap, and very capable at OCR and structured extraction
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const prompt = `
You are an expert financial OCR assistant. Your task is to analyze the provided screenshot of bank account or card transactions and extract a list of transactions.

For each transaction, extract:
1. Date: format as "YYYY-MM-DD". (If the year is not visible, assume the current year 2026, or infer from context).
2. Amount: a positive decimal number representing the monetary value.
3. Type: either "Income" (for money received, credits), "Expense" (for payments, charges), or "Transfer" (for transferring money between accounts).
4. Notes: the name of the merchant, description, or notes found.
5. suggestedCategoryId: Match the transaction to one of the provided categories based on semantic meaning. If no category matches well, return null.
6. suggestedAccountId: Match the transaction to one of the provided accounts. If only one account exists, default to its ID. If no account matches well, return null.

CONTEXT - Available Categories (categorized by type):
${JSON.stringify(categories, null, 2)}

CONTEXT - Available Accounts:
${JSON.stringify(accounts, null, 2)}

Output requirements:
Return a JSON object containing an array of transactions in the "transactions" field.
You MUST follow the JSON schema provided below. Do not include any markdown comments, backticks, or extra text. Return ONLY the JSON object.

JSON Schema format to return:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "amount": 15.50,
      "type": "Expense", // or "Income" or "Transfer"
      "notes": "Merchant Name / Transaction Description",
      "suggestedCategoryId": 12, // (or null)
      "suggestedAccountId": 3 // (or null)
    }
  ]
}
  `;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: fileBuffer.toString("base64"),
          mimeType,
        },
      },
    ]);

    const responseText = result.response.text().trim();
    
    // Clean up markdown block wraps if the model returned them
    let cleanedText = responseText;
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.substring(7);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    }
    cleanedText = cleanedText.trim();

    const parsed = JSON.parse(cleanedText);
    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
      throw new Error("Invalid output format from Gemini");
    }

    return parsed.transactions as ParsedTransaction[];
  } catch (error) {
    console.error("[Gemini OCR Service Error]:", error);
    throw new Error("Failed to parse the screenshot using Gemini API.");
  }
}
