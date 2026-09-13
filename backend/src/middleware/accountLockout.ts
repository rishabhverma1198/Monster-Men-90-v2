/**
 * Account Lockout Middleware
 * Prevents brute force attacks by locking accounts after failed login attempts
 */

import { supabaseAdmin } from '../config/supabase.js';
import { Request, Response, NextFunction } from 'express';

interface LockoutRecord {
  email: string;
  attempts: number;
  lockedUntil: Date | null;
}

// In-memory store (in production, use Redis)
const lockoutStore = new Map<string, LockoutRecord>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function checkAccountLockout(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { email } = req.body;

  if (!email) {
    return next();
  }

  const record = lockoutStore.get(email.toLowerCase());

  // Check if account is locked
  if (record?.lockedUntil && record.lockedUntil > new Date()) {
    const remainingMinutes = Math.ceil(
      (record.lockedUntil.getTime() - Date.now()) / 60000
    );
    return res.status(423).json({
      success: false,
      code: 'ACCOUNT_LOCKED',
      message: `Account locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
    });
  }

  // Clear lockout if expired
  if (record?.lockedUntil && record.lockedUntil <= new Date()) {
    lockoutStore.delete(email.toLowerCase());
  }

  next();
}

export function recordFailedAttempt(email: string) {
  const key = email.toLowerCase();
  const record = lockoutStore.get(key) || {
    email: key,
    attempts: 0,
    lockedUntil: null,
  };

  record.attempts += 1;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
  }

  lockoutStore.set(key, record);
}

export function clearFailedAttempts(email: string) {
  lockoutStore.delete(email.toLowerCase());
}

// Cleanup expired records every hour
setInterval(() => {
  const now = new Date();
  for (const [email, record] of lockoutStore.entries()) {
    if (record.lockedUntil && record.lockedUntil <= now) {
      lockoutStore.delete(email);
    }
  }
}, 60 * 60 * 1000);
