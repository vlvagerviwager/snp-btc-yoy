export type Theme = "light" | "dark";

export function getStoredTheme(): Theme | null {
  const v = localStorage.getItem("theme") as Theme | null;
  if (v === "light" || v === "dark") return v;
  return null;
}

export function getEffectiveTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}
