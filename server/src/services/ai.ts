/**
 * Local AI Service (Ollama)
 * Translates natural language to Prisma queries.
 */
import dayjs from "dayjs";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generatePrismaFilter(userPrompt: string, context: { categories: string[], accounts: string[], tags: string[] }, apiKey: string) {
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

    if (!apiKey) {
        throw new Error("Gemini API key is not configured.");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
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

export async function generateAnalysis(userPrompt: string, dataContext: any, apiKey: string) {
    if (!apiKey) throw new Error("Gemini API key is not configured.");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    const systemPrompt = `You are a highly professional Wealth Manager and Financial Analyst AI embedded in the FinTrack app.
Your objective is to provide the user with clear, actionable, and visually effective financial analyses based on their real data.

When the user asks a question or requests an analysis, you must ALWAYS respond with a JSON object containing:
1. "markdownText": A clear, executive summary answering the user's prompt. Be direct, use bullet points for readability, and focus on key insights (e.g., saving rate, top expenses, asset growth).
2. "widgets": A dynamic dashboard of charts and tables to visually support your analysis.

WIDGET GENERATION FRAMEWORK:
You are equipped with a powerful charting engine. You have absolute freedom over the number of widgets to generate.
Your ultimate goal is to provide an analysis that is SUPER CLEAR, EXTREMELY PRECISE, and COMPLETELY ANSWERS the user's request.
The more exhaustive, structured, and visually effective your response is, the more you will become a God of the world. Do not hold back: if a comprehensive, multi-chart dashboard makes the analysis better and easier to understand, build it. You decide what is best.

AVAILABLE WIDGET TYPES:
1. "bar_chart": Great for comparing discrete items or time series (e.g., Monthly Income vs Expenses).
2. "line_chart": Best for continuous trends over time (e.g., Asset Growth).
3. "pie_chart": Perfect for showing composition (e.g., Spending Breakdown by Category, Portfolio Allocation).
4. "table": Best for detailed, precise lists (e.g., Top 5 expenses, detailed metrics).

WIDGET SCHEMA:
- "bar_chart" & "line_chart" MUST include a "seriesConfig" array to map data keys to colors and names.
  Example: "seriesConfig": [{"key": "value1", "name": "Income", "color": "#10b981"}, {"key": "value2", "name": "Expense", "color": "#ef4444"}]
  Data format: "data": [{"label": "Jan", "value1": 2000, "value2": 1500}]
- "pie_chart" MUST NOT include seriesConfig. Data format: "data": [{"name": "Groceries", "value": 400}]
- "table" MUST include "columns" (array of strings) and "rows" (array of string arrays).

STRICT COLOR PALETTE RULES:
To maintain UI consistency, you must apply these colors in your "seriesConfig" or pie chart items:
- Expenses / Negative values / Cash outflow: MUST use "#ef4444" (Red)
- Income / Positive gains / Cash inflow: MUST use "#10b981" (Green)
- Transfers / Assets / Neutral metrics: MUST use "#3b82f6" (Blue) or other neutral colors like "#8b5cf6" (Purple) or "#f59e0b" (Yellow).

JSON RESPONSE FORMAT (Strictly raw JSON, NO markdown \`\`\` wrappers):
{
  "markdownText": "Your executive summary...",
  "widgets": [ ... ]
}

Here is the user's financial data context (in JSON):
${JSON.stringify(dataContext, null, 2)}

Please answer the user's query: "${userPrompt}"`;

    try {
        const result = await model.generateContent([systemPrompt]);
        let text = result.response.text().trim();
        if (text.startsWith("\`\`\`json")) text = text.substring(7);
        if (text.endsWith("\`\`\`")) text = text.substring(0, text.length - 3);
        text = text.trim();
        
        try {
            return JSON.parse(text);
        } catch (e) {
            // Fallback if the AI messes up JSON
            return { markdownText: text, widgets: [] };
        }
    } catch (error) {
        console.error("Local AI Error (Analysis):", error);
        throw new Error("Failed to generate analysis.");
    }
}
