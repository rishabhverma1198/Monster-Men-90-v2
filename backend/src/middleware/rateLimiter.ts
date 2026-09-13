import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

function shouldSkipRateLimit(req: Request): boolean {
  // Never allow bypass in production.
  if (process.env.NODE_ENV === 'production') return false;

  // Playwright / E2E can opt-in with an explicit header.
  // This prevents rate-limit state from leaking across repeated local test runs.
  return req.header('x-e2e-test') === '1';
}

export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: shouldSkipRateLimit,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  skip: shouldSkipRateLimit,
});

export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased from 50 to 200 for admin operations
  skip: shouldSkipRateLimit,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again later.',
});

/** Stricter limit for auth-sensitive routes: login, signup, OTP send, forgot-password */
export const authStrictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip: shouldSkipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many authentication attempts. Please try again later.',
});