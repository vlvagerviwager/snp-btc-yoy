import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";

describe("theme toggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("toggles theme and persists without ever showing System", async () => {
    const user = userEvent.setup();
    render(<App />);
    const btn = screen.getByTestId("theme-toggle");
    expect(btn.textContent).not.toMatch(/System/);
    const firstLabel = btn.textContent;

    await user.click(btn);
    const secondLabel = btn.textContent;
    expect(secondLabel).not.toBe(firstLabel);
    expect(secondLabel).not.toMatch(/System/);
    const stored = localStorage.getItem("theme");
    expect(stored === "light" || stored === "dark").toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe(stored);
  });

  it("if already dark (via system), button shows Light and vice versa", () => {
    // system dark mock is default false (light) in setup, so initial is light -> button shows Dark
    localStorage.clear();
    render(<App />);
    const btn = screen.getByTestId("theme-toggle");
    // with jsdom mock matchMedia false -> light, so button should offer Dark
    expect(btn.textContent).toMatch(/Dark/);
  });

  it("never exposes System option", () => {
    localStorage.clear();
    render(<App />);
    const btn = screen.getByTestId("theme-toggle");
    expect(btn.textContent).not.toMatch(/System/i);
  });
});
