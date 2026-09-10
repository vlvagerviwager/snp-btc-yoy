import { formatDayMonthYear, isoFromYearDoy } from "../lib/format";
import { convertPrice, formatPrice, type Currency } from "../lib/currency";

type YoYTooltipProps = {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: number;
  currency: Currency;
  rates: Record<string, number> | undefined | null;
};

export function YoYTooltip({ active, payload, currency, rates }: YoYTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = (payload[0] as unknown as { payload: Record<string, unknown> }).payload as Record<string, unknown>;
  const doy = row.doy as number;
  // Use first year in payload to derive representative date for header
  const firstYear = payload[0] ? Number(payload[0].dataKey) : new Date().getUTCFullYear();
  const headerIso = isoFromYearDoy(firstYear, doy);
  const headerDate = formatDayMonthYear(headerIso);
  return (
    <div className="custom-tooltip" style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 0, padding: "8px 10px", fontSize: 12, color: "var(--fg)" }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--fg)" }}>{headerDate} (doy {doy})</div>
      {payload.map((p) => {
        const year = p.dataKey;
        const priceUsd = row[`${year}_price`] as number | undefined;
        if (p.value == null) return null;
        const priceStr = priceUsd != null ? formatPrice(convertPrice(priceUsd, rates, currency), currency) : "";
        return (
          <div key={year} style={{ color: p.color }}>
            {year}: {p.value.toFixed(2)}%{priceStr ? `, ${priceStr}` : ""}
          </div>
        );
      })}
    </div>
  );
}

type OverlayTooltipProps = {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; name: string }>;
  label?: number;
  currency: Currency;
  rates: Record<string, number> | undefined | null;
  year: number;
};

export function OverlayTooltip({ active, payload, currency, rates, year }: OverlayTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = (payload[0] as unknown as { payload: Record<string, unknown> }).payload as Record<string, unknown>;
  const doy = row.doy as number;
  const iso = isoFromYearDoy(year, doy);
  const header = `${formatDayMonthYear(iso)} (doy ${doy})`;
  return (
    <div className="custom-tooltip" style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 0, padding: "8px 10px", fontSize: 12, color: "var(--fg)" }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--fg)" }}>{header}</div>
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

export function RecentTooltip({
  iso,
  indexed,
  close,
  currency,
  rates,
  label,
}: {
  iso: string;
  indexed: number;
  close: number;
  currency: Currency;
  rates: Record<string, number> | undefined | null;
  label: string;
}) {
  const doy = Math.ceil((new Date(iso + "T00:00:00Z").getTime() - new Date(Date.UTC(new Date(iso).getUTCFullYear(), 0, 0)).getTime()) / 86400000);
  const header = `${formatDayMonthYear(iso)} (doy ${doy})`;
  const priceStr = formatPrice(convertPrice(close, rates, currency), currency);
  return (
    <div className="custom-tooltip" style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 0, padding: "8px 10px", fontSize: 12, color: "var(--fg)" }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--fg)" }}>{header}</div>
      <div style={{ color: label.includes("S&P") ? "#2563eb" : "#f59e0b" }}>{label}: {indexed.toFixed(2)}%, {priceStr}</div>
    </div>
  );
}
