export type Theme = "light" | "dark" | "system";

export function getStoredTheme(): Theme {
  const v = localStorage.getItem("theme") as Theme | null;
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
  localStorage.setItem("theme", theme);
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
