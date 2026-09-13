import { z } from 'zod';

/* =========================================================
   CUSTOM VALIDATION FUNCTIONS
   ========================================================= */

/**
 * Validate strong password
 * Requirements: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
const isStrongPassword = (password: string): boolean => {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Validate Indian phone number (optional)
 */
const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * Check if email already exists
 */
const emailDoesNotExist = async (email: string): Promise<boolean> => {
  // This will be checked in the route handler
  return true;
};

/* =========================================================
   LOGIN SCHEMA
   ========================================================= */

/**
 * Login validation schema
 * Required: email, password
 */
export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password is required'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

/* =========================================================
   SIGNUP SCHEMA
   ========================================================= */

/**
 * Signup validation schema
 * Required: email, password
 * Optional: full_name, phone
 */
export const signupSchema = z
  .object({
    body: z.object({
      email: z
        .string({ required_error: 'Email is required' })
        .email('Invalid email address')
        .toLowerCase()
        .trim(),
      password: z
        .string({ required_error: 'Password is required' })
        .min(8, 'Password must be at least 8 characters')
        .refine(isStrongPassword, {
          message:
            'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)',
        }),
      confirmPassword: z
        .string()
        .optional(),
      full_name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name must be less than 50 characters')
        .trim()
        .optional(),
      phone: z
        .string()
        .refine(isValidPhone, {
          message: 'Invalid phone number (Indian format required)',
        })
        .optional()
        .or(z.literal('')),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  })
  .refine(
    (data) =>
      data.body.confirmPassword == null || data.body.password === data.body.confirmPassword,
    { message: 'Passwords do not match', path: ['body', 'confirmPassword'] }
  );

export type SignupInput = z.infer<typeof signupSchema>;

/* =========================================================
   CUSTOMER OTP SCHEMAS (Login / Signup via WhatsApp)
   ========================================================= */
export const otpSendSchema = z.object({
  body: z.object({
    phone_number: z
      .string({ required_error: 'Phone number is required' })
      .min(10, 'Phone number must be at least 10 digits')
      .max(15, 'Phone number too long'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const otpVerifySchema = z.object({
  body: z.object({
    phone_number: z
      .string({ required_error: 'Phone number is required' })
      .min(10, 'Phone number must be at least 10 digits'),
    otp_code: z
      .string({ required_error: 'OTP is required' })
      .length(6, 'OTP must be 6 digits')
      .regex(/^\d{6}$/, 'OTP must be 6 digits'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

/* =========================================================
   FORGOT / RESET PASSWORD SCHEMAS
   ========================================================= */
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    phone_number: z.string().min(10).optional(),
  }).refine((data) => data.email || data.phone_number, {
    message: 'Either email or phone_number is required',
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    phone_number: z.string().min(10).optional(),
    otp_code: z.string().length(6).regex(/^\d{6}$/),
    new_password: z.string().min(8).optional(),
  }).refine((data) => data.email || data.phone_number, {
    message: 'Either email or phone_number is required',
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

/* =========================================================
   UPDATE PROFILE SCHEMA
   ========================================================= */

/**
 * Update profile validation schema
 */
export const updateProfileSchema = z.object({
  body: z.object({
    full_name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must be less than 50 characters')
      .trim()
      .optional(),
    avatar_url: z
      .string()
      .url('Invalid URL format')
      .optional()
      .or(z.literal('')),
    phone: z
      .string()
      .refine(isValidPhone, {
        message: 'Invalid phone number',
      })
      .optional()
      .or(z.literal('')),
    bio: z
      .string()
      .max(500, 'Bio must be less than 500 characters')
      .trim()
      .optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/* =========================================================
   PROFILE OTP & UPDATE PHONE/EMAIL SCHEMAS
   ========================================================= */

export const verifyProfileOtpSchema = z.object({
  body: z.object({
    otp_code: z
      .string({ required_error: 'OTP is required' })
      .length(6, 'OTP must be 6 digits')
      .regex(/^\d{6}$/, 'OTP must be 6 digits'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updatePhoneSchema = z.object({
  body: z.object({
    new_phone: z
      .string({ required_error: 'New phone number is required' })
      .min(10, 'Phone number must be at least 10 digits')
      .max(15, 'Phone number too long')
      .refine(isValidPhone, { message: 'Invalid phone number' }),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateEmailSchema = z.object({
  body: z.object({
    new_email: z
      .string({ required_error: 'New email is required' })
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

/* =========================================================
   FORGOT PASSWORD (EMAIL-ONLY WITH TOKEN) SCHEMA
   ========================================================= */

/**
 * Forgot password request (email only) - for token-based reset link
 */
export const forgotPasswordEmailSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export type ForgotPasswordEmailInput = z.infer<typeof forgotPasswordEmailSchema>;

/* =========================================================
   RESET PASSWORD (TOKEN-BASED) SCHEMA
   ========================================================= */

/**
 * Reset password with token (from email link)
 */
export const resetPasswordTokenSchema = z
  .object({
    body: z.object({
      password: z
        .string({ required_error: 'Password is required' })
        .min(8, 'Password must be at least 8 characters')
        .refine(isStrongPassword, {
          message:
            'Password must contain uppercase, lowercase, number, and special character',
        }),
      confirmPassword: z
        .string({ required_error: 'Please confirm your password' }),
      token: z
        .string({ required_error: 'Reset token is required' })
        .min(1, 'Invalid token'),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  })
  .refine((data) => data.body.password === data.body.confirmPassword, {
    message: 'Passwords do not match',
    path: ['body', 'confirmPassword'],
  });

export type ResetPasswordTokenInput = z.infer<typeof resetPasswordTokenSchema>;

/* =========================================================
   REFRESH TOKEN SCHEMA
   ========================================================= */

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = z.object({
  body: z.object({
    token: z
      .string({ required_error: 'Token is required' })
      .min(1, 'Token cannot be empty'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/* =========================================================
   CHECK EMAIL SCHEMA
   ========================================================= */

/**
 * Check if email exists validation schema
 */
export const checkEmailSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export type CheckEmailInput = z.infer<typeof checkEmailSchema>;

/* =========================================================
   CHANGE PASSWORD SCHEMA
   ========================================================= */

/**
 * Change password validation schema (authenticated users)
 */
export const changePasswordSchema = z
  .object({
    body: z.object({
      currentPassword: z
        .string({ required_error: 'Current password is required' })
        .min(1, 'Current password is required'),
      newPassword: z
        .string({ required_error: 'New password is required' })
        .min(8, 'Password must be at least 8 characters')
        .refine(isStrongPassword, {
          message:
            'Password must contain uppercase, lowercase, number, and special character',
        }),
      confirmPassword: z
        .string({ required_error: 'Please confirm your password' }),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  })
  .refine((data) => data.body.newPassword === data.body.confirmPassword, {
    message: 'Passwords do not match',
    path: ['body', 'confirmPassword'],
  })
  .refine((data) => data.body.currentPassword !== data.body.newPassword, {
    message: 'New password must be different from current password',
    path: ['body', 'newPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/* =========================================================
   SET PASSWORD SCHEMA (for Google/phone users - first-time set)
   ========================================================= */

export const setPasswordSchema = z
  .object({
    body: z.object({
      new_password: z
        .string({ required_error: 'Password is required' })
        .min(8, 'Password must be at least 8 characters')
        .refine(isStrongPassword, {
          message: 'Use uppercase, lowercase, number and special character (@$!%*?&)',
        }),
      confirm_password: z.string({ required_error: 'Confirm password' }),
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  })
  .refine((data) => data.body.new_password === data.body.confirm_password, {
    message: 'Passwords do not match',
    path: ['body', 'confirm_password'],
  });

export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

/* =========================================================
   VALIDATION ERROR MESSAGES
   ========================================================= */

export const validationMessages = {
  EMAIL_REQUIRED: 'Email is required',
  EMAIL_INVALID: 'Invalid email address',
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  PASSWORD_WEAK: 'Password must contain uppercase, lowercase, number, and special character',
  PASSWORD_MISMATCH: 'Passwords do not match',
  NAME_REQUIRED: 'Name is required',
  NAME_TOO_SHORT: 'Name must be at least 2 characters',
  NAME_TOO_LONG: 'Name must be less than 50 characters',
  PHONE_INVALID: 'Invalid phone number',
  URL_INVALID: 'Invalid URL format',
  TOKEN_REQUIRED: 'Token is required',
  TOKEN_INVALID: 'Invalid token',
};