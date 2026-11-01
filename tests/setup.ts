import "@testing-library/jest-dom/vitest";

// Node 22+ defines its own global localStorage/sessionStorage (undefined unless
// started with --localstorage-file), which hides jsdom's. Use jsdom's.
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window;
for (const name of ["localStorage", "sessionStorage"] as const) {
  if (jsdomWindow && !globalThis[name]) {
    Object.defineProperty(globalThis, name, { configurable: true, value: jsdomWindow[name] });
  }
}
