import { prisma } from "../db/prisma"

type PriceMap = Record<string, number>

const cache: { prices: PriceMap; updatedAt: number } = {
  prices: {},
  updatedAt: 0,
}

async function fetchFromYahooFinance(tickers: string[]): Promise<PriceMap> {
  const result: PriceMap = {}
  const chunks: string[][] = []
  for (let i = 0; i < tickers.length; i += 50) chunks.push(tickers.slice(i, i + 50))
  for (const chunk of chunks) {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(chunk.join(","))}`
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const json: any = await res.json()
      const list: any[] = json?.quoteResponse?.result ?? []
      for (const item of list) {
        const sym = String(item.symbol)
        const price = Number(item.regularMarketPrice)
        if (!Number.isNaN(price)) result[sym] = price
      }
    } catch {
      // ignore network errors and continue
    }
  }
  return result
}

export async function refreshMarketData(fetcher?: (tickers: string[]) => Promise<PriceMap>) {
  // Collect unique tickers from holdings
  const tickersRows = await prisma.holding.findMany({
    distinct: ["tickerSymbol"],
    select: { tickerSymbol: true },
  })
  const tickers = tickersRows.map((r) => r.tickerSymbol).filter(Boolean)
  if (tickers.length === 0) {
    cache.prices = {}
    cache.updatedAt = Date.now()
    return
  }
  const prices = await (fetcher ? fetcher(tickers) : fetchFromYahooFinance(tickers))
  cache.prices = prices
  cache.updatedAt = Date.now()
}

export function getMarketData() {
  return { updatedAt: cache.updatedAt ? new Date(cache.updatedAt).toISOString() : null, prices: cache.prices }
}


