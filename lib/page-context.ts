import { normalizeAppRef } from "@/config/yale-apps";

export const LOGIN_CONTEXT_COOKIE = "yalemoji_login_context";

export function getPageContext(query: string | URLSearchParams): string {
  const source = new URLSearchParams(query);
  const context = new URLSearchParams();
  if (source.has("ref")) context.set("ref", normalizeAppRef(source.get("ref")));
  if (source.has("mode")) context.set("mode", source.get("mode") === "dark" ? "dark" : "light");
  return context.toString();
}

export function withPageContext(href: string, query: string | URLSearchParams): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const target = new URL(href, "https://yalemoji.com");
  for (const [key, value] of new URLSearchParams(getPageContext(query))) target.searchParams.set(key, value);
  return `${target.pathname}${target.search}${target.hash}`;
}
