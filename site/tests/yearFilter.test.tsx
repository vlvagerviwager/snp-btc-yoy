import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";

describe("year filter", () => {
  it("can deselect a year and shows empty state when all deselected", async () => {
    const user = userEvent.setup();
    render(<App />);

    // sp500 filter has checkbox for 2024
    const cb2024 = screen.getByTestId("year-sp500-2024");
    expect(cb2024).toBeChecked();

    await user.click(cb2024);
    expect(cb2024).not.toBeChecked();

    // deselect all via None button
    const noneBtn = screen.getByTestId("none-sp500");
    await user.click(noneBtn);

    // should show empty message
    expect(screen.getByTestId("empty-sp500")).toBeInTheDocument();

    // All restores
    const allBtn = screen.getByTestId("all-sp500");
    await user.click(allBtn);
    expect(screen.getByTestId("chart-sp500")).toBeInTheDocument();
    expect(screen.getByTestId("year-sp500-2024")).toBeChecked();
  });

  it("overlay year selector changes year", async () => {
    const user = userEvent.setup();
    render(<App />);
    const sel = screen.getByTestId("overlay-year-select") as HTMLSelectElement;
    const initial = sel.value;
    await user.selectOptions(sel, "2015");
    expect(sel.value).toBe("2015");
    expect(screen.getByTestId("chart-overlay")).toBeInTheDocument();
    // doesn't show empty for valid year
    expect(screen.queryByTestId("empty-overlay")).not.toBeInTheDocument();
    // restore
    await user.selectOptions(sel, initial);
  });
});
