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

const START_TIMESTAMP_SECONDS = 1262304000; // 2010-01-01 00:00 UTC
const NOW_TIMESTAMP_SECONDS = Math.floor(Date.now() / 1000);
const OUTPUT_DIRECTORY = join(import.meta.dirname, "..", "public", "data");

const FETCH_TIMEOUT_MS_YAHOO = 10000;
const FETCH_TIMEOUT_MS_COIN_GECKO = 10000;
const FETCH_TIMEOUT_MS_FX = 8000;
const MILLISECONDS_PER_DAY = 86400000;
const MIN_BTC_DATA_POINTS = 100;
const CUTOFF_YEAR = 2010;

type RawPoint = { date: string; close: number };

function toISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDayOfYear(date: Date): number {
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diffMilliseconds = date.getTime() - startOfYear.getTime();
  return Math.floor(diffMilliseconds / MILLISECONDS_PER_DAY);
}

async function fetchYahoo(ticker: string): Promise<RawPoint[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${START_TIMESTAMP_SECONDS}&period2=${NOW_TIMESTAMP_SECONDS}&interval=1d&includePrePost=false`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS_YAHOO),
  });
  if (!response.ok) throw new Error(`Yahoo ${ticker} ${response.status}`);
  const yahooResponse = (await response.json()) as unknown as {
    chart: { result: Array<{ timestamp: number[]; indicators: { quote: Array<{ close: (number | null)[] }> } }> };
  };
  const chartResult = yahooResponse.chart.result?.[0];
  if (!chartResult) throw new Error("no result");
  const closePrices = chartResult.indicators.quote[0].close;
  const rawPoints: RawPoint[] = [];
  chartResult.timestamp.forEach((timestampSeconds, index) => {
    const closePrice = closePrices[index];
    if (closePrice == null) return;
    const pointDate = new Date(timestampSeconds * 1000);
    rawPoints.push({ date: toISO(pointDate), close: closePrice });
  });
  return rawPoints;
}

async function fetchCoinGecko(): Promise<RawPoint[]> {
  const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=max&interval=daily`;
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS_COIN_GECKO) });
  if (!response.ok) throw new Error(`CoinGecko ${response.status}`);
  const coinGeckoResponse = (await response.json()) as { prices: [number, number][] };
  return coinGeckoResponse.prices.map(([timestampMs, price]) => ({
    date: toISO(new Date(timestampMs)),
    close: price,
  }));
}

