/** Opt-in editor preview; never grants an authenticated user or API access. */
export function isLocalEditorPreview(host: string | null): boolean {
  if (process.env.NODE_ENV !== "development" || process.env.YALEMOJI_LOCAL_EDITOR !== "1") return false;
  return host !== null && /^(localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?$/i.test(host);
}
