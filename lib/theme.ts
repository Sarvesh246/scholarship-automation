export type Theme = "light" | "dark";

const THEME_KEY = "theme";

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(THEME_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return "dark";
}

export function setTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  const body = window.document.body;
  if (!body) return;
  if (theme === "dark") {
    body.classList.add("dark");
  } else {
    body.classList.remove("dark");
  }
  window.localStorage.setItem(THEME_KEY, theme);
}

