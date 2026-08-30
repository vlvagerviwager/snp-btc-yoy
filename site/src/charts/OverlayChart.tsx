import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import type { YearSeries } from "../types";
import { overlayMerge, filterByRange, type Range } from "../lib/data";

function OverlayTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string; name: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = (payload[0] as unknown as { payload: Record<string, unknown> }).payload as Record<string, unknown>;
  return (
    <div className="custom-tooltip" style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label} (doy {row.doy as number})</div>
      {payload.map((p) => {
        if (p.value == null) return null;
        const isSp = p.dataKey === "sp";
        const price = isSp ? (row.spPrice as number | null) : (row.btcPrice as number | null);
        return (
          <div key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {p.value.toFixed(2)}% {price != null ? `· $${Number(price).toLocaleString()}` : ""}
          </div>
        );
      })}
    </div>
  );
}

export function OverlayChart({ spSeries, btcSeries, year, range }: { spSeries: YearSeries[]; btcSeries: YearSeries[]; year: number; range: Range }) {
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
          <XAxis dataKey="label" interval={Math.max(0, Math.floor(data.length / 12) - 1)} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} label={{ value: "Indexed (Jan 1 = 100)", angle: -90, position: "insideLeft", fontSize: 11 }} />
          <Tooltip content={<OverlayTooltip />} />
          <Legend />
          <Line type="monotone" dataKey="sp" name={`S&P 500 ${year}`} stroke="#2563eb" dot={false} activeDot={{ r: 4 }} strokeWidth={2} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="btc" name={`BTC ${year}`} stroke="#f59e0b" dot={false} activeDot={{ r: 4 }} strokeWidth={2} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
