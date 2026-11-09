import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/theme-toggle";
import { THEME_STORAGE_KEY, themeScript } from "@/lib/theme";
import { ThemeUrlSync } from "@/components/theme-url-sync";

const navigation = vi.hoisted(() => ({ pathname: "/", query: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.query)
}));

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  navigation.pathname = "/";
  navigation.query = "";
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
  delete document.documentElement.dataset.theme;
});

describe("theme preference", () => {
  it.each([["dark", "dark"], ["light", "light"], ["other", "light"], ["", "light"]])("applies mode=%s ahead of the saved preference", (mode, expected) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, expected === "dark" ? "light" : "dark");
    window.history.replaceState(null, "", `/?mode=${mode}`);
    new Function(themeScript)();
    expect(document.documentElement).toHaveAttribute("data-theme", expected);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(expected);
  });

  it("honors mode even when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    window.history.replaceState(null, "", "/create?mode=dark");
    new Function(themeScript)();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("applies URL overrides on navigation and leaves the theme alone when mode is absent", () => {
    const view = render(<><ThemeUrlSync /><ThemeToggle /></>);
    navigation.pathname = "/create";
    navigation.query = "mode=dark";
    view.rerender(<><ThemeUrlSync /><ThemeToggle /></>);
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
    navigation.pathname = "/editor";
    navigation.query = "ref=coursetable";
    view.rerender(<><ThemeUrlSync /><ThemeToggle /></>);
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    navigation.query = "mode=light";
    view.rerender(<><ThemeUrlSync /><ThemeToggle /></>);
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("restores a saved dark theme before the toggle mounts", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    new Function(themeScript)();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toHaveAttribute("aria-pressed", "true");
  });

  it("switches in both directions and saves the choice", () => {
    new Function(themeScript)();
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("still switches when browser storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    new Function(themeScript)();
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("keeps the preference in sync with another tab", () => {
    render(<ThemeToggle />);
    fireEvent(window, new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "dark" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
    fireEvent(window, new StorageEvent("storage", { key: null, newValue: null }));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });
});
