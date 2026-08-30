import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import type { YearSeries } from "../types";
import { overlayMerge } from "../lib/data";

export function OverlayChart({ spSeries, btcSeries, year }: { spSeries: YearSeries[]; btcSeries: YearSeries[]; year: number }) {
  const data = overlayMerge(spSeries, btcSeries, year);
  if (data.length === 0) return <p data-testid="empty-overlay">No data for {year} (BTC data starts 2010 synthetic, 2014 real).</p>;
  const hasSp = data.some((d) => d.sp != null);
  const hasBtc = data.some((d) => d.btc != null);
  if (!hasSp && !hasBtc) return <p data-testid="empty-overlay">No data for {year}.</p>;
  return (
    <div data-testid="chart-overlay" style={{ width: "100%", height: 360 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="label" interval={29} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} label={{ value: "Indexed (Jan 1 = 100)", angle: -90, position: "insideLeft", fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="sp" name={`S&P 500 ${year}`} stroke="#2563eb" dot={false} strokeWidth={2} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="btc" name={`BTC ${year}`} stroke="#f59e0b" dot={false} strokeWidth={2} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
