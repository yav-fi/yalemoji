export const DEFAULT_RATE_LIMIT = 5;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export type RateLimitDecision = {
  allowed: boolean;
  windowStart: number;
  retryAfterSeconds: number;
};

export function getRateLimitWindow(nowMs: number, windowMs = DEFAULT_RATE_LIMIT_WINDOW_MS) {
  return Math.floor(nowMs / windowMs) * windowMs;
}

export function decideRateLimit(
  currentCount: number,
  nowMs: number,
  limit = DEFAULT_RATE_LIMIT,
  windowMs = DEFAULT_RATE_LIMIT_WINDOW_MS
): RateLimitDecision {
  const windowStart = getRateLimitWindow(nowMs, windowMs);
  const retryAfterSeconds = Math.ceil((windowStart + windowMs - nowMs) / 1000);

  return {
    allowed: currentCount < limit,
    windowStart,
    retryAfterSeconds
  };
}
