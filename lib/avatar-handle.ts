import { isValidNetid } from "@/lib/auth";

export function parseHandle(handle: string): { netid: string; ext: "svg" | "png" } | null {
  const dotIndex = handle.lastIndexOf(".");
  if (dotIndex <= 0) return null;

  const netid = handle.slice(0, dotIndex);
  const ext = handle.slice(dotIndex + 1);
  if (ext !== "svg" && ext !== "png") return null;
  if (!isValidNetid(netid)) return null;

  return { netid, ext };
}
