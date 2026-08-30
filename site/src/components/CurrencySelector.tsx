import { CURRENCIES, type Currency } from "../lib/currency";

type Props = {
  value: Currency;
  onChange: (c: Currency) => void;
};

export function CurrencySelector({ value, onChange }: Props) {
  return (
    <label className="currency-selector" style={{ display: "inline-flex", gap: 6, alignItems: "center", fontFamily: "Inter, system-ui, sans-serif", fontSize: "0.85rem" }}>
      Currency{" "}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Currency)}
        data-testid="currency-select"
        style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", padding: "5px 10px", borderRadius: 0 }}
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} - {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}
