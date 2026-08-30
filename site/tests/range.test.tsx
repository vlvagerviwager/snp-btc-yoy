import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { filterByRange } from "../src/lib/data";

describe("range filters", () => {
  it("renders 1d 1w 1m 3m 6m 1y 5y for each chart", () => {
    render(<App />);
    for (const chart of ["sp500", "btc", "overlay"]) {
      for (const r of ["1d", "1w", "1m", "3m", "6m", "1y", "5y"]) {
        expect(screen.getByTestId(`range-${chart}-${r}`)).toBeInTheDocument();
      }
    }
  });

  it("clicking range changes active state and clears year selection", async () => {
    const user = userEvent.setup();
    render(<App />);
    const btn1m = screen.getByTestId("range-sp500-1m");
    const btn1y = screen.getByTestId("range-sp500-1y");
    // Initially no range selected (year mode) -> no button pressed
    expect(btn1y).toHaveAttribute("aria-pressed", "false");
    expect(btn1m).toHaveAttribute("aria-pressed", "false");
    // year checkbox should be checked initially
    expect(screen.getByTestId("year-sp500-2026")).toBeChecked();
    await user.click(btn1m);
    expect(btn1m).toHaveAttribute("aria-pressed", "true");
    expect(btn1y).toHaveAttribute("aria-pressed", "false");
    // year selection should be cleared
    expect(screen.getByTestId("year-sp500-2026")).not.toBeChecked();
    // chart should still render (recent mode)
    expect(screen.getByTestId("chart-sp500")).toBeInTheDocument();
  });

  it("selecting a year clears range selection", async () => {
    const user = userEvent.setup();
    render(<App />);
    // first select a range to clear years
    await user.click(screen.getByTestId("range-sp500-1m"));
    expect(screen.getByTestId("range-sp500-1m")).toHaveAttribute("aria-pressed", "true");
    // now select a year checkbox -> should clear range
    const cb = screen.getByTestId("year-sp500-2025");
    await user.click(cb);
    expect(cb).toBeChecked();
    expect(screen.getByTestId("range-sp500-1m")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("range-sp500-1y")).toHaveAttribute("aria-pressed", "false");
  });

  it("filterByRange slices by doy", () => {
    const data = Array.from({ length: 365 }, (_, i) => ({ doy: i + 1, label: "Jan", v: i }));
    expect(filterByRange(data, "1d")).toHaveLength(1);
    expect(filterByRange(data, "1w")).toHaveLength(7);
    expect(filterByRange(data, "1m")).toHaveLength(30);
    expect(filterByRange(data, "1y")).toHaveLength(365);
    expect(filterByRange(data, "5y")).toHaveLength(365); // capped to full year
    expect(filterByRange(data, null)).toHaveLength(365); // null = no filter
  });
});
