import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import type { YearSeries } from "../types";
import type { Snapshot } from "../types";
import { COLORS, mergeSeriesByDoy, filterByRange, doyToLabel, MONTH_STARTS, getRecentSeries, type Range } from "../lib/data";
import { YoYTooltip } from "../components/ChartTooltip";
import type { Currency } from "../lib/currency";
import { formatDayMonthYear } from "../lib/format";
import { convertPrice, formatPrice } from "../lib/currency";

type Props = {
  series: YearSeries[];
  allYears: number[];
  range: Range | null;
  currency: Currency;
  rates: Record<string, number> | undefined | null;
  snapshot: Snapshot;
  color: string;
  testId: string;
  emptyTestId: string;
  name: string;
};

export function YoYChart({ series, allYears, range, currency, rates, snapshot, color, testId, emptyTestId, name }: Props) {
  if (series.length === 0) {
    if (!range) return <p data-testid={emptyTestId}>No years selected. Select a year or a range.</p>;
    const recent = getRecentSeries(snapshot, range);
    if (recent.length === 0) return <p data-testid={emptyTestId}>No data for range {range}.</p>;
    return (
      <div data-testid={testId} style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer>
          <LineChart data={recent} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--fg)" }} interval={Math.max(0, Math.floor(recent.length / 6) - 1)} />
            <YAxis tick={{ fontSize: 11, fill: "var(--fg)" }} domain={["auto", "auto"]} label={{ value: `Indexed (start of ${range} = 100)`, angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--fg)" }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = payload[0].payload as { date: string; iso: string; close: number; indexed: number };
                const doy = Math.ceil((new Date(row.iso + "T00:00:00Z").getTime() - new Date(Date.UTC(new Date(row.iso).getUTCFullYear(), 0, 0)).getTime()) / 86400000);
                const header = `${formatDayMonthYear(row.iso)} (doy ${doy})`;
                const priceStr = formatPrice(convertPrice(row.close, rates, currency), currency);
                return (
                  <div className="custom-tooltip" style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 0, padding: "8px 10px", fontSize: 12, color: "var(--fg)" }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--fg)" }}>{header}</div>
                    <div style={{ color }}>{name}: {row.indexed.toFixed(2)}%, {priceStr}</div>
                  </div>
                );
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="indexed" name={`${name} last ${range}`} stroke={color} dot={false} activeDot={{ r: 4 }} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
  const merged = mergeSeriesByDoy(series);
  const data = filterByRange(merged, range);
  return (
    <div data-testid={testId} style={{ width: "100%", height: 360 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="doy" type="number" domain={[1, 365]} ticks={[...MONTH_STARTS, 365]} tickFormatter={(doy) => (doy === 365 ? "" : doyToLabel(doy))} tick={{ fontSize: 11, fill: "var(--fg)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--fg)" }} domain={["auto", "auto"]} label={{ value: "Indexed (Jan 1 = 100)", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--fg)" }} />
          <Tooltip content={<YoYTooltip currency={currency} rates={rates} />} />
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
