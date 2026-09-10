import type { YearSeries } from "../types";
import { sp500Snapshot, type Range } from "../lib/data";
import type { Currency } from "../lib/currency";
import { YoYChart } from "./YoYChart";

export function Sp500Chart({ series, allYears, range, currency, rates }: { series: YearSeries[]; allYears: number[]; range: Range | null; currency: Currency; rates: Record<string, number> | undefined | null }) {
  return <YoYChart series={series} allYears={allYears} range={range} currency={currency} rates={rates} snapshot={sp500Snapshot} color="#2563eb" testId="chart-sp500" emptyTestId="empty-sp500" name="S&P 500" />;
}
