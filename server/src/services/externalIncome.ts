import { prisma } from "../db/prisma.js";

type ExternalIncomeSourceRecord = {
  id: number;
  name: string;
  apiUrl: string;
  httpMethod: string;
  authType: string;
  authToken: string | null;
  authHeaderName: string | null;
  authQueryParam: string | null;
  responseField: string;
};

const externalIncomeModel = (prisma as any).externalIncomeSource;

export type ExternalIncomeFetchResult = {
  ok: boolean;
  value: number | null;
  error: string | null;
  fetchedAt: Date;
};

type FetchExternalValueOptions = {
  persist?: boolean;
};

function getValueByPath(payload: unknown, path: string): unknown {
  if (!path) return payload;
  const segments = path.split(".").map((s) => s.trim()).filter(Boolean);
  let current: unknown = payload;

  for (const segment of segments) {
    if (typeof current !== "object" || current === null || !(segment in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toMonthKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (/^\d{4}-\d{2}$/.test(normalized)) return normalized;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized.slice(0, 7);
  return null;
}

function pickFromArray(raw: unknown[], targetMonth: string): number | null {
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const month = toMonthKey(record.month ?? record.date ?? record.period ?? record.mese);
    if (month !== targetMonth) continue;

    const direct = toNumber(record.value);
    if (direct !== null) return direct;

    const amount = toNumber(record.amount);
    if (amount !== null) return amount;

    const total = toNumber(record.total);
    if (total !== null) return total;
  }

  return null;
}

function resolveForecastValue(rawValue: unknown, targetMonth: string): number | null {
  const scalar = toNumber(rawValue);
  if (scalar !== null) return scalar;

  if (Array.isArray(rawValue)) {
    return pickFromArray(rawValue, targetMonth);
  }

  if (typeof rawValue === "object" && rawValue !== null) {
    const record = rawValue as Record<string, unknown>;

    const byKey = toNumber(record[targetMonth]);
    if (byKey !== null) return byKey;

    if ("months" in record && Array.isArray(record.months)) {
      const fromMonths = pickFromArray(record.months, targetMonth);
      if (fromMonths !== null) return fromMonths;
    }

    if ("values" in record && Array.isArray(record.values)) {
      const fromValues = pickFromArray(record.values, targetMonth);
      if (fromValues !== null) return fromValues;
    }
  }

  return null;
}

function buildRequest(source: ExternalIncomeSourceRecord): { url: string; init: RequestInit } {
  const method = source.httpMethod?.toUpperCase() === "POST" ? "POST" : "GET";
  const url = new URL(source.apiUrl);
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  switch (source.authType) {
    case "NONE":
      break;
    case "BEARER":
      if (!source.authToken) throw new Error("Missing auth token for Bearer auth");
      headers.Authorization = `Bearer ${source.authToken}`;
      break;
    case "API_KEY_HEADER": {
      if (!source.authToken) throw new Error("Missing API key token");
      const headerName = source.authHeaderName?.trim() || "X-API-Key";
      headers[headerName] = source.authToken;
      break;
    }
    case "API_KEY_QUERY": {
      if (!source.authToken) throw new Error("Missing API key token");
      const queryParam = source.authQueryParam?.trim();
      if (!queryParam) throw new Error("Missing auth query param name");
      url.searchParams.set(queryParam, source.authToken);
      break;
    }
    case "CUSTOM_HEADER": {
      const headerName = source.authHeaderName?.trim();
      if (!headerName) throw new Error("Missing custom auth header name");
      if (!source.authToken) throw new Error("Missing custom auth token");
      headers[headerName] = source.authToken;
      break;
    }
    default:
      throw new Error(`Unsupported auth type: ${source.authType}`);
  }

  return {
    url: url.toString(),
    init: {
      method,
      headers,
      signal: AbortSignal.timeout(5000),
    },
  };
}

export async function fetchExternalValue(
  source: ExternalIncomeSourceRecord,
  targetMonth: string,
  options: FetchExternalValueOptions = {}
): Promise<ExternalIncomeFetchResult> {
  const fetchedAt = new Date();
  const persist = options.persist ?? true;

  try {
    const { url, init } = buildRequest(source);
    const response = await fetch(url, init);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    const rawValue = getValueByPath(payload, source.responseField);
    const numericValue = resolveForecastValue(rawValue, targetMonth);

    if (numericValue === null) {
      throw new Error(`Response field '${source.responseField}' does not contain a numeric value for month '${targetMonth}'`);
    }

    if (persist) {
      await externalIncomeModel.update({
        where: { id: source.id },
        data: {
          lastFetchedAt: fetchedAt,
          lastFetchedValue: numericValue,
          lastFetchError: null,
        },
      });
    }

    return {
      ok: true,
      value: Math.round(numericValue * 100) / 100,
      error: null,
      fetchedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown external API error";

    if (persist) {
      await externalIncomeModel.update({
        where: { id: source.id },
        data: {
          lastFetchedAt: fetchedAt,
          lastFetchError: message,
        },
      });
    }

    return {
      ok: false,
      value: null,
      error: message,
      fetchedAt,
    };
  }
}
