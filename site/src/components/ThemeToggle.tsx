import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, type Theme } from "../lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const t = getStoredTheme();
    setTheme(t);
    applyTheme(t);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const cycle = () => {
    const order: Theme[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    applyTheme(next);
  };

  const label = theme === "system" ? "System" : theme === "light" ? "Light" : "Dark";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${label}. Click to change.`}
      data-testid="theme-toggle"
      className="theme-toggle"
    >
      <span aria-hidden>{theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🖥️"}</span> {label}
    </button>
  );
}
