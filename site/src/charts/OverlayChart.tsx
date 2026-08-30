import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import type { YearSeries } from "../types";
import { overlayMerge, filterByRange, doyToLabel, MONTH_STARTS, getRecentOverlay, sp500Snapshot, btcSnapshot, type Range } from "../lib/data";
import { formatExactDate, isoFromYearDoy } from "../lib/format";
import { convertPrice, formatPrice, type Currency } from "../lib/currency";

function OverlayTooltip({
  active,
  payload,
  currency,
  rates,
  year,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; name: string }>;
  label?: number;
  currency: Currency;
  rates: Record<string, number> | undefined | null;
  year: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = (payload[0] as unknown as { payload: Record<string, unknown> }).payload as Record<string, unknown>;
  const doy = row.doy as number;
  const iso = isoFromYearDoy(year, doy);
  const exact = formatExactDate(iso, doy);
  return (
    <div className="custom-tooltip" style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "var(--fg)" }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--fg)" }}>{exact}</div>
      {payload.map((p) => {
        if (p.value == null) return null;
        const isSp = p.dataKey === "sp";
        const priceUsd = isSp ? (row.spPrice as number | null) : (row.btcPrice as number | null);
        const priceStr = priceUsd != null ? formatPrice(convertPrice(priceUsd, rates, currency), currency) : "";
        return (
          <div key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {p.value.toFixed(2)}% {priceStr ? `, ${priceStr}` : ""}
          </div>
        );
      })}
    </div>
  );
}

export function OverlayChart({ spSeries, btcSeries, year, range, currency, rates }: { spSeries: YearSeries[]; btcSeries: YearSeries[]; year: number | null; range: Range | null; currency: Currency; rates: Record<string, number> | undefined | null }) {
  // Recent mode: no year selected, range selected -> show past range overlay
  if (year == null) {
    if (!range) return <p data-testid="empty-overlay">Select a year or a range to compare.</p>;
    const recent = getRecentOverlay(sp500Snapshot, btcSnapshot, range);
    if (recent.length === 0) return <p data-testid="empty-overlay">No data for range {range}.</p>;
    return (
      <div data-testid="chart-overlay" style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer>
          <LineChart data={recent} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--fg)" }} interval={Math.max(0, Math.floor(recent.length / 6) - 1)} />
            <YAxis tick={{ fontSize: 11, fill: "var(--fg)" }} domain={["auto", "auto"]} label={{ value: `Indexed (start of ${range} = 100)`, angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--fg)" }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = (payload[0].payload as { iso: string; sp: number | null; btc: number | null; spPrice: number | null; btcPrice: number | null });
                const doy = Math.ceil((new Date(row.iso + "T00:00:00Z").getTime() - new Date(Date.UTC(new Date(row.iso).getUTCFullYear(), 0, 0)).getTime()) / 86400000);
                const exact = formatExactDate(row.iso, doy);
                return (
                  <div className="custom-tooltip" style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "var(--fg)" }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--fg)" }}>{exact}</div>
                    {row.sp != null && <div style={{ color: "#2563eb" }}>S&P 500: {row.sp.toFixed(2)}% {row.spPrice != null ? `, ${formatPrice(convertPrice(row.spPrice, rates, currency), currency)}` : ""}</div>}
                    {row.btc != null && <div style={{ color: "#f59e0b" }}>BTC: {row.btc.toFixed(2)}% {row.btcPrice != null ? `, ${formatPrice(convertPrice(row.btcPrice, rates, currency), currency)}` : ""}</div>}
                  </div>
                );
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="sp" name={`S&P 500 last ${range}`} stroke="#2563eb" dot={false} activeDot={{ r: 4 }} strokeWidth={2} connectNulls isAnimationActive={false} />
            <Line type="monotone" dataKey="btc" name={`BTC last ${range}`} stroke="#f59e0b" dot={false} activeDot={{ r: 4 }} strokeWidth={2} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
  const merged = overlayMerge(spSeries, btcSeries, year);
  const data = filterByRange(merged, range);
  if (merged.length === 0) return <p data-testid="empty-overlay">No data for {year} (BTC data starts 2010 synthetic, 2014 real).</p>;
  const hasSp = merged.some((d) => d.sp != null);
  const hasBtc = merged.some((d) => d.btc != null);
  if (!hasSp && !hasBtc) return <p data-testid="empty-overlay">No data for {year}.</p>;
  if (data.length === 0) return <p data-testid="empty-overlay">No data in range {range} for {year}.</p>;
  return (
    <div data-testid="chart-overlay" style={{ width: "100%", height: 360 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="doy" type="number" domain={[1, 365]} ticks={[...MONTH_STARTS, 365]} tickFormatter={(doy) => (doy === 365 ? "" : doyToLabel(doy))} tick={{ fontSize: 11, fill: "var(--fg)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--fg)" }} domain={["auto", "auto"]} label={{ value: "Indexed (Jan 1 = 100)", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--fg)" }} />
          <Tooltip content={<OverlayTooltip currency={currency} rates={rates} year={year} />} />
          <Legend />
          <Line type="monotone" dataKey="sp" name={`S&P 500 ${year}`} stroke="#2563eb" dot={false} activeDot={{ r: 4 }} strokeWidth={2} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="btc" name={`BTC ${year}`} stroke="#f59e0b" dot={false} activeDot={{ r: 4 }} strokeWidth={2} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
