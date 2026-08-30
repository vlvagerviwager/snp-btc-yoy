import { describe, it, expect } from "vitest";
import { mergeSeriesByDoy, overlayMerge } from "../src/lib/data";
import type { YearSeries } from "../src/types";

function makeSeries(year: number, closes: number[]): YearSeries {
  return {
    year,
    jan1Close: closes[0],
    points: closes.map((c, i) => ({
      doy: i + 1,
      date: `01-${String(i + 1).padStart(2, "0")}`,
      iso: `${year}-01-${String(i + 1).padStart(2, "0")}`,
      close: c,
      indexed: Number(((c / closes[0]) * 100).toFixed(4)),
    })),
  };
}

describe("mergeSeriesByDoy", () => {
  it("merges indexed values by doy", () => {
    const s1 = makeSeries(2024, [100, 110, 105]);
    const s2 = makeSeries(2025, [200, 220, 210]);
    const merged = mergeSeriesByDoy([s1, s2]);
    expect(merged[0]["2024"]).toBe(100);
    expect(merged[0]["2025"]).toBe(100);
    expect(merged[1]["2024"]).toBe(110);
    expect(merged[1]["2025"]).toBe(110);
  });
});

describe("overlayMerge", () => {
  it("overlays sp and btc indexed to same doy", () => {
    const sp = [makeSeries(2024, [100, 110])];
    const btc = [makeSeries(2024, [50000, 55000])];
    const out = overlayMerge(sp, btc, 2024);
    expect(out[0].sp).toBe(100);
    expect(out[0].btc).toBe(100);
    expect(out[1].sp).toBe(110);
    expect(out[1].btc).toBe(110);
  });
});
