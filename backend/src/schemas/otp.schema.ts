import { z } from 'zod';

/**
 * Generate OTP Schema
 */
export const generateOTPSchema = z.object({
  body: z.object({
    phone_number: z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(15, 'Phone number must be less than 15 digits')
      .regex(/^[6-9]\d{9}$/, 'Invalid phone number format (must start with 6-9 and be 10 digits)'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export type GenerateOTPInput = z.infer<typeof generateOTPSchema>;

/**
 * Verify OTP Schema
 */
export const verifyOTPSchema = z.object({
  body: z.object({
    phone_number: z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(15, 'Phone number must be less than 15 digits')
      .regex(/^[6-9]\d{9}$/, 'Invalid phone number format'),
    otp_code: z
      .string()
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d{6}$/, 'OTP must contain only digits'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;
