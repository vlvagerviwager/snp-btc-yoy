import { sp500Snapshot, btcSnapshot, getSeries } from "../src/lib/data";
import { overlayMerge } from "../src/lib/data";

describe("charts not empty", () => {
  it("charts have year data behind them", () => {
    expect(sp500Snapshot.yearList.length).toBeGreaterThan(0);
    expect(btcSnapshot.yearList.length).toBeGreaterThan(0);
    expect(sp500Snapshot.yearList).toContain(2010);
    expect(btcSnapshot.yearList).toContain(2010);
  });

  it("overlay has data for a valid year", () => {
    const spAll = getSeries(sp500Snapshot, sp500Snapshot.yearList);
    const btcAll = getSeries(btcSnapshot, btcSnapshot.yearList);
    const merged = overlayMerge(spAll, btcAll, 2024);
    expect(merged.length).toBeGreaterThan(100);
    expect(merged.some((d) => d.sp != null)).toBe(true);
    expect(merged.some((d) => d.btc != null)).toBe(true);
  });

  it("year data points are indexed and non-empty", () => {
    const y2020 = sp500Snapshot.years["2020"];
    expect(y2020).toBeDefined();
    expect(y2020.points.length).toBeGreaterThan(100);
    expect(y2020.points[0].indexed).toBe(100);
    const lastIndexed = y2020.points[y2020.points.length - 1].indexed;
    expect(typeof lastIndexed).toBe("number");
    expect(isNaN(lastIndexed)).toBe(false);
  });

  it("btc 2010 synthetic year exists and has points", () => {
    const btc2010 = btcSnapshot.years["2010"];
    expect(btc2010).toBeDefined();
    expect(btc2010.points.length).toBeGreaterThan(100);
    expect(btc2010.points[0].indexed).toBe(100);
  });
});
