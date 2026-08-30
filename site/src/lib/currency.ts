export type Currency = "EUR" | "USD" | "GBP" | "JPY" | "CHF" | "CAD" | "AUD";

export const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
];

// Frankfurter and exchangerate.host are free third-party FX APIs (no key)
const FX_API = "https://api.frankfurter.app/latest?from=USD";

let cachedRates: Record<string, number> | null = null;
let cachedBase = "USD";

export async function fetchFxRates(base: string = "USD"): Promise<Record<string, number>> {
  if (cachedRates && cachedBase === base) return cachedRates;
  try {
    const res = await fetch(FX_API.replace("from=USD", `from=${base}`), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`FX ${res.status}`);
    const json = (await res.json()) as { rates: Record<string, number> };
    cachedRates = json.rates;
    cachedBase = base;
    return json.rates;
  } catch {
    // fallback to exchangerate.host
    try {
      const res2 = await fetch(`https://api.exchangerate.host/latest?base=${base}`, { signal: AbortSignal.timeout(8000) });
      if (!res2.ok) throw new Error(`FX2 ${res2.status}`);
      const j2 = (await res2.json()) as { rates: Record<string, number> };
      cachedRates = j2.rates;
      cachedBase = base;
      return j2.rates;
    } catch {
      return {};
    }
  }
}

export function convertPrice(priceUsd: number, rates: Record<string, number> | undefined | null, target: Currency): number {
  if (!rates || target === "USD") return priceUsd;
  const rate = (rates as Record<string, number>)[target];
  if (!rate) return priceUsd;
  return priceUsd * rate;
}

export function formatPrice(price: number, currency: Currency): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(price);
  } catch {
    const sym = CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;
    return `${sym}${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
}
