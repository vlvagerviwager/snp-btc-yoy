import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";

describe("collapsible charts", () => {
  it("renders 3 collapse toggles", () => {
    render(<App />);
    expect(screen.getByTestId("toggle-sp500")).toBeInTheDocument();
    expect(screen.getByTestId("toggle-btc")).toBeInTheDocument();
    expect(screen.getByTestId("toggle-overlay")).toBeInTheDocument();
  });

  it("collapses and expands S&P chart", async () => {
    const user = userEvent.setup();
    render(<App />);
    const toggle = screen.getByTestId("toggle-sp500");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("chart-sp500")).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("chart-sp500")).not.toBeInTheDocument();
    expect(screen.queryByTestId("filter-sp500")).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("chart-sp500")).toBeInTheDocument();
  });

  it("collapses BTC and overlay independently", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId("toggle-btc"));
    expect(screen.queryByTestId("chart-btc")).not.toBeInTheDocument();
    expect(screen.getByTestId("chart-sp500")).toBeInTheDocument();

    await user.click(screen.getByTestId("toggle-overlay"));
    expect(screen.queryByTestId("chart-overlay")).not.toBeInTheDocument();
  });
});
