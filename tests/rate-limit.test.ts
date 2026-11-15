import { describe, expect, it, beforeEach } from 'vitest';
import { RATE_LIMIT, checkRateLimit, resetRateLimits } from '@/lib/rate-limit';

describe('rate limit', () => {
  beforeEach(() => resetRateLimits());

  it('allows a burst and then asks the same IP to wait', () => {
    for (let attempt = 0; attempt < RATE_LIMIT.limit; attempt += 1) {
      expect(checkRateLimit('203.0.113.4', 1_000).ok).toBe(true);
    }
    const blocked = checkRateLimit('203.0.113.4', 1_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(checkRateLimit('203.0.113.9', 1_000).ok).toBe(true);
    expect(checkRateLimit('203.0.113.4', 1_000 + RATE_LIMIT.windowMs + 1).ok).toBe(true);
  });
});
