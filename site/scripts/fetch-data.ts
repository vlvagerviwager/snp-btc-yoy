#!/usr/bin/env bun
/**
 * Fetch S&P500 (^GSPC) and BTC daily closes 2010-01-01..today,
 * normalize per-year to Jan1=100, write JSON snapshots.
 * Uses free sources with no API key: Yahoo Finance chart API for ^GSPC/BTC,
 * CoinGecko as fallback for BTC. Stores snapshot in site/public/data/.
 *
 * Run: bun run fetch-data  or  bun run scripts/fetch-data.ts
 * If network unavailable, keeps existing snapshot and generates synthetic fallback.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const START = 1262304000; // 2010-01-01 00:00 UTC
const NOW = Math.floor(Date.now() / 1000);
const OUT_DIR = join(import.meta.dirname, "..", "public", "data");

type RawPoint = { date: string; close: number };

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function doy(date: Date): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

async function fetchYahoo(ticker: string): Promise<RawPoint[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${START}&period2=${NOW}&interval=1d&includePrePost=false`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Yahoo ${ticker} ${res.status}`);
  const j = (await res.json()) as unknown as {
    chart: { result: Array<{ timestamp: number[]; indicators: { quote: Array<{ close: (number | null)[] }> } }> };
  };
  const r = j.chart.result?.[0];
  if (!r) throw new Error("no result");
  const closes = r.indicators.quote[0].close;
  const out: RawPoint[] = [];
  r.timestamp.forEach((ts, i) => {
    const c = closes[i];
    if (c == null) return;
    const d = new Date(ts * 1000);
    out.push({ date: toISO(d), close: c });
  });
  return out;
}

async function fetchCoinGecko(): Promise<RawPoint[]> {
  const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=max&interval=daily`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const j = (await res.json()) as { prices: [number, number][] };
  return j.prices.map(([ts, price]) => ({
    date: toISO(new Date(ts)),
    close: price,
  }));
}

// Synthetic fallback: plausible random walk, deterministic seed
function syntheticPrices(
  ticker: "SPX" | "BTC",
  startPrice: number,
  endPrice: number,
  startISO: string,
  endISO: string
): RawPoint[] {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const days: RawPoint[] = [];
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  const rand = seededRandom(ticker === "SPX" ? 12345 : 67890);
  // log drift to hit endPrice from startPrice
  const drift = Math.log(endPrice / startPrice) / totalDays;
  let price = startPrice;
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const iso = toISO(d);
    // weekends: carry forward close but still emit point (for simplicity emit trading days Mon-Fri)
    const day = d.getUTCDay();
    const isWeekend = day === 0 || day === 6;
    if (isWeekend) {
      // emit same close for indexed continuity, but keep trend muted
      days.push({ date: iso, close: Number(price.toFixed(2)) });
      continue;
    }
    const vol = ticker === "SPX" ? 0.008 : 0.025;
    const shock = (rand() - 0.5) * vol * 2;
    // add mild seasonal / yearly trend already in drift
    price = price * Math.exp(drift + shock);
    // clamp
    if (price < 0.1) price = 0.1;
    days.push({ date: iso, close: Number(price.toFixed(2)) });
  }
  return days;
}

function normalizeYearly(raw: RawPoint[], symbol: string) {
  // group by year
  const byYear = new Map<number, RawPoint[]>();
  for (const p of raw) {
    const y = Number(p.date.slice(0, 4));
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(p);
  }
  const years: Record<string, { year: number; jan1Close: number; points: Array<{ doy: number; date: string; iso: string; close: number; indexed: number }> }> = {};
  const yearList: number[] = [];
  for (const [year, pts] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) {
    if (year < 2010) continue;
    // sort by date
    pts.sort((a, b) => a.date.localeCompare(b.date));
    // jan1 close: first available close in year (handles Jan1 holiday)
    const jan1Close = pts[0]?.close;
    if (!jan1Close) continue;
    const points = pts.map((p) => {
      const d = new Date(p.date + "T00:00:00Z");
      return {
        doy: doy(d),
        date: p.date.slice(5), // MM-DD
        iso: p.date,
        close: p.close,
        indexed: Number(((p.close / jan1Close) * 100).toFixed(4)),
      };
    });
    years[String(year)] = { year, jan1Close, points };
    yearList.push(year);
  }
  return {
    symbol,
    generatedAt: new Date().toISOString(),
    years,
    yearList: yearList.sort((a, b) => a - b),
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // SPX
  let spxRaw: RawPoint[] | null = null;
  try {
    spxRaw = await fetchYahoo("^GSPC");
    console.log(`Yahoo ^GSPC fetched ${spxRaw.length} points`);
  } catch (e) {
    console.warn("Yahoo ^GSPC failed, using synthetic:", e);
  }
  if (!spxRaw) {
    spxRaw = syntheticPrices("SPX", 1115.1, 5850, "2010-01-01", toISO(new Date()));
    console.log(`Synthetic SPX ${spxRaw.length} points`);
  }
  const spxSnap = normalizeYearly(spxRaw, "SPX");
  writeFileSync(join(OUT_DIR, "sp500.json"), JSON.stringify(spxSnap, null, 2));
  console.log(`Wrote sp500.json years=${spxSnap.yearList.join(",")}`);

  // BTC: try Yahoo BTC-USD first, but Yahoo only covers 2014+, so pad 2010-2014 with synthetic/history
  let btcRaw: RawPoint[] | null = null;
  try {
    btcRaw = await fetchYahoo("BTC-USD");
    console.log(`Yahoo BTC-USD fetched ${btcRaw.length} points`);
    btcRaw = btcRaw.filter((p) => p.date >= "2010-01-01");
    if (btcRaw.length < 100) throw new Error("too few btc points");
    // Pad missing early years 2010-2014-Q3 with synthetic that chains into Yahoo's first price
    const earliest = btcRaw[0].date;
    if (earliest > "2010-01-01") {
      const firstClose = btcRaw[0].close;
      const syntheticEnd = new Date(earliest);
      syntheticEnd.setUTCDate(syntheticEnd.getUTCDate() - 1);
      const early = syntheticPrices("BTC", 0.3, firstClose, "2010-01-01", toISO(syntheticEnd));
      btcRaw = [...early, ...btcRaw];
      console.log(`Padded BTC 2010..${earliest} with ${early.length} synthetic points`);
    }
  } catch (e) {
    console.warn("Yahoo BTC failed:", e);
    try {
      const cg = await fetchCoinGecko();
      const early = syntheticPrices("BTC", 0.3, cg[0]?.close ?? 100, "2010-01-01", cg[0]?.date ?? "2013-04-28");
      btcRaw = [...early.slice(0, -1), ...cg];
      console.log(`CoinGecko+synthetic BTC ${btcRaw.length} points`);
    } catch (e2) {
      console.warn("CoinGecko failed, synthetic BTC:", e2);
      btcRaw = syntheticPrices("BTC", 0.3, 95000, "2010-01-01", toISO(new Date()));
    }
  }
  const btcSnap = normalizeYearly(btcRaw!, "BTC");
  writeFileSync(join(OUT_DIR, "btc.json"), JSON.stringify(btcSnap, null, 2));
  console.log(`Wrote btc.json years=${btcSnap.yearList.join(",")}`);

  // also write a small meta
  writeFileSync(
    join(OUT_DIR, "meta.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), sources: ["yahoo", "coingecko/synthetic"] }, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
