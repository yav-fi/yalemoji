import { createHash } from "crypto";

export function hashValue(value: string, salt: string) {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}
