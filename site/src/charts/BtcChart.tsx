import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import type { YearSeries } from "../types";
import { COLORS, mergeSeriesByDoy, filterByRange, type Range } from "../lib/data";

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = (payload[0] as unknown as { payload: Record<string, unknown> }).payload as Record<string, unknown>;
  return (
    <div className="custom-tooltip" style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label} (doy {row.doy as number})</div>
      {payload.map((p) => {
        const year = p.dataKey;
        const price = row[`${year}_price`] as number | undefined;
        const date = row[`${year}_date`] as string | undefined;
        if (p.value == null) return null;
        return (
          <div key={year} style={{ color: p.color }}>
            {year} {date ? `(${date})` : ""}: {p.value.toFixed(2)}% {price != null ? `· $${Number(price).toLocaleString()}` : ""}
          </div>
        );
      })}
    </div>
  );
}

export function BtcChart({ series, allYears, range }: { series: YearSeries[]; allYears: number[]; range: Range }) {
  if (series.length === 0) return <p data-testid="empty-btc">No years selected.</p>;
  const merged = mergeSeriesByDoy(series);
  const data = filterByRange(merged, range);
  return (
    <div data-testid="chart-btc" style={{ width: "100%", height: 360 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="label" interval={Math.max(0, Math.floor(data.length / 12) - 1)} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} label={{ value: "Indexed (Jan 1 = 100)", angle: -90, position: "insideLeft", fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {series.map((s) => (
            <Line
              key={s.year}
              type="monotone"
              dataKey={String(s.year)}
              stroke={COLORS(s.year, allYears)}
              dot={false}
              activeDot={{ r: 4 }}
              strokeWidth={1.5}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
