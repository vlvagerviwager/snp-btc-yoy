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

// For charts: merge by day-of-year -> { doy, label, 2024: 102.3, 2025: 98.1 }
export type MergedPoint = { doy: number; label: string; [year: string]: number | string };

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function mergeSeriesByDoy(series: YearSeries[]): MergedPoint[] {
  // collect all doy 1..366
  const doySet = new Set<number>();
  for (const s of series) for (const p of s.points) doySet.add(p.doy);
  const doys = [...doySet].sort((a, b) => a - b);

  // map year -> doy -> indexed
  const byYear = new Map<number, Map<number, { indexed: number; label: string }>>();
  for (const s of series) {
    const m = new Map<number, { indexed: number; label: string }>();
    for (const p of s.points) m.set(p.doy, { indexed: p.indexed, label: p.date });
    byYear.set(s.year, m);
  }

  return doys.map((doy) => {
    const row: MergedPoint = { doy, label: doyToLabel(doy) };
    for (const s of series) {
      const v = byYear.get(s.year)?.get(doy);
      if (v) row[String(s.year)] = v.indexed;
    }
    return row;
  });
}

function doyToLabel(doy: number): string {
  // approximate month label via doy thresholds (non-leap)
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
  for (let i = 0; i < 12; i++) if (doy <= cum[i + 1]) return MONTH_LABELS[i];
  return "Dec";
}

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
