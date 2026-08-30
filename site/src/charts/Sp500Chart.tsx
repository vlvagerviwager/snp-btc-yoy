import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import type { YearSeries } from "../types";
import { COLORS, mergeSeriesByDoy } from "../lib/data";

export function Sp500Chart({ series, allYears }: { series: YearSeries[]; allYears: number[] }) {
  if (series.length === 0) {
    return <p data-testid="empty-sp500">No years selected.</p>;
  }
  const data = mergeSeriesByDoy(series);
  return (
    <div data-testid="chart-sp500" style={{ width: "100%", height: 360 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="label" interval={29} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} label={{ value: "Indexed (Jan 1 = 100)", angle: -90, position: "insideLeft", fontSize: 11 }} />
          <Tooltip />
          <Legend />
          {series.map((s) => (
            <Line
              key={s.year}
              type="monotone"
              dataKey={String(s.year)}
              stroke={COLORS(s.year, allYears)}
              dot={false}
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
