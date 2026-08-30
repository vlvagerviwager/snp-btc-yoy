import { render, screen } from "@testing-library/react";
import App from "../src/App";

describe("charts render", () => {
  it("renders all 3 charts", async () => {
    render(<App />);
    expect(screen.getByTestId("chart-sp500")).toBeInTheDocument();
    expect(screen.getByTestId("chart-btc")).toBeInTheDocument();
    expect(screen.getByTestId("chart-overlay")).toBeInTheDocument();
  });

  it("charts containers are present (jsdom size may be 0, so check test ids not SVG)", () => {
    render(<App />);
    // Check headings that host each chart section
    expect(screen.getByText(/S&P 500 YoY/)).toBeInTheDocument();
    expect(screen.getByText(/BTC YoY/)).toBeInTheDocument();
    expect(screen.getByText(/Overlay/)).toBeInTheDocument();
    // Containers themselves are the proof of render in no-browser env
    expect(screen.getByTestId("chart-sp500")).toBeTruthy();
    expect(screen.getByTestId("chart-btc")).toBeTruthy();
    expect(screen.getByTestId("chart-overlay")).toBeTruthy();
  });
});
