export const THEME_STORAGE_KEY = "yalemoji-theme";
export const THEME_CHANGE_EVENT = "yalemoji-theme-change";

export function applyTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Keep the theme usable when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

// Restore the saved theme before the first paint, as in Yalies.
export const themeScript = `
  {
    const mode = new URLSearchParams(window.location.search).get("mode");
    let theme = "light";
    if (mode !== null) {
      theme = mode === "dark" ? "dark" : "light";
      try { localStorage.setItem("${THEME_STORAGE_KEY}", theme); } catch {}
    } else {
      try { theme = localStorage.getItem("${THEME_STORAGE_KEY}") === "dark" ? "dark" : "light"; } catch {}
    }
    document.documentElement.dataset.theme = theme;
  }
`;
