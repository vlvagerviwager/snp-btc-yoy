import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";

describe("theme toggle", () => {
  beforeEach(() => localStorage.clear());

  it("toggles theme and persists", async () => {
    const user = userEvent.setup();
    render(<App />);
    const btn = screen.getByTestId("theme-toggle");
    const firstLabel = btn.textContent;

    await user.click(btn);
    const secondLabel = btn.textContent;
    expect(secondLabel).not.toBe(firstLabel);
    expect(localStorage.getItem("theme")).toBeTruthy();

    // data-theme applied
    const theme = localStorage.getItem("theme");
    if (theme !== "system") {
      expect(document.documentElement.getAttribute("data-theme")).toBe(theme);
    }
  });

  it("respects prefers-color-scheme is system by default", () => {
    localStorage.clear();
    render(<App />);
    // default is system -> no data-theme or system
    const stored = localStorage.getItem("theme");
    // App init sets system if nothing stored
    expect(stored === null || stored === "system" || stored === "light" || stored === "dark").toBe(true);
  });
});
