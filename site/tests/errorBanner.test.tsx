import { render, screen, waitFor } from "@testing-library/react";
import App from "../src/App";

// Mock fetch to control FX and data responses
const originalFetch = global.fetch;

describe("error banners", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", window.location.pathname);
  });
  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
    window.history.replaceState({}, "", window.location.pathname);
  });

  it("shows fxError when FX rates fail for non-USD currency", async () => {
    // Mock fetch to fail for fx.json
    global.fetch = (() =>
      Promise.resolve({ ok: false, status: 500 } as Response)) as unknown as typeof fetch;

    localStorage.setItem("currency", "EUR");
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("fx-error")).toBeInTheDocument());
    expect(screen.getByTestId("fx-error")).toHaveTextContent("FX rates unavailable");
  });

  it("does not show fxError for USD", async () => {
    localStorage.setItem("currency", "USD");
    render(<App />);
    // USD should not trigger fxError even if fetch fails
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.queryByTestId("fx-error")).not.toBeInTheDocument();
  });

  it("shows dataError when snapshot fetch fails", async () => {
    global.fetch = ((url: string) => {
      if (url.includes("data/sp500.json") || url.includes("data/btc.json")) {
        return Promise.resolve({ ok: false, status: 500 } as Response) as unknown as Promise<Response>;
      }
      if (url.includes("data/fx.json")) {
        return Promise.resolve({ ok: true, json: async () => ({ rates: { EUR: 0.85 } }) } as Response) as unknown as Promise<Response>;
      }
      return Promise.resolve({ ok: false } as Response) as unknown as Promise<Response>;
    }) as unknown as typeof fetch;

    render(<App />);
    await waitFor(() => expect(screen.getByTestId("data-error")).toBeInTheDocument());
  });

  it("shows accuracy warning always", () => {
    render(<App />);
    expect(screen.getByTestId("accuracy-warning")).toBeInTheDocument();
    expect(screen.getByTestId("accuracy-warning")).toHaveTextContent("Accuracy is not guaranteed");
  });
});
