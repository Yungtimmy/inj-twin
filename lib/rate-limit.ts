export const RATE_LIMIT = {
  limit: 10,
  windowMs: 10 * 60 * 1000,
};

type Bucket = number[];

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  ip: string,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfterMs: number } {
  const key = ip.trim() || 'unknown';
  const windowStart = now - RATE_LIMIT.windowMs;
  const recent = (buckets.get(key) ?? []).filter((stamp) => stamp > windowStart);
  if (recent.length >= RATE_LIMIT.limit) {
    buckets.set(key, recent);
    const retryAfterMs = Math.max(0, recent[0]! + RATE_LIMIT.windowMs - now);
    return { ok: false, retryAfterMs };
  }
  recent.push(now);
  buckets.set(key, recent);
  return { ok: true };
}

export function resetRateLimits(): void {
  buckets.clear();
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}
