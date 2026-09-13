import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { sendResponse, sendError, asyncHandler } from '../server.js';
import { validate } from '../middleware/validate.js';
import { generateOTPSchema, verifyOTPSchema } from '../schemas/otp.schema.js';
import { publicLimiter } from '../middleware/rateLimiter.js';
import { generateOTPLink } from '../services/whatsapp.service.js';
import jwt from 'jsonwebtoken';

const router = Router();

/**
 * Generate 6-digit OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate JWT Token for admin
 */
function generateToken(user: {
  id: string;
  email: string;
  role: string;
}) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
}

/* =========================================================
   GENERATE OTP (Admin Only)
   ========================================================= */
router.post(
  '/generate',
  publicLimiter,
  validate(generateOTPSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { phone_number } = req.body;
    const reqAny = req as any;

    // STEP 1: Find admin user by phone number
    // Note: Using phone_number column (Supabase schema)
    // Using is_active instead of status (Supabase schema)
    // otp_enabled is optional - if column doesn't exist, allow OTP by default
    // REMOVED contact_number and whatsapp_number - columns don't exist in Supabase
    // Only selecting columns that exist: phone_number, is_active
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, phone_number, is_active')
      .eq('phone_number', phone_number)
      .eq('role', 'admin')
      .eq('is_active', true)
      .single();

    if (profileError) {
      console.error('❌ Supabase query error:', JSON.stringify(profileError, null, 2));
      console.error('❌ Phone number searched:', phone_number);
      return sendError(res, 'NOT_FOUND', `Database error: ${profileError.message}`, 404, reqAny.id);
    }

    if (!profile) {
      console.error('❌ Profile not found for phone:', phone_number);
      console.error('❌ Query filters: phone_number=', phone_number, ', role=admin, is_active=true');
      return sendError(res, 'NOT_FOUND', 'Admin account not found with this phone number. Please check: 1) Phone number matches exactly, 2) Role is admin, 3) Account is active', 404, reqAny.id);
    }

    console.log('✅ Profile found:', { id: profile.id, email: profile.email, phone: profile.phone_number, role: profile.role, is_active: profile.is_active });

    // STEP 2: Check if OTP login is enabled (optional - if column exists)
    // If otp_enabled column doesn't exist in schema, allow OTP login by default
    // Try to fetch otp_enabled separately, but don't fail if column doesn't exist
    try {
      const { data: profileWithOTP } = await supabaseAdmin
        .from('profiles')
        .select('otp_enabled')
        .eq('id', profile.id)
        .single();
      
      if (profileWithOTP?.otp_enabled === false) {
        return sendError(res, 'OTP_DISABLED', 'OTP login is not enabled for this account', 403, reqAny.id);
      }
    } catch (otpCheckError: any) {
      // If otp_enabled column doesn't exist, ignore error and allow OTP
      if (otpCheckError?.code !== '42703') { // 42703 = column doesn't exist
        console.warn('Warning: Could not check OTP enabled status:', otpCheckError?.message);
      }
      // Continue - allow OTP by default if column doesn't exist
    }

    // STEP 3: Check for recent OTP requests (rate limiting)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const { count: recentOTPs } = await supabaseAdmin
      .from('admin_otps')
      .select('id', { count: 'exact', head: true })
      .eq('phone_number', phone_number)
      .eq('is_used', false)
      .gte('created_at', fiveMinutesAgo.toISOString());

    if (recentOTPs && recentOTPs > 0) {
      return sendError(res, 'RATE_LIMIT', 'Please wait before requesting a new OTP', 429, reqAny.id);
    }

    // STEP 4: Invalidate old unused OTPs for this phone
    await supabaseAdmin
      .from('admin_otps')
      .update({ is_used: true })
      .eq('phone_number', phone_number)
      .eq('is_used', false);

    // STEP 5: Generate new OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('admin_otps')
      .insert([
        {
          phone_number,
          otp_code: otpCode,
          user_id: profile.id,
          expires_at: expiresAt.toISOString(),
          attempts: 0,
          max_attempts: 3,
          is_used: false,
        },
      ])
      .select()
      .single();

    if (otpError) {
      console.error('❌ OTP Insert Error:', JSON.stringify(otpError, null, 2));
      // Check if table doesn't exist
      if (otpError.code === '42P01' || otpError.message?.includes('does not exist')) {
        return sendError(res, 'OTP_ERROR', 'admin_otps table does not exist. Please run CREATE_ADMIN_OTPS_TABLE.sql in Supabase SQL Editor.', 500, reqAny.id);
      }
      return sendError(res, 'OTP_ERROR', `Failed to generate OTP: ${otpError.message}`, 500, reqAny.id);
    }

    if (!otpRecord) {
      return sendError(res, 'OTP_ERROR', 'Failed to generate OTP. Please try again.', 500, reqAny.id);
    }

    // STEP 6: Generate WhatsApp OTP Link (FREE TIER - No paid SMS service)
    // Admin ko WhatsApp link generate karke OTP share karna
    // Priority: phone_number > env variable
    // REMOVED whatsapp_number and contact_number - columns don't exist
    const adminPhone = profile.phone_number || process.env.ADMIN_PHONE || '';
    let whatsappLink = null;
    
    if (adminPhone) {
      whatsappLink = generateOTPLink(adminPhone, otpCode);
    }
    
    const isDevelopment = process.env.NODE_ENV !== 'production';

    sendResponse(
      res,
      {
        message: 'OTP generated successfully',
        expires_in: 300, // 5 minutes in seconds
        whatsapp_link: whatsappLink, // WhatsApp link for OTP (FREE TIER)
        ...(isDevelopment && { otp: otpCode }), // Only in development - remove in production
      },
      whatsappLink 
        ? 'Click the WhatsApp link to receive your OTP' 
        : 'OTP generated. Please check your admin settings for WhatsApp number.',
      200
    );
  })
);

