/*
  * Rate limiting middleware.
  * Uses express-rate-limit under the hood but disables it in test mode so that tests can run without worrying about 
  * hitting the limit.
  */

import rateLimit from 'express-rate-limit';

const passThrough = (req, res, next) => next();

export function createRateLimiter(options) {
  if (process.env.NODE_ENV === 'test') return passThrough;

  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });
}

export default createRateLimiter;
