import type { AvatarConfig } from "@/lib/avatar-config";

export const MAX_DESIGN_NAME = 60;
export const MAX_LISTED_DESIGNS = 100;
// Documentation and tests only: the bucket lifecycle rule enforces this, and
// the two must match.
export const DESIGN_ASSET_GRACE_DAYS = 14;

export type RawDesign = {
  version: number;
  name?: unknown;
  config?: unknown;
  pngUrl?: unknown;
  backgroundUrl?: unknown;
  createdAt: string | null;
};

export type Design = {
  version: number;
  name: string;
  config: AvatarConfig;
  pngUrl: string;
  backgroundUrl: string;
  createdAt: string;
  isCurrent: boolean;
};

export function defaultDesignName(existingCount: number | null): string {
  return existingCount === null ? "Untitled" : `Untitled ${existingCount + 1}`;
}

export function validateDesignName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  if (/[\u0000-\u001f\u007f]/.test(input)) return null;
  const name = input.trim().replace(/\s+/g, " ");
  const length = [...name].length;
  return length >= 1 && length <= MAX_DESIGN_NAME ? name : null;
}

export function parseDesignVersion(raw: unknown): number | null {
  return typeof raw === "string" && /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}

export function displayDesigns(raw: RawDesign[], currentVersion: number | null): Design[] {
  const designs: Design[] = [];
  for (const { version, name, config, pngUrl, backgroundUrl, createdAt } of raw) {
    if (typeof config !== "object" || config === null) continue;
    if (typeof pngUrl !== "string" || typeof backgroundUrl !== "string") continue;
    if (createdAt === null) continue;
    designs.push({
      version,
      name: validateDesignName(name) ?? `Untitled ${version}`,
      config: config as AvatarConfig,
      pngUrl,
      backgroundUrl,
      createdAt,
      isCurrent: version === currentVersion
    });
  }
  return designs.sort((a, b) => b.version - a.version);
}

// Very short "how long ago" for design cards: now, 33s ago, 4m ago, 4h ago,
// 23d ago, last month, 5mo ago, last year, 2y ago. A future time (clock skew)
// reads as "now".
export function formatShortAge(fromIso: string, nowMs: number): string {
  const seconds = Math.floor((nowMs - Date.parse(fromIso)) / 1000);
  if (!Number.isFinite(seconds) || seconds < 5) return "now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  if (days < 60) return "last month";
  if (days < 360) return `${Math.floor(days / 30)}mo ago`; // never "12mo ago"
  if (days < 730) return "last year";
  return `${Math.floor(days / 365)}y ago`;
}
