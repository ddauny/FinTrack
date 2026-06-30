/**
 * Local AI Service (Ollama)
 * Translates natural language to Prisma queries.
 */
import dayjs from "dayjs";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generatePrismaFilter(userPrompt: string, context: { categories: string[], accounts: string[], tags: string[] }) {
    const systemPrompt = `
Convert the USER QUERY into a Prisma JSON "where" object.
Return ONLY JSON.

CURRENT DATE: ${new Date().toISOString()}
CURRENT YEAR: ${new Date().getFullYear()}
CURRENT MONTH: ${new Date().toLocaleString('en-US', { month: 'long' })}

RULES:
- "date", "amount", "type" must be at the ROOT of the JSON.
- If user says a month (e.g. "January") use CURRENT YEAR if it's in the past, otherwise PREVIOUS YEAR.
- "type" is either "Income" or "Expense".
- Use "OR" blocks only for keyword searches in "notes" or "category.name".
- DO NOT add filters (like amount > 1000) unless explicitly requested.

EXAMPLES:
User: "income over 500"
Output: {"amount": {"gt": 500}, "type": "Income"}

User: "pizza from January 15"
Output: {"date": {"gte": "${new Date().getFullYear()}-01-15T00:00:00Z", "lte": "${new Date().toISOString()}"}, "OR": [{"notes": {"contains": "pizza", "mode": "insensitive"}}, {"category": {"name": {"contains": "pizza", "mode": "insensitive"}}}]}

CONTEXT:
Categories: ${context.categories.join(", ")}
Accounts: ${context.accounts.join(", ")}

USER QUERY: "${userPrompt}"
    `;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured in the environment variables.");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
    });

    try {
        const result = await model.generateContent([
            systemPrompt
        ]);

        const responseText = result.response.text().trim();
        let cleanedText = responseText;
        if (cleanedText.startsWith("```json")) {
            cleanedText = cleanedText.substring(7);
        }
        if (cleanedText.endsWith("```")) {
            cleanedText = cleanedText.substring(0, cleanedText.length - 3);
        }
        cleanedText = cleanedText.trim();

        const filter = JSON.parse(cleanedText);
        
        // Final sanity check & Post-processing
        const allowed = ['date', 'amount', 'notes', 'category', 'account', 'type', 'OR', 'AND', 'NOT', 'tags'];
        const rootConstraints = ['date', 'amount', 'type'];
        
        function sanitize(obj: any, isRoot = true): any {
            if (typeof obj !== 'object' || obj === null) return obj;
            if (Array.isArray(obj)) return obj.map(v => sanitize(v, false));
            
            const newObj: any = {};
            for (const k in obj) {
                if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;

                // Handle dot-notation hallucination (e.g. "tags.some.name": "...")
                if (k.includes('.')) {
                    const parts = k.split('.');
                    let current = newObj;
                    for (let i = 0; i < parts.length - 1; i++) {
                        const p = parts[i];
                        if (!current[p]) current[p] = {};
                        current = current[p];
                    }
                    current[parts[parts.length - 1]] = sanitize(obj[k], false);
                    continue;
                }

                // If it's a relation, strictly allow only name/type
                if ((k === 'category' || k === 'account') && typeof obj[k] === 'object' && obj[k] !== null) {
                    const rel = obj[k];
                    const cleanRel: any = {};
                    if (rel.name) cleanRel.name = sanitize(rel.name, false);
                    if (k === 'category' && rel.type) cleanRel.type = sanitize(rel.type, false);
                    newObj[k] = cleanRel;
                    continue;
                }

                // Block nested tags (tags should only be at root for Transaction)
                if (!isRoot && k === 'tags') continue;

                // Fix "contains": "string,insensitive" hallucination
                if (k === 'contains' && typeof obj[k] === 'string' && obj[k].includes(',insensitive')) {
                    newObj[k] = obj[k].replace(',insensitive', '');
                    newObj['mode'] = 'insensitive';
                } else if ((k === 'gte' || k === 'lte' || k === 'equals') && (typeof obj[k] === 'string' && /^\d{4}/.test(obj[k]))) {
                    // Normalize dates that look like 20250101 or 2025-01-01
                    const d = dayjs(obj[k]);
                    if (d.isValid()) {
                        newObj[k] = d.toISOString();
                    } else {
                        newObj[k] = obj[k];
                    }
                } else {
                    newObj[k] = sanitize(obj[k], false);
                }
            }
            return newObj;
        }

        const sanitized = sanitize(filter, true);
        
        // Hard-correction: Pull mandatory constraints out of OR blocks if hallucinated there
        if (sanitized.OR && Array.isArray(sanitized.OR)) {
            const newOr: any[] = [];
            for (const orItem of sanitized.OR) {
                let moved = false;
                for (const key of rootConstraints) {
                    if (orItem[key] !== undefined) {
                        sanitized[key] = orItem[key];
                        moved = true;
                    }
                }
                if (!moved) newOr.push(orItem);
            }
            if (newOr.length > 0) sanitized.OR = newOr;
            else delete sanitized.OR;
        }

        const cleanFilter: any = {};
        for (const key of allowed) {
            if (sanitized[key] !== undefined) cleanFilter[key] = sanitized[key];
        }

        return cleanFilter;
    } catch (error) {
        console.error("Local AI Error:", error);
        throw new Error("Local AI failed to process query");
    }
}
