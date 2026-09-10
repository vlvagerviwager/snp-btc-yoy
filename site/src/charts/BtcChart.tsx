import type { YearSeries } from "../types";
import { btcSnapshot, type Range } from "../lib/data";
import type { Currency } from "../lib/currency";
import { YoYChart } from "./YoYChart";

export function BtcChart({ series, allYears, range, currency, rates }: { series: YearSeries[]; allYears: number[]; range: Range | null; currency: Currency; rates: Record<string, number> | undefined | null }) {
  return <YoYChart series={series} allYears={allYears} range={range} currency={currency} rates={rates} snapshot={btcSnapshot} color="#f59e0b" testId="chart-btc" emptyTestId="empty-btc" name="BTC" />;
}
