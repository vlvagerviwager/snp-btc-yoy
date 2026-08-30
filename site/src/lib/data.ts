import type { Snapshot, YearSeries } from "../types";
import sp500Raw from "../../public/data/sp500.json";
import btcRaw from "../../public/data/btc.json";

export const sp500Snapshot = sp500Raw as Snapshot;
export const btcSnapshot = btcRaw as Snapshot;

export function getYears(snap: Snapshot): number[] {
  return snap.yearList;
}

export function getSeries(snap: Snapshot, years: number[]): YearSeries[] {
  return years
    .map((y) => snap.years[String(y)])
    .filter(Boolean) as YearSeries[];
}

export type Range = "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | "5y";
export const RANGES: Range[] = ["1d", "1w", "1m", "3m", "6m", "1y", "5y"];
export const RANGE_DAYS: Record<Range, number> = {
  "1d": 1,
  "1w": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
  "5y": 1825,
};

export function filterByRange<T extends { doy: number }>(data: T[], range: Range | null): T[] {
  if (!range || data.length === 0) return data;
  const maxDoy = Math.max(...data.map((d) => d.doy));
  const days = RANGE_DAYS[range];
  // 5y or >365 just returns full year (max 366)
  if (days >= 365) return data;
  const minDoy = maxDoy - days + 1;
  return data.filter((d) => d.doy >= minDoy);
}

export type RecentPoint = { iso: string; date: string; close: number; indexed: number };

export function getRecentSeries(snap: Snapshot, range: Range): RecentPoint[] {
  const all = Object.values(snap.years)
    .flatMap((y) => y.points)
    .sort((a, b) => a.iso.localeCompare(b.iso));
  if (all.length === 0) return [];
  const days = RANGE_DAYS[range];
  const latest = new Date(all[all.length - 1].iso + "T00:00:00Z");
  const cutoff = new Date(latest);
  cutoff.setUTCDate(latest.getUTCDate() - days + 1);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const filtered = all.filter((p) => p.iso >= cutoffIso);
  if (filtered.length === 0) return [];
  const firstClose = filtered[0].close;
  return filtered.map((p) => ({
    iso: p.iso,
    date: p.iso.slice(5), // MM-DD
    close: p.close,
    indexed: Number(((p.close / firstClose) * 100).toFixed(4)),
  }));
}

export type RecentOverlayPoint = { iso: string; date: string; sp: number | null; btc: number | null; spPrice: number | null; btcPrice: number | null };

export function getRecentOverlay(spSnap: Snapshot, btcSnap: Snapshot, range: Range): RecentOverlayPoint[] {
  const spRecent = getRecentSeries(spSnap, range);
  const btcRecent = getRecentSeries(btcSnap, range);
  const spMap = new Map(spRecent.map((p) => [p.iso, p] as const));
  const btcMap = new Map(btcRecent.map((p) => [p.iso, p] as const));
  const isos = new Set([...spMap.keys(), ...btcMap.keys()]);
  return [...isos]
    .sort()
    .map((iso) => {
      const sp = spMap.get(iso);
      const btc = btcMap.get(iso);
      return {
        iso,
        date: iso.slice(5),
        sp: sp?.indexed ?? null,
        btc: btc?.indexed ?? null,
        spPrice: sp?.close ?? null,
        btcPrice: btc?.close ?? null,
      };
    });
}

// For charts: merge by day-of-year -> { doy, label, 2024: 102.3, 2024_price: 4523, 2025: 98.1 }
export type MergedPoint = { doy: number; label: string; [year: string]: number | string };

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function mergeSeriesByDoy(series: YearSeries[]): MergedPoint[] {
  // collect all doy 1..366
  const doySet = new Set<number>();
  for (const s of series) for (const p of s.points) doySet.add(p.doy);
  const doys = [...doySet].sort((a, b) => a - b);

  // map year -> doy -> {indexed, price, label}
  const byYear = new Map<number, Map<number, { indexed: number; close: number; label: string }>>();
  for (const s of series) {
    const m = new Map<number, { indexed: number; close: number; label: string }>();
    for (const p of s.points) m.set(p.doy, { indexed: p.indexed, close: p.close, label: p.date });
    byYear.set(s.year, m);
  }

  return doys.map((doy) => {
    const row: MergedPoint = { doy, label: doyToLabel(doy) };
    for (const s of series) {
      const v = byYear.get(s.year)?.get(doy);
      if (v) {
        row[String(s.year)] = v.indexed;
        row[`${s.year}_price`] = v.close;
        row[`${s.year}_date`] = v.label;
      }
    }
    return row;
  });
}

export function doyToLabel(doy: number): string {
  // approximate month label via doy thresholds (non-leap)
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
  for (let i = 0; i < 12; i++) if (doy <= cum[i + 1]) return MONTH_LABELS[i];
  return "Dec";
}

export const MONTH_STARTS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

export function COLORS(year: number, allYears: number[]): string {
  // deterministic palette
  const palette = [
    "#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed", "#db2777", "#0891b2", "#65a30d",
    "#c2410c", "#4f46e5", "#0d9488", "#be123c", "#4338ca", "#a16207", "#6d28d9", "#e11d48",
    "#0e7490", "#15803d",
  ];
  const idx = allYears.indexOf(year);
  return palette[idx % palette.length];
}

export function overlayMerge(sp: YearSeries[], btc: YearSeries[], year: number) {
  const spY = sp.find((s) => s.year === year);
  const btcY = btc.find((s) => s.year === year);
  if (!spY || !btcY) return [];
  const spMap = new Map(spY.points.map((p) => [p.doy, p] as const));
  const btcMap = new Map(btcY.points.map((p) => [p.doy, p] as const));
  const doys = new Set([...spMap.keys(), ...btcMap.keys()]);
  return [...doys]
    .sort((a, b) => a - b)
    .map((doy) => ({
      doy,
      label: doyToLabel(doy),
      sp: spMap.get(doy)?.indexed ?? null,
      btc: btcMap.get(doy)?.indexed ?? null,
      spPrice: spMap.get(doy)?.close ?? null,
      btcPrice: btcMap.get(doy)?.close ?? null,
    }));
}