function normalizeYearly(raw: RawPoint[], symbol: string) {
  // group by year
  const pointsByYear = new Map<number, RawPoint[]>();
  for (const point of raw) {
    const year = Number(point.date.slice(0, 4));
    if (!pointsByYear.has(year)) pointsByYear.set(year, []);
    pointsByYear.get(year)!.push(point);
  }
  const years: Record<string, { year: number; jan1Close: number; points: Array<{ doy: number; date: string; iso: string; close: number; indexed: number }> }> = {};
  const yearList: number[] = [];
  for (const [year, pointsInYear] of [...pointsByYear.entries()].sort((a, b) => a[0] - b[0])) {
    if (year < CUTOFF_YEAR) continue;
    // sort by date
    pointsInYear.sort((a, b) => a.date.localeCompare(b.date));
    // jan1 close: first available close in year (handles Jan1 holiday)
    const januaryFirstClose = pointsInYear[0]?.close;
    if (!januaryFirstClose) continue;
    const indexedPoints = pointsInYear.map((point) => {
      const pointDate = new Date(point.date + "T00:00:00Z");
      return {
        doy: getDayOfYear(pointDate),
        date: point.date.slice(5), // MM-DD
        iso: point.date,
        close: point.close,
        indexed: Number(((point.close / januaryFirstClose) * 100).toFixed(4)),
      };
    });
    years[String(year)] = { year, jan1Close: januaryFirstClose, points: indexedPoints };
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
  mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

  // SPX - no synthetic, only real Yahoo data
  let spxRawPoints: RawPoint[] | null = null;
  try {
    spxRawPoints = await fetchYahoo("^GSPC");
    console.log(`Yahoo ^GSPC fetched ${spxRawPoints.length} points`);
  } catch (error) {
    console.warn("Yahoo ^GSPC failed:", error);
  }
  if (!spxRawPoints) {
    const existingSp500Path = join(OUTPUT_DIRECTORY, "sp500.json");
    if (existsSync(existingSp500Path)) {
      console.log("Keeping existing sp500.json (no synthetic generated)");
      // keep existing file, do not overwrite
    } else {
      throw new Error("No S&P 500 data fetched and no existing snapshot");
    }
  } else {
    const sp500Snapshot = normalizeYearly(spxRawPoints, "SPX");
    writeFileSync(join(OUTPUT_DIRECTORY, "sp500.json"), JSON.stringify(sp500Snapshot, null, 2));
    console.log(`Wrote sp500.json years=${sp500Snapshot.yearList.join(",")}`);
  }

  // BTC: try Yahoo BTC-USD first, fallback to CoinGecko, no synthetic for early years
  let btcRawPoints: RawPoint[] | null = null;
  try {
    btcRawPoints = await fetchYahoo("BTC-USD");
    console.log(`Yahoo BTC-USD fetched ${btcRawPoints.length} points`);
    btcRawPoints = btcRawPoints.filter((point) => point.date >= "2010-01-01");
    if (btcRawPoints.length < MIN_BTC_DATA_POINTS) throw new Error("too few btc points");
    // No synthetic padding - early years 2010-2014 will simply be missing if Yahoo starts 2014
    console.log(`BTC Yahoo earliest ${btcRawPoints[0].date}, no synthetic padding`);
  } catch (error) {
    console.warn("Yahoo BTC failed:", error);
    try {
      const coinGeckoPoints = await fetchCoinGecko();
      // No synthetic early - use CoinGecko as-is (starts 2013-04-28)
      btcRawPoints = coinGeckoPoints.filter((point) => point.date >= "2010-01-01");
      console.log(`CoinGecko BTC fetched ${btcRawPoints.length} points (real only, 2013+)`);
    } catch (coinGeckoError) {
      console.warn("CoinGecko failed:", coinGeckoError);
      const existingBtcPath = join(OUTPUT_DIRECTORY, "btc.json");
      if (existsSync(existingBtcPath)) {
        console.log("Keeping existing btc.json (no synthetic generated)");
        btcRawPoints = null;
      } else {
        throw new Error("No BTC data fetched and no existing snapshot");
      }
    }
  }
  if (btcRawPoints) {
    const btcSnapshot = normalizeYearly(btcRawPoints, "BTC");
    writeFileSync(join(OUTPUT_DIRECTORY, "btc.json"), JSON.stringify(btcSnapshot, null, 2));
    console.log(`Wrote btc.json years=${btcSnapshot.yearList.join(",")}`);
  }

  // also write a small meta
  writeFileSync(
    join(OUTPUT_DIRECTORY, "meta.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), sources: ["yahoo", "coingecko"], baseCurrency: "USD", defaultDisplayCurrency: "EUR", note: "No synthetic/fake numbers" }, null, 2)
  );

  // Fetch FX rates for currency conversion (third-party: Frankfurter + exchangerate.host)
  // This allows the app (default EUR) to convert USD snapshot prices at runtime.
  // We grab current rates and also try to fetch a EUR sample for BTC to verify.
  try {
    const frankfurterResponse = await fetch("https://api.frankfurter.app/latest?from=USD", { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS_FX) });
    if (frankfurterResponse.ok) {
      const frankfurterData = (await frankfurterResponse.json()) as { rates: Record<string, number>; date: string };
      writeFileSync(join(OUTPUT_DIRECTORY, "fx.json"), JSON.stringify({ base: "USD", date: frankfurterData.date, rates: frankfurterData.rates, source: "frankfurter.app" }, null, 2));
      console.log(`Wrote fx.json base USD date ${frankfurterData.date} rates ${Object.keys(frankfurterData.rates).join(",")}`);
    } else {
      console.warn(`FX frankfurter failed ${frankfurterResponse.status}`);
    }
  } catch (fetchError) {
    console.warn("FX fetch failed, trying exchangerate.host", fetchError);
    try {
      const fallbackResponse = await fetch("https://api.exchangerate.host/latest?base=USD", { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS_FX) });
      if (fallbackResponse.ok) {
        const fallbackData = (await fallbackResponse.json()) as { rates: Record<string, number> };
        writeFileSync(join(OUTPUT_DIRECTORY, "fx.json"), JSON.stringify({ base: "USD", date: new Date().toISOString().slice(0, 10), rates: fallbackData.rates, source: "exchangerate.host" }, null, 2));
        console.log(`Wrote fx.json via exchangerate.host`);
      }
    } catch (fallbackError) {
      console.warn("FX fallback also failed", fallbackError);
    }
  }

  // Also fetch BTC in EUR for verification that EUR data can be grabbed again
  try {
    const btcEurResponse = await fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=eur&days=max&interval=daily", { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS_COIN_GECKO) });
    if (btcEurResponse.ok) {
      const btcEurData = (await btcEurResponse.json()) as { prices: [number, number][] };
      const samplePrices = btcEurData.prices.slice(-3).map(([timestampMs, price]) => ({ date: toISO(new Date(timestampMs)), close: price }));
      console.log(`BTC EUR sample last 3: ${JSON.stringify(samplePrices)}`);
      // We keep USD snapshot as source of truth; EUR conversion at runtime via FX is preferred for consistency with S&P.
      // Optionally write a separate snapshot if needed:
      // const btcEurRawPoints = btcEurData.prices.map(([timestampMs, price]) => ({ date: toISO(new Date(timestampMs)), close: price }));
      // const btcEurSnapshot = normalizeYearly(btcEurRawPoints, "BTC_EUR");
      // writeFileSync(join(OUTPUT_DIRECTORY, "btc_eur.json"), JSON.stringify(btcEurSnapshot, null, 2));
    }
  } catch (btcEurError) {
    console.warn("BTC EUR fetch failed (optional)", btcEurError);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
