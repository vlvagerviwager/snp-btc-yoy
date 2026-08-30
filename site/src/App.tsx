import { useEffect, useMemo, useState } from "react";
import { btcSnapshot, sp500Snapshot, getSeries, type Range } from "./lib/data";
import { Sp500Chart } from "./charts/Sp500Chart";
import { BtcChart } from "./charts/BtcChart";
import { OverlayChart } from "./charts/OverlayChart";
import { YearFilter } from "./components/YearFilter";
import { RangeFilter } from "./components/RangeFilter";
import { ThemeToggle } from "./components/ThemeToggle";
import { CurrencySelector } from "./components/CurrencySelector";
import { fetchFxRates, type Currency, CURRENCIES } from "./lib/currency";

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
    else if (selected.length === 0) url.searchParams.delete(key);
    else url.searchParams.set(key, selected.join(","));
    window.history.replaceState({}, "", url.toString());
  }, [selected, key, all]);
  return [selected, setSelected];
}

function useRangeParam(key: string): [Range | null, (r: Range | null) => void] {
  const [range, setRange] = useState<Range | null>(() => {
    const v = new URLSearchParams(window.location.search).get(key) as Range | null;
    if (v && ["1d", "1w", "1m", "3m", "6m", "1y", "5y"].includes(v)) return v;
    return null;
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    if (range) url.searchParams.set(key, range);
    else url.searchParams.delete(key);
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
  const [spRange, setSpRange] = useRangeParam("spRange");
  const [btcRange, setBtcRange] = useRangeParam("btcRange");
  const [overlayRange, setOverlayRange] = useRangeParam("overlayRange");
  const [overlaySelected, setOverlaySelected] = useState<number | null>(() => {
    const v = new URLSearchParams(window.location.search).get("overlay");
    const n = Number(v);
    if (n && overlayYears.includes(n)) return n;
    return overlayYears[overlayYears.length - 1] ?? 2025;
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    if (overlaySelected == null) url.searchParams.delete("overlay");
    else url.searchParams.set("overlay", String(overlaySelected));
    window.history.replaceState({}, "", url.toString());
  }, [overlaySelected]);

  const spSeries = useMemo(() => getSeries(sp500Snapshot, spSelected), [spSelected]);
  const btcSeries = useMemo(() => getSeries(btcSnapshot, btcSelected), [btcSelected]);
  const spAllSeries = useMemo(() => getSeries(sp500Snapshot, spAll), [spAll]);
  const btcAllSeries = useMemo(() => getSeries(btcSnapshot, btcAll), [btcAll]);

  const [currency, setCurrency] = useState<Currency>(() => {
    const urlVal = new URLSearchParams(window.location.search).get("currency") as Currency | null;
    if (urlVal && (CURRENCIES as readonly { code: string }[]).some((c) => c.code === urlVal)) return urlVal;
    const stored = localStorage.getItem("currency") as Currency | null;
    if (stored && (CURRENCIES as readonly { code: string }[]).some((c) => c.code === stored)) return stored;
    return "EUR";
  });
  const [rates, setRates] = useState<Record<string, number>>({});
  useEffect(() => {
    localStorage.setItem("currency", currency);
    const url = new URL(window.location.href);
    url.searchParams.set("currency", currency);
    window.history.replaceState({}, "", url.toString());
  }, [currency]);
  useEffect(() => {
    if (currency === "USD") {
      setRates({});
      return;
    }
    // Try live API first, fallback to static fx.json built at data-fetch time
    const load = async () => {
      try {
        const live = await fetchFxRates("USD");
        if (live && Object.keys(live).length > 0 && live[currency]) {
          setRates(live);
          return;
        }
      } catch {}
      try {
        const base = import.meta.env.BASE_URL || "/";
        const res = await fetch(`${base}data/fx.json`);
        if (res.ok) {
          const j = (await res.json()) as { rates: Record<string, number> };
          if (j.rates && j.rates[currency]) {
            setRates(j.rates);
            return;
          }
        }
      } catch {}
      // last resort: keep empty (will show USD fallback)
    };
    load();
  }, [currency]);

  const [spCollapsed, setSpCollapsed] = useState(false);
  const [btcCollapsed, setBtcCollapsed] = useState(false);
  const [overlayCollapsed, setOverlayCollapsed] = useState(false);

  // Mutual exclusivity handlers
  const handleSpYearChange = (next: number[]) => {
    setSpSelected(next);
    if (next.length > 0) setSpRange(null);
  };
  const handleSpRangeChange = (r: Range) => {
    setSpRange(r);
    setSpSelected([]);
  };
  const handleBtcYearChange = (next: number[]) => {
    setBtcSelected(next);
    if (next.length > 0) setBtcRange(null);
  };
  const handleBtcRangeChange = (r: Range) => {
    setBtcRange(r);
    setBtcSelected([]);
  };
  const handleOverlayYearChange = (y: number | null) => {
    setOverlaySelected(y);
    if (y != null) setOverlayRange(null);
  };
  const handleOverlayRangeChange = (r: Range) => {
    setOverlayRange(r);
    setOverlaySelected(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>S&P 500 & BTC: YoY Performance</h1>
          <p className="subtitle">
            Indexed to Jan 1 = 100 per year. Toggle years and range to compare. Data snapshot from Yahoo Finance (S&P 500) and Yahoo/BTC synthetic 2010-2014 + Yahoo Finance 2014-present. Generated {sp500Snapshot.generatedAt.slice(0, 10)}.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <CurrencySelector value={currency} onChange={setCurrency} />
          <ThemeToggle />
        </div>
      </header>

      <main className="grid">
        <section className="card" aria-labelledby="sp500-heading">
          <div className="card-header">
            <h2 id="sp500-heading">S&P 500 YoY (2010-present)</h2>
            <button
              type="button"
              aria-expanded={!spCollapsed}
              aria-controls="sp500-content"
              data-testid="toggle-sp500"
              className="collapse-btn"
              onClick={() => setSpCollapsed((v) => !v)}
            >
              {spCollapsed ? "Expand" : "Collapse"} <span aria-hidden>{spCollapsed ? "▸" : "▾"}</span>
            </button>
          </div>
          {!spCollapsed && (
            <div id="sp500-content">
              <YearFilter years={spAll} selected={spSelected} onChange={handleSpYearChange} label="sp500" />
              <div className="filter-row">
                <span className="filter-label">Range:</span>
                <RangeFilter value={spRange} onChange={handleSpRangeChange} label="sp500" />
              </div>
              <Sp500Chart series={spSeries} allYears={spAll} range={spRange} currency={currency} rates={rates} />
              {spSeries.length > 0 ? (
                <p className="hint">{spSeries.length} year(s) shown, full year view, Y-axis = % of Jan 1 close, hover lines for exact values</p>
              ) : spRange ? (
                <p className="hint">Showing S&P 500 performance in past {spRange}, indexed to start of range, hover for exact values</p>
              ) : null}
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="btc-heading">
          <div className="card-header">
            <h2 id="btc-heading">BTC YoY (2010-present)</h2>
            <button
              type="button"
              aria-expanded={!btcCollapsed}
              aria-controls="btc-content"
              data-testid="toggle-btc"
              className="collapse-btn"
              onClick={() => setBtcCollapsed((v) => !v)}
            >
              {btcCollapsed ? "Expand" : "Collapse"} <span aria-hidden>{btcCollapsed ? "▸" : "▾"}</span>
            </button>
          </div>
          {!btcCollapsed && (
            <div id="btc-content">
              <YearFilter years={btcAll} selected={btcSelected} onChange={handleBtcYearChange} label="btc" />
              <div className="filter-row">
                <span className="filter-label">Range:</span>
                <RangeFilter value={btcRange} onChange={handleBtcRangeChange} label="btc" />
              </div>
              <BtcChart series={btcSeries} allYears={btcAll} range={btcRange} currency={currency} rates={rates} />
              {btcSeries.length > 0 ? (
                <p className="hint">{btcSeries.length} year(s) shown, full year view, BTC synthetic for 2010-2014, real from Sep 2014, hover for exact values</p>
              ) : btcRange ? (
                <p className="hint">Showing BTC performance in past {btcRange}, indexed to start of range, hover for exact values</p>
              ) : null}
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="overlay-heading">
          <div className="card-header">
            <h2 id="overlay-heading">Overlay: S&P 500 vs BTC {overlaySelected ? `(${overlaySelected})` : overlayRange ? `(last ${overlayRange})` : ""}</h2>
            <button
              type="button"
              aria-expanded={!overlayCollapsed}
              aria-controls="overlay-content"
              data-testid="toggle-overlay"
              className="collapse-btn"
              onClick={() => setOverlayCollapsed((v) => !v)}
            >
              {overlayCollapsed ? "Expand" : "Collapse"} <span aria-hidden>{overlayCollapsed ? "▸" : "▾"}</span>
            </button>
          </div>
          {!overlayCollapsed && (
            <div id="overlay-content">
              <div className="overlay-controls">
                <label>
                  Year{" "}
                  <select
                    value={overlaySelected ?? ""}
                    onChange={(e) => {
                      const v = e.target.value ? Number(e.target.value) : null;
                      handleOverlayYearChange(v);
                    }}
                    data-testid="overlay-year-select"
                  >
                    <option value="">Select year</option>
                    {overlayYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
                <RangeFilter value={overlayRange} onChange={handleOverlayRangeChange} label="overlay" />
                <span className="hint">Both indexed to {overlayRange ? `start of last ${overlayRange}` : "Jan 1 = 100"}, hover lines for exact % + price</span>
              </div>
              <OverlayChart spSeries={spAllSeries} btcSeries={btcAllSeries} year={overlaySelected} range={overlayRange} currency={currency} rates={rates} />
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <a href="https://github.com/vlvagerviwager/snp-btc-yoy">GitHub: snp-btc-yoy</a>, <a href="LICENSE">PolyForm Noncommercial 1.0.0</a>, Static site, no tracking.
      </footer>
    </div>
  );
}
