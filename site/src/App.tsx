import { useEffect, useMemo, useState } from "react";
import { btcSnapshot, sp500Snapshot, getSeries, type Range } from "./lib/data";
import { Sp500Chart } from "./charts/Sp500Chart";
import { BtcChart } from "./charts/BtcChart";
import { OverlayChart } from "./charts/OverlayChart";
import { YearFilter } from "./components/YearFilter";
import { RangeFilter } from "./components/RangeFilter";
import { ThemeToggle } from "./components/ThemeToggle";

function useYearsParam(key: string, all: number[]): [number[], (v: number[]) => void] {
  const [selected, setSelected] = useState<number[]>(() => {
    const sp = new URLSearchParams(window.location.search).get(key);
    if (sp) {
      const parsed = sp
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => all.includes(n));
      if (parsed.length) return parsed.sort((a, b) => a - b);
    }
    return [...all];
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selected.length === all.length) url.searchParams.delete(key);
    else url.searchParams.set(key, selected.join(","));
    window.history.replaceState({}, "", url.toString());
  }, [selected, key, all]);
  return [selected, setSelected];
}

function useRangeParam(key: string, defaultRange: Range): [Range, (r: Range) => void] {
  const [range, setRange] = useState<Range>(() => {
    const v = new URLSearchParams(window.location.search).get(key) as Range | null;
    if (v && ["1d", "1w", "1m", "3m", "6m", "1y", "5y"].includes(v)) return v;
    return defaultRange;
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set(key, range);
    window.history.replaceState({}, "", url.toString());
  }, [range, key]);
  return [range, setRange];
}

export default function App() {
  const spAll = useMemo(() => sp500Snapshot.yearList, []);
  const btcAll = useMemo(() => btcSnapshot.yearList, []);
  const overlayYears = useMemo(() => {
    const s = new Set([...spAll, ...btcAll]);
    return [...s].sort((a, b) => a - b);
  }, [spAll, btcAll]);

  const [spSelected, setSpSelected] = useYearsParam("sp", spAll);
  const [btcSelected, setBtcSelected] = useYearsParam("btc", btcAll);
  const [spRange, setSpRange] = useRangeParam("spRange", "1y");
  const [btcRange, setBtcRange] = useRangeParam("btcRange", "1y");
  const [overlayRange, setOverlayRange] = useRangeParam("overlayRange", "1y");
  const [overlaySelected, setOverlaySelected] = useState<number>(() => {
    const v = new URLSearchParams(window.location.search).get("overlay");
    const n = Number(v);
    if (n && overlayYears.includes(n)) return n;
    return overlayYears[overlayYears.length - 1] ?? 2025;
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("overlay", String(overlaySelected));
    window.history.replaceState({}, "", url.toString());
  }, [overlaySelected]);

  const spSeries = useMemo(() => getSeries(sp500Snapshot, spSelected), [spSelected]);
  const btcSeries = useMemo(() => getSeries(btcSnapshot, btcSelected), [btcSelected]);
  const spAllSeries = useMemo(() => getSeries(sp500Snapshot, spAll), [spAll]);
  const btcAllSeries = useMemo(() => getSeries(btcSnapshot, btcAll), [btcAll]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>S&P 500 & BTC — YoY Performance</h1>
          <p className="subtitle">
            Indexed to Jan 1 = 100 per year. Toggle years and range to compare. Data snapshot from Yahoo Finance (S&P 500) and Yahoo/BTC synthetic 2010–2014 + Yahoo Finance 2014–present. Generated {sp500Snapshot.generatedAt.slice(0, 10)}.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <main className="grid">
        <section className="card" aria-labelledby="sp500-heading">
          <h2 id="sp500-heading">S&P 500 YoY (2010–present)</h2>
          <YearFilter years={spAll} selected={spSelected} onChange={setSpSelected} label="sp500" />
          <div className="filter-row">
            <span className="filter-label">Range:</span>
            <RangeFilter value={spRange} onChange={setSpRange} label="sp500" />
          </div>
          <Sp500Chart series={spSeries} allYears={spAll} range={spRange} />
          {spSeries.length > 0 && <p className="hint">{spSeries.length} year(s) shown · {spRange} view · Y-axis = % of Jan 1 close · hover lines for exact values</p>}
        </section>

        <section className="card" aria-labelledby="btc-heading">
          <h2 id="btc-heading">BTC YoY (2010–present)</h2>
          <YearFilter years={btcAll} selected={btcSelected} onChange={setBtcSelected} label="btc" />
          <div className="filter-row">
            <span className="filter-label">Range:</span>
            <RangeFilter value={btcRange} onChange={setBtcRange} label="btc" />
          </div>
          <BtcChart series={btcSeries} allYears={btcAll} range={btcRange} />
          {btcSeries.length > 0 && <p className="hint">{btcSeries.length} year(s) shown · {btcRange} view · BTC synthetic for 2010–2014, real from Sep 2014 · hover for exact values</p>}
        </section>

        <section className="card span2" aria-labelledby="overlay-heading">
          <h2 id="overlay-heading">Overlay — S&P 500 vs BTC ({overlaySelected})</h2>
          <div className="overlay-controls">
            <label>
              Year{" "}
              <select
                value={overlaySelected}
                onChange={(e) => setOverlaySelected(Number(e.target.value))}
                data-testid="overlay-year-select"
              >
                {overlayYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <RangeFilter value={overlayRange} onChange={setOverlayRange} label="overlay" />
            <span className="hint">Both indexed to Jan 1 = 100 — hover lines for exact % + price</span>
          </div>
          <OverlayChart spSeries={spAllSeries} btcSeries={btcAllSeries} year={overlaySelected} range={overlayRange} />
        </section>
      </main>

      <footer className="footer">
        <a href="https://github.com/vlvagerviwager/snp-btc-yoy">GitHub — snp-btc-yoy</a> · <a href="LICENSE">PolyForm Noncommercial 1.0.0</a> · Static site, no tracking.
      </footer>
    </div>
  );
}
