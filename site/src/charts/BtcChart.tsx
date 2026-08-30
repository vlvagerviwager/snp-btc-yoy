import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import type { YearSeries } from "../types";
import { COLORS, mergeSeriesByDoy, filterByRange, doyToLabel, MONTH_STARTS, getRecentSeries, btcSnapshot, type Range } from "../lib/data";

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: number }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = (payload[0] as unknown as { payload: Record<string, unknown> }).payload as Record<string, unknown>;
  const monthLabel = typeof label === "number" ? doyToLabel(label) : String(label ?? "");
  return (
    <div className="custom-tooltip" style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "var(--fg)" }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--fg)" }}>{monthLabel} (doy {row.doy as number})</div>
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

export function BtcChart({ series, allYears, range }: { series: YearSeries[]; allYears: number[]; range: Range | null }) {
  if (series.length === 0) {
    if (!range) return <p data-testid="empty-btc">No years selected. Select a year or a range.</p>;
    const recent = getRecentSeries(btcSnapshot, range);
    if (recent.length === 0) return <p data-testid="empty-btc">No data for range {range}.</p>;
    return (
      <div data-testid="chart-btc" style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer>
          <LineChart data={recent} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--fg)" }} interval={Math.max(0, Math.floor(recent.length / 6) - 1)} />
            <YAxis tick={{ fontSize: 11, fill: "var(--fg)" }} domain={["auto", "auto"]} label={{ value: `Indexed (start of ${range} = 100)`, angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--fg)" }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = (payload[0].payload as { date: string; iso: string; close: number; indexed: number });
                return (
                  <div className="custom-tooltip" style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "var(--fg)" }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--fg)" }}>{row.iso}</div>
                    <div style={{ color: "#f59e0b" }}>BTC: {row.indexed.toFixed(2)}% · ${row.close.toLocaleString()}</div>
                  </div>
                );
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="indexed" name={`BTC last ${range}`} stroke="#f59e0b" dot={false} activeDot={{ r: 4 }} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
  const merged = mergeSeriesByDoy(series);
  const data = filterByRange(merged, range);
  return (
    <div data-testid="chart-btc" style={{ width: "100%", height: 360 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="doy" type="number" domain={["dataMin", "dataMax"]} ticks={MONTH_STARTS.filter((d) => d >= (data[0]?.doy ?? 1) && d <= (data[data.length - 1]?.doy ?? 365))} tickFormatter={doyToLabel} tick={{ fontSize: 11, fill: "var(--fg)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--fg)" }} domain={["auto", "auto"]} label={{ value: "Indexed (Jan 1 = 100)", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--fg)" }} />
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
