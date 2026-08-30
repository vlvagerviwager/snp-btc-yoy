import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { convertPrice, formatPrice } from "../src/lib/currency";
import { formatExactDate } from "../src/lib/format";

describe("currency selector", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders currency dropdown with EUR default", () => {
    render(<App />);
    const sel = screen.getByTestId("currency-select") as HTMLSelectElement;
    expect(sel).toBeInTheDocument();
    expect(sel.value).toBe("EUR");
  });

  it("changes currency and persists", async () => {
    const user = userEvent.setup();
    render(<App />);
    const sel = screen.getByTestId("currency-select") as HTMLSelectElement;
    await user.selectOptions(sel, "USD");
    expect(sel.value).toBe("USD");
    expect(localStorage.getItem("currency")).toBe("USD");
  });

  it("convertPrice uses FX rates", () => {
    const rates = { EUR: 0.85889, GBP: 0.73624, JPY: 159.68 };
    expect(convertPrice(78804, rates, "EUR")).toBeCloseTo(67683.97, 1);
    expect(convertPrice(78804, rates, "GBP")).toBeCloseTo(58018.66, 1);
    expect(convertPrice(78804, rates, "JPY")).toBeCloseTo(12583423, 0);
    expect(convertPrice(78804, {}, "EUR")).toBe(78804); // fallback to USD when no rate
    expect(convertPrice(78804, undefined as unknown as Record<string, number>, "EUR")).toBe(78804);
  });

  it("formatPrice shows currency symbol", () => {
    const eur = formatPrice(67683.97, "EUR");
    expect(eur).toMatch(/€|EUR/);
    const jpy = formatPrice(12583423, "JPY");
    expect(jpy).toMatch(/¥|JPY/);
  });

  it("tooltip shows exact date with doy (20th April 2026, Monday)", () => {
    // 2026-04-20 is Monday, doy 110
    expect(formatExactDate("2026-04-20", 110)).toBe("20th April 2026, Monday, doy 110");
    expect(formatExactDate("2026-01-01", 1)).toBe("1st January 2026, Thursday, doy 1");
    expect(formatExactDate("2026-08-30", 242)).toMatch(/30th August 2026/);
  });
});
