#!/usr/bin/env bun
/**
 * Fetch S&P500 (^GSPC) and BTC daily closes 2010-01-01..today,
 * normalize per-year to Jan1=100, write JSON snapshots.
 * Uses free sources with no API key: Yahoo Finance chart API for ^GSPC/BTC,
 * CoinGecko as fallback for BTC. Stores snapshot in site/public/data/.
 *
 * Run: bun run fetch-data  or  bun run scripts/fetch-data.ts
 * No fake/synthetic numbers: if fetch fails, keep existing snapshot on disk.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const START = 1262304000; // 2010-01-01 00:00 UTC
const NOW = Math.floor(Date.now() / 1000);
const OUT_DIR = join(import.meta.dirname, "..", "public", "data");

type RawPoint = { date: string; close: number };

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
    signal: AbortSignal.timeout(10000),
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
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const j = (await res.json()) as { prices: [number, number][] };
  return j.prices.map(([ts, price]) => ({
    date: toISO(new Date(ts)),
    close: price,
  }));
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

  // SPX - no synthetic, only real Yahoo data
  let spxRaw: RawPoint[] | null = null;
  try {
    spxRaw = await fetchYahoo("^GSPC");
    console.log(`Yahoo ^GSPC fetched ${spxRaw.length} points`);
  } catch (e) {
    console.warn("Yahoo ^GSPC failed:", e);
  }
  if (!spxRaw) {
    const existing = join(OUT_DIR, "sp500.json");
    if (existsSync(existing)) {
      console.log("Keeping existing sp500.json (no synthetic generated)");
      // keep existing file, do not overwrite
    } else {
      throw new Error("No S&P 500 data fetched and no existing snapshot");
    }
  } else {
    const spxSnap = normalizeYearly(spxRaw, "SPX");
    writeFileSync(join(OUT_DIR, "sp500.json"), JSON.stringify(spxSnap, null, 2));
    console.log(`Wrote sp500.json years=${spxSnap.yearList.join(",")}`);
  }

  // BTC: try Yahoo BTC-USD first, fallback to CoinGecko, no synthetic for early years
  let btcRaw: RawPoint[] | null = null;
  try {
    btcRaw = await fetchYahoo("BTC-USD");
    console.log(`Yahoo BTC-USD fetched ${btcRaw.length} points`);
    btcRaw = btcRaw.filter((p) => p.date >= "2010-01-01");
    if (btcRaw.length < 100) throw new Error("too few btc points");
    // No synthetic padding - early years 2010-2014 will simply be missing if Yahoo starts 2014
    console.log(`BTC Yahoo earliest ${btcRaw[0].date}, no synthetic padding`);
  } catch (e) {
    console.warn("Yahoo BTC failed:", e);
    try {
      const cg = await fetchCoinGecko();
      // No synthetic early - use CoinGecko as-is (starts 2013-04-28)
      btcRaw = cg.filter((p) => p.date >= "2010-01-01");
      console.log(`CoinGecko BTC fetched ${btcRaw.length} points (real only, 2013+)`);
    } catch (e2) {
      console.warn("CoinGecko failed:", e2);
      const existingBtc = join(OUT_DIR, "btc.json");
      if (existsSync(existingBtc)) {
        console.log("Keeping existing btc.json (no synthetic generated)");
        btcRaw = null;
      } else {
        throw new Error("No BTC data fetched and no existing snapshot");
      }
    }
  }
  if (btcRaw) {
    const btcSnap = normalizeYearly(btcRaw, "BTC");
    writeFileSync(join(OUT_DIR, "btc.json"), JSON.stringify(btcSnap, null, 2));
    console.log(`Wrote btc.json years=${btcSnap.yearList.join(",")}`);
  }

  // also write a small meta
  writeFileSync(
    join(OUT_DIR, "meta.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), sources: ["yahoo", "coingecko"], baseCurrency: "USD", defaultDisplayCurrency: "EUR", note: "No synthetic/fake numbers" }, null, 2)
  );

  // Fetch FX rates for currency conversion (third-party: Frankfurter + exchangerate.host)
  // This allows the app (default EUR) to convert USD snapshot prices at runtime.
  // We grab current rates and also try to fetch a EUR sample for BTC to verify.
  try {
    const fxRes = await fetch("https://api.frankfurter.app/latest?from=USD", { signal: AbortSignal.timeout(8000) });
    if (fxRes.ok) {
      const fxJson = (await fxRes.json()) as { rates: Record<string, number>; date: string };
      writeFileSync(join(OUT_DIR, "fx.json"), JSON.stringify({ base: "USD", date: fxJson.date, rates: fxJson.rates, source: "frankfurter.app" }, null, 2));
      console.log(`Wrote fx.json base USD date ${fxJson.date} rates ${Object.keys(fxJson.rates).join(",")}`);
    } else {
      console.warn(`FX frankfurter failed ${fxRes.status}`);
    }
  } catch (e) {
    console.warn("FX fetch failed, trying exchangerate.host", e);
    try {
      const r2 = await fetch("https://api.exchangerate.host/latest?base=USD", { signal: AbortSignal.timeout(8000) });
      if (r2.ok) {
        const j2 = (await r2.json()) as { rates: Record<string, number> };
        writeFileSync(join(OUT_DIR, "fx.json"), JSON.stringify({ base: "USD", date: new Date().toISOString().slice(0, 10), rates: j2.rates, source: "exchangerate.host" }, null, 2));
        console.log(`Wrote fx.json via exchangerate.host`);
      }
    } catch (e2) {
      console.warn("FX fallback also failed", e2);
    }
  }

  // Also fetch BTC in EUR for verification that EUR data can be grabbed again
  try {
    const btcEur = await fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=eur&days=max&interval=daily", { signal: AbortSignal.timeout(10000) });
    if (btcEur.ok) {
      const j = (await btcEur.json()) as { prices: [number, number][] };
      const sample = j.prices.slice(-3).map(([ts, p]) => ({ date: toISO(new Date(ts)), close: p }));
      console.log(`BTC EUR sample last 3: ${JSON.stringify(sample)}`);
      // We keep USD snapshot as source of truth; EUR conversion at runtime via FX is preferred for consistency with S&P.
      // Optionally write a separate snapshot if needed:
      // const btcEurRaw = j.prices.map(([ts, price]) => ({ date: toISO(new Date(ts)), close: price }));
      // const btcEurSnap = normalizeYearly(btcEurRaw, "BTC_EUR");
      // writeFileSync(join(OUT_DIR, "btc_eur.json"), JSON.stringify(btcEurSnap, null, 2));
    }
  } catch (e) {
    console.warn("BTC EUR fetch failed (optional)", e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