/* =========================================================
   VERIFY OTP (Admin Only)
   ========================================================= */
router.post(
  '/verify',
  publicLimiter,
  validate(verifyOTPSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { phone_number, otp_code } = req.body;
    const reqAny = req as any;

    // STEP 1: Find valid OTP record
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('admin_otps')
      .select('*')
      .eq('phone_number', phone_number)
      .eq('otp_code', otp_code)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      return sendError(res, 'INVALID_OTP', 'Invalid OTP code', 401, reqAny.id);
    }

    // STEP 2: Check if OTP is expired
    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);
    if (now > expiresAt) {
      // Mark as used
      await supabaseAdmin
        .from('admin_otps')
        .update({ is_used: true })
        .eq('id', otpRecord.id);
      return sendError(res, 'OTP_EXPIRED', 'OTP has expired. Please request a new one.', 401, reqAny.id);
    }

    // STEP 3: Check attempts
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      await supabaseAdmin
        .from('admin_otps')
        .update({ is_used: true })
        .eq('id', otpRecord.id);
      return sendError(res, 'MAX_ATTEMPTS', 'Maximum OTP verification attempts exceeded', 429, reqAny.id);
    }

    // STEP 4: Verify OTP
    if (otpRecord.otp_code !== otp_code) {
      // Increment attempts
      await supabaseAdmin
        .from('admin_otps')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      const remainingAttempts = otpRecord.max_attempts - (otpRecord.attempts + 1);
      return sendError(
        res,
        'INVALID_OTP',
        `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`,
        401,
        reqAny.id
      );
    }

    // STEP 5: Mark OTP as used
    await supabaseAdmin
      .from('admin_otps')
      .update({ is_used: true })
      .eq('id', otpRecord.id);

    // STEP 6: Get admin profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', otpRecord.user_id)
      .single();

    if (profileError || !profile) {
      return sendError(res, 'PROFILE_ERROR', 'Admin profile not found', 404, reqAny.id);
    }

    // Check if account is active (using is_active instead of status)
    if (profile.is_active === false) {
      return sendError(res, 'ACCOUNT_DISABLED', 'Account is disabled', 403, reqAny.id);
    }

    // STEP 7: Generate JWT token
    const token = generateToken({
      id: profile.id,
      email: profile.email,
      role: profile.role,
    });

    sendResponse(
      res,
      {
        user: profile,
        token,
      },
      'OTP verified successfully. Login successful.',
      200
    );
  })
);

export default router;
