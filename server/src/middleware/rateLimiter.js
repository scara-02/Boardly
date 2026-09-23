const { getRedisClient, isRedisAvailable } = require('../utils/redis');
const AppError = require('../utils/AppError');

/**
 * Per-tenant sliding window rate limiter using Redis sorted sets.
 *
 * Algorithm:
 * 1. Remove all entries older than (now - windowMs) from the sorted set
 * 2. Count remaining entries
 * 3. If under limit, add current timestamp and allow request
 * 4. If over limit, reject with 429
 *
 * Fail-open: if Redis is unavailable, the request is allowed through
 * with a logged warning.
 */
async function rateLimiter(req, res, next) {
  try {
    // Skip rate limiting if tenant context is not yet available
    // (e.g., for public routes like signup/login that run before auth)
    if (!req.tenant) {
      return next();
    }

    const redis = await getRedisClient();

    // Fail open if Redis is not available
    if (!redis || !isRedisAvailable()) {
      console.warn('[RateLimiter] Redis unavailable — failing open');
      return next();
    }

    const tenantId = req.tenantId.toString();
    const rateLimit = req.tenant.settings?.rateLimit || 100;
    const windowMs = 60 * 60 * 1000; // 1 hour sliding window
    const key = `ratelimit:${tenantId}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Atomic pipeline: remove old entries, count, add new, set TTL
    const results = await redis
      .multi()
      .zRemRangeByScore(key, 0, windowStart)
      .zCard(key)
      .zAdd(key, { score: now, value: `${now}:${Math.random().toString(36).slice(2, 8)}` })
      .expire(key, Math.ceil(windowMs / 1000))
      .exec();

    const currentCount = results[1]; // zCard result

    // Set rate limit headers
    res.set('X-RateLimit-Limit', String(rateLimit));
    res.set('X-RateLimit-Remaining', String(Math.max(0, rateLimit - currentCount - 1)));
    res.set('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));

    if (currentCount >= rateLimit) {
      const retryAfter = Math.ceil(windowMs / 1000);
      throw AppError.tooManyRequests(
        `Rate limit exceeded. Limit: ${rateLimit} requests per hour.`,
        retryAfter
      );
    }

    next();
  } catch (err) {
    if (err.statusCode === 429) {
      return next(err);
    }
    // Any Redis error — fail open
    console.warn('[RateLimiter] Error — failing open:', err.message);
    next();
  }
}

module.exports = rateLimiter;
