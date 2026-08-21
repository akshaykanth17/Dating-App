import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [ip: string]: {
    count: number;
    resetTime: number;
  };
}

const stores: { [key: string]: RateLimitStore } = {};

/**
 * Basic in-memory rate limiter to prevent API abuse.
 * Tracks requests per IP address.
 */
export function rateLimiter(windowMs: number, maxRequests: number, key = 'default') {
  if (!stores[key]) {
    stores[key] = {};
  }
  const store = stores[key];

  // Periodically clean memory
  setInterval(() => {
    const now = Date.now();
    for (const ip in store) {
      if (now > store[ip].resetTime) {
        delete store[ip];
      }
    }
  }, 10 * 60 * 1000); // clean every 10 mins

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();

    if (!store[ip]) {
      store[ip] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    const record = store[ip];

    // If window expired, reset limit
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }

    record.count++;

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: `Too many requests on endpoint ${key}. Please retry in a few minutes.`,
      });
    }

    next();
  };
}
