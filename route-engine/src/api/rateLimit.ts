import type { Request, Response, NextFunction } from 'express';

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit({ limit = 60, windowMs = 60_000 } = {}) {
  return (request: Request, response: Response, next: NextFunction) => {
    const key = request.ip || 'anonymous';
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > limit) {
      response.status(429).json({
        error: 'Too many requests',
        retry_after_ms: bucket.resetAt - now,
      });
      return;
    }

    next();
  };
}
