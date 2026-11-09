export const THEME_STORAGE_KEY = "yalemoji-theme";

// Restore the saved theme before the first paint, as in Yalies.
export const themeScript = `
  try {
    const theme = localStorage.getItem("${THEME_STORAGE_KEY}");
    document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
  } catch {
    document.documentElement.dataset.theme = "light";
  }
`;
