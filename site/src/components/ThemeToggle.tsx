import { useEffect, useState } from "react";
import { applyTheme, getEffectiveTheme, type Theme } from "../lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const eff = getEffectiveTheme();
    setTheme(eff);
    applyTheme(eff);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      // only follow system if no explicit stored preference
      if (!localStorage.getItem("theme")) {
        const next = mq.matches ? "dark" : "light";
        setTheme(next);
        applyTheme(next);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  // Display the *opposite* so user knows what clicking will switch to
  // Requirement: if already dark (via system or stored), display "Light" and vice versa
  const label = theme === "dark" ? "Light" : "Dark";
  const icon = theme === "dark" ? "☀️" : "🌙";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${label} mode (currently ${theme})`}
      data-testid="theme-toggle"
      className="theme-toggle"
    >
      <span aria-hidden>{icon}</span> {label}
    </button>
  );
}
