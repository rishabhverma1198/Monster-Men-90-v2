import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { sendResponse, sendError, requireAuth, asyncHandler } from '../server.js';
import { validate } from '../middleware/validate.js';
import {
  loginSchema,
  signupSchema,
  otpSendSchema,
  otpVerifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyProfileOtpSchema,
  updatePhoneSchema,
  updateEmailSchema,
  setPasswordSchema,
} from '../schemas/auth.schema.js';
import { generateCustomerOTPLink } from '../services/whatsapp.service.js';
import { upload } from '../middleware/upload.js';
import { authLimiter, publicLimiter, authStrictLimiter } from '../middleware/rateLimiter.js';
import {
  checkAccountLockout,
  recordFailedAttempt,
  clearFailedAttempts,
} from '../middleware/accountLockout.js';
import { v4 as uuidv4 } from 'uuid';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

const router = Router();

/* =========================================================
   JWT TOKEN HELPER (ROLE INCLUDED)
   ========================================================= */
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
   SIGNUP
   ========================================================= */
router.post(
  '/signup',
  authStrictLimiter,
  publicLimiter,
  validate(signupSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, full_name } = req.body;

    const { data: authData, error: authError } =
      await supabase.auth.signUp({ email, password });

    if (authError || !authData.user) {
      return sendError(res, 'AUTH_ERROR', authError?.message || 'Signup failed', 400);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email,
          full_name: full_name || 'User',
          role: 'buyer',
          is_active: true,
        },
      ])
      .select()
      .single();

    if (profileError || !profile) {
      // ROLLBACK: Delete auth user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        console.error('Failed to rollback auth user:', deleteError);
      }
      return sendError(res, 'PROFILE_ERROR', 'Profile creation failed. Please try again.', 500);
    }

    const token = generateToken(profile);

    sendResponse(res, {
      user: profile,
      token,
    }, 'Signup successful', 201);
  })
);

/* =========================================================
   LOGIN  ✅ ROLE SAFE
   ========================================================= */
router.post(
  '/login',
  authStrictLimiter,
  publicLimiter,
  checkAccountLockout,
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      recordFailedAttempt(email);
      return sendError(res, 'AUTH_ERROR', 'Invalid email or password', 401);
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(email);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      return sendError(res, 'PROFILE_ERROR', 'User profile not found', 404);
    }

    if (!profile.is_active) {
      return sendError(res, 'ACCOUNT_DISABLED', 'Account disabled', 403);
    }

    const token = generateToken(profile);

    sendResponse(res, {
      user: profile,
      token,
    }, 'Login successful');
  })
);

/* =========================================================
   CHECK IF USER EXISTS (by email or phone) - for Login/Signup flow
   ========================================================= */
router.get(
  '/check',
  publicLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const identifier = String(req.query.identifier || '').trim();
    if (!identifier) {
      return sendError(res, 'VALIDATION_ERROR', 'identifier (email or phone) required', 400);
    }
    const isEmail = identifier.includes('@') && identifier.length > 5;
    if (isEmail) {
      const email = identifier.toLowerCase();
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, auth_method')
        .eq('email', email)
        .maybeSingle();
      const payload: { exists: boolean; type: 'email'; auth_method?: string } = {
        exists: !!profile,
        type: 'email',
      };
      if (profile && (profile as any).auth_method) payload.auth_method = (profile as any).auth_method;
      return sendResponse(res, payload);
    }
    const phone = identifier.replace(/\D/g, '').slice(-10);
    if (phone.length < 10) {
      return sendError(res, 'VALIDATION_ERROR', 'Valid email or 10-digit phone required', 400);
    }
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone_number', phone)
      .maybeSingle();
    sendResponse(res, { exists: !!profile, type: 'phone' as const });
  })
);

/* =========================================================
   GET PROFILE
   ========================================================= */
router.get(
  '/profile',
  authLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.id;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return sendError(res, 'PROFILE_ERROR', 'Profile not found', 404);
    }

    sendResponse(res, profile);
  })
);

/* =========================================================
   PUT PROFILE (full_name, avatar_url only; phone/email via OTP flows)
   ========================================================= */
router.put(
  '/profile',
  authLimiter,
  requireAuth,
  validate(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.id;
    const body = (req.body as any) || {};
    const updateData: { full_name?: string; avatar_url?: string | null } = {};

    if (body.full_name !== undefined && body.full_name !== null && String(body.full_name).trim() !== '') {
      updateData.full_name = String(body.full_name).trim();
    }
    if (body.avatar_url !== undefined && body.avatar_url !== null) {
      updateData.avatar_url = String(body.avatar_url).trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Provide full_name and/or avatar_url to update', 400);
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      return sendError(res, 'PROFILE_ERROR', error.message || 'Update failed', 400);
    }

    sendResponse(res, profile, 'Profile updated');
  })
);

/* =========================================================
   UPLOAD PROFILE PICTURE (any authenticated user)
   ========================================================= */
router.post(
  '/upload',
  authLimiter,
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const userId = reqAny.user?.id;

    if (!req.file) {
      return sendError(res, 'VALIDATION_ERROR', 'No file uploaded', 400, reqAny.id);
    }

    if (!req.file.mimetype.startsWith('image/')) {
      return sendError(res, 'VALIDATION_ERROR', 'Only images are allowed', 400, reqAny.id);
    }

    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const filePath = `avatars/${userId}/${uuidv4()}.${ext}`;
    const bucketName = 'product-images';

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      return sendError(res, 'UPLOAD_ERROR', `Upload failed: ${uploadError.message}`, 500, reqAny.id);
    }

    const { data: urlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);

    sendResponse(res, {
      url: urlData.publicUrl,
      path: filePath,
    }, 'Upload successful');
  })
);

/* =========================================================
   SEND OTP TO CURRENT PHONE (for change phone)
   ========================================================= */
router.post(
  '/profile/send-phone-otp',
  authLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const userId = (req as AuthenticatedRequest).user.id;

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('phone_number')
      .eq('id', userId)
      .single();

    if (profileErr || !profile?.phone_number) {
      return sendError(res, 'PROFILE_ERROR', 'No phone number on profile. Add one first.', 400, reqAny.id);
    }

    const phone_number = String(profile.phone_number).replace(/\D/g, '').slice(-10);
    if (phone_number.length < 10) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid phone number on profile', 400, reqAny.id);
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const { count } = await supabaseAdmin
      .from('user_otps')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('purpose', 'change_phone')
      .eq('is_used', false)
      .gte('created_at', fiveMinutesAgo.toISOString());

    if (count && count > 0) {
      return sendError(res, 'RATE_LIMIT', 'Please wait before requesting a new OTP', 429, reqAny.id);
    }

    await supabaseAdmin
      .from('user_otps')
      .update({ is_used: true })
      .eq('user_id', userId)
      .eq('purpose', 'change_phone')
      .eq('is_used', false);

    const otp_code = generateOTP();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000);

    const { error: insertErr } = await supabaseAdmin.from('user_otps').insert({
      user_id: userId,
      phone_number,
      otp_code,
      expires_at: expires_at.toISOString(),
      purpose: 'change_phone',
    });

    if (insertErr) {
      return sendError(res, 'OTP_ERROR', 'Could not send OTP. Please try again.', 500, reqAny.id);
    }

    const whatsapp_url = generateCustomerOTPLink(phone_number, otp_code, 'change_phone');
    console.log('Profile change-phone OTP:', { phone_number, otp_code, whatsapp_url });

    sendResponse(res, {
      message: 'OTP sent to your current phone. Open the WhatsApp link to receive it.',
      whatsapp_url,
      expires_in_seconds: 300,
    });
  })
);

/* =========================================================
   VERIFY OTP FOR CHANGE PHONE (then user can call PUT /profile/phone)
   ========================================================= */
router.post(
  '/profile/verify-phone-otp',
  authLimiter,
  requireAuth,
  validate(verifyProfileOtpSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const userId = (req as AuthenticatedRequest).user.id;
    const otp_code = (req.body as any).otp_code?.trim() || '';

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('phone_number')
      .eq('id', userId)
      .single();

    const phone_number = profile?.phone_number ? String(profile.phone_number).replace(/\D/g, '').slice(-10) : '';

    const { data: otpRow, error: otpErr } = await supabaseAdmin
      .from('user_otps')
      .select('*')
      .eq('user_id', userId)
      .eq('phone_number', phone_number)
      .eq('otp_code', otp_code)
      .eq('purpose', 'change_phone')
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpErr || !otpRow) {
      return sendError(res, 'INVALID_OTP', 'Invalid or expired OTP', 400, reqAny.id);
    }

    const expiresAt = new Date(otpRow.expires_at);
    if (expiresAt < new Date()) {
      await supabaseAdmin.from('user_otps').update({ is_used: true }).eq('id', otpRow.id);
      return sendError(res, 'OTP_EXPIRED', 'OTP has expired. Request a new one.', 400, reqAny.id);
    }

    await supabaseAdmin
      .from('user_otps')
      .update({ is_used: true, verified_at: new Date().toISOString() })
      .eq('id', otpRow.id);

    sendResponse(res, { verified: true, message: 'Phone verification successful. You can now set your new number.' });
  })
);

/* =========================================================
   UPDATE PHONE (after verifying OTP on current phone)
   ========================================================= */
router.put(
  '/profile/phone',
  authLimiter,
  requireAuth,
  validate(updatePhoneSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const userId = (req as AuthenticatedRequest).user.id;
    const new_phone = String((req.body as any).new_phone).replace(/\D/g, '').slice(-10);

    if (new_phone.length < 10) {
      return sendError(res, 'VALIDATION_ERROR', 'Valid 10-digit phone number required', 400, reqAny.id);
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const { data: verifiedRow } = await supabaseAdmin
      .from('user_otps')
      .select('id')
      .eq('user_id', userId)
      .eq('purpose', 'change_phone')
      .eq('is_used', true)
      .not('verified_at', 'is', null)
      .gte('verified_at', tenMinutesAgo.toISOString())
      .order('verified_at', { ascending: false })
      .limit(1)
      .single();

    if (!verifiedRow) {
      return sendError(res, 'VERIFICATION_REQUIRED', 'Verify your current phone with OTP first', 400, reqAny.id);
    }

    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({ phone_number: new_phone })
      .eq('id', userId);

    if (updateErr) {
      return sendError(res, 'PROFILE_ERROR', updateErr.message || 'Failed to update phone', 400, reqAny.id);
    }

    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
    sendResponse(res, profile, 'Phone number updated');
  })
);

/* =========================================================
   SEND OTP TO CURRENT EMAIL (for change email)
   ========================================================= */
router.post(
  '/profile/send-email-otp',
  authLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const userId = (req as AuthenticatedRequest).user.id;

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (profileErr || !profile?.email) {
      return sendError(res, 'PROFILE_ERROR', 'No email on profile.', 400, reqAny.id);
    }

    const email = String(profile.email).toLowerCase().trim();
    if (!email || !email.includes('@')) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid email on profile', 400, reqAny.id);
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const { count } = await supabaseAdmin
      .from('user_otps')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('purpose', 'change_email')
      .eq('is_used', false)
      .gte('created_at', fiveMinutesAgo.toISOString());

    if (count && count > 0) {
      return sendError(res, 'RATE_LIMIT', 'Please wait before requesting a new OTP', 429, reqAny.id);
    }

    await supabaseAdmin
      .from('user_otps')
      .update({ is_used: true })
      .eq('user_id', userId)
      .eq('purpose', 'change_email')
      .eq('is_used', false);

    const otp_code = generateOTP();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000);

    const { error: insertErr } = await supabaseAdmin.from('user_otps').insert({
      user_id: userId,
      email,
      otp_code,
      expires_at: expires_at.toISOString(),
      purpose: 'change_email',
    });

    if (insertErr) {
      return sendError(res, 'OTP_ERROR', 'Could not send OTP. Please try again.', 500, reqAny.id);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Profile change-email OTP (dev):', { email, otp_code });
    }

    sendResponse(res, {
      message: 'OTP sent to your current email. Check your inbox (and spam). In dev, OTP is logged on server.',
      expires_in_seconds: 300,
    });
  })
);

/* =========================================================
   VERIFY OTP FOR CHANGE EMAIL (then user can call PUT /profile/email)
   ========================================================= */
router.post(
  '/profile/verify-email-otp',
  authLimiter,
  requireAuth,
  validate(verifyProfileOtpSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const userId = (req as AuthenticatedRequest).user.id;
    const otp_code = (req.body as any).otp_code?.trim() || '';

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    const email = profile?.email ? String(profile.email).toLowerCase().trim() : '';

    const { data: otpRow, error: otpErr } = await supabaseAdmin
      .from('user_otps')
      .select('*')
      .eq('user_id', userId)
      .eq('email', email)
      .eq('otp_code', otp_code)
      .eq('purpose', 'change_email')
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpErr || !otpRow) {
      return sendError(res, 'INVALID_OTP', 'Invalid or expired OTP', 400, reqAny.id);
    }

    const expiresAt = new Date(otpRow.expires_at);
    if (expiresAt < new Date()) {
      await supabaseAdmin.from('user_otps').update({ is_used: true }).eq('id', otpRow.id);
      return sendError(res, 'OTP_EXPIRED', 'OTP has expired. Request a new one.', 400, reqAny.id);
    }

    await supabaseAdmin
      .from('user_otps')
      .update({ is_used: true, verified_at: new Date().toISOString() })
      .eq('id', otpRow.id);

    sendResponse(res, { verified: true, message: 'Email verification successful. You can now set your new email.' });
  })
);

/* =========================================================
   UPDATE EMAIL (after verifying OTP on current email)
   ========================================================= */
router.put(
  '/profile/email',
  authLimiter,
  requireAuth,
  validate(updateEmailSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const userId = (req as AuthenticatedRequest).user.id;
    const new_email = String((req.body as any).new_email).toLowerCase().trim();

    if (!new_email || !new_email.includes('@')) {
      return sendError(res, 'VALIDATION_ERROR', 'Valid email required', 400, reqAny.id);
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const { data: verifiedRow } = await supabaseAdmin
      .from('user_otps')
      .select('id')
      .eq('user_id', userId)
      .eq('purpose', 'change_email')
      .eq('is_used', true)
      .not('verified_at', 'is', null)
      .gte('verified_at', tenMinutesAgo.toISOString())
      .order('verified_at', { ascending: false })
      .limit(1)
      .single();

    if (!verifiedRow) {
      return sendError(res, 'VERIFICATION_REQUIRED', 'Verify your current email with OTP first', 400, reqAny.id);
    }

    const { error: authUpdateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { email: new_email });
    if (authUpdateErr) {
      return sendError(res, 'AUTH_ERROR', authUpdateErr.message || 'Failed to update email', 400, reqAny.id);
    }

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({ email: new_email })
      .eq('id', userId);

    if (profileErr) {
      return sendError(res, 'PROFILE_ERROR', profileErr.message || 'Failed to update profile email', 400, reqAny.id);
    }

    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
    sendResponse(res, profile, 'Email updated');
  })
);

/* =========================================================
   SET PASSWORD (for Google/phone users - first-time set; enables email+password login)
   ========================================================= */
router.post(
  '/profile/set-password',
  authLimiter,
  requireAuth,
  validate(setPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const userId = (req as AuthenticatedRequest).user.id;
    const { new_password } = (req.body as any);

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: new_password });

    if (error) {
      return sendError(res, 'AUTH_ERROR', error.message || 'Failed to set password', 400, reqAny.id);
    }

    sendResponse(res, { message: 'Password set. You can now sign in with email + password.' }, 'Password set successfully');
  })
);

/* =========================================================
   REFRESH TOKEN (JWT ONLY)
   ========================================================= */
router.post(
  '/refresh',
  authLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      return sendError(res, 'AUTH_ERROR', 'Token required', 401);
    }

    let decoded: { sub: string; email: string; role: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    } catch {
      return sendError(res, 'AUTH_ERROR', 'Invalid or expired token', 401);
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', decoded.sub)
      .single();

    if (error || !profile) {
      return sendError(res, 'PROFILE_ERROR', 'Profile not found', 404);
    }

    if (!profile.is_active) {
      return sendError(res, 'ACCOUNT_DISABLED', 'Account disabled', 403);
    }

    const newToken = generateToken(profile);

    sendResponse(res, {
      token: newToken,
      refreshToken: newToken,
      user: profile,
    }, 'Token refreshed');
  })
);

/* =========================================================
   LOGOUT (JWT = STATELESS)
   ========================================================= */
router.post(
  '/logout',
  authLimiter,
  requireAuth,
  asyncHandler(async (_req: Request, res: Response) => {
    // JWT based auth → client deletes token
    sendResponse(res, null, 'Logout successful');
  })
);

/* =========================================================
   /ME ALIAS
   ========================================================= */
router.get(
  '/me',
  authLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.id;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return sendError(res, 'PROFILE_ERROR', 'Profile not found', 404);
    }

    sendResponse(res, profile);
  })
);

/* =========================================================
   CUSTOMER OTP SEND (Login/Signup via WhatsApp)
   ========================================================= */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post(
  '/otp/send',
  authStrictLimiter,
  publicLimiter,
  validate(otpSendSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const raw = (req.body as any).phone_number || '';
    const phone_number = raw.replace(/\D/g, '').slice(-10);

    if (phone_number.length < 10) {
      return sendError(res, 'VALIDATION_ERROR', 'Valid 10-digit phone number required', 400, reqAny.id);
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const { count } = await supabaseAdmin
      .from('user_otps')
      .select('id', { count: 'exact', head: true })
      .eq('phone_number', phone_number)
      .eq('is_used', false)
      .gte('created_at', fiveMinutesAgo.toISOString());

    if (count && count > 0) {
      return sendError(res, 'RATE_LIMIT', 'Please wait before requesting a new OTP', 429, reqAny.id);
    }

    await supabaseAdmin
      .from('user_otps')
      .update({ is_used: true })
      .eq('phone_number', phone_number)
      .eq('is_used', false);

    const otp_code = generateOTP();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000);

    const { error: insertErr } = await supabaseAdmin.from('user_otps').insert({
      phone_number,
      otp_code,
      expires_at: expires_at.toISOString(),
      purpose: 'login',
    });

    if (insertErr) {
      return sendError(res, 'OTP_ERROR', 'Could not send OTP. Please try again.', 500, reqAny.id);
    }

    const whatsapp_url = generateCustomerOTPLink(phone_number, otp_code, 'login');
    console.log('Customer OTP:', { phone_number, otp_code, whatsapp_url });

    sendResponse(res, {
      message: 'OTP sent. Open the WhatsApp link to receive your OTP.',
      whatsapp_url,
      expires_in_seconds: 300,
    });
  })
);

/* =========================================================
   CUSTOMER OTP VERIFY (Login/Signup → JWT)
   ========================================================= */
router.post(
  '/otp/verify',
  publicLimiter,
  validate(otpVerifySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const raw = (req.body as any).phone_number || '';
    const phone_number = raw.replace(/\D/g, '').slice(-10);
    const otp_code = (req.body as any).otp_code?.trim() || '';

    const { data: otpRow, error: otpErr } = await supabaseAdmin
      .from('user_otps')
      .select('*')
      .eq('phone_number', phone_number)
      .eq('otp_code', otp_code)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpErr || !otpRow) {
      return sendError(res, 'INVALID_OTP', 'Invalid or expired OTP', 400, reqAny.id);
    }

    const expiresAt = new Date(otpRow.expires_at);
    if (expiresAt < new Date()) {
      await supabaseAdmin.from('user_otps').update({ is_used: true }).eq('id', otpRow.id);
      return sendError(res, 'OTP_EXPIRED', 'OTP has expired. Please request a new one.', 400, reqAny.id);
    }

    await supabaseAdmin.from('user_otps').update({ is_used: true }).eq('id', otpRow.id);

    const syntheticEmail = `${phone_number}@monstermen90.phone`;
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('phone_number', phone_number)
      .maybeSingle();

    let profile: any;

    if (existingProfile) {
      profile = existingProfile;
    } else {
      const randomPassword = require('crypto').randomBytes(24).toString('hex');
      const { data: authUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: syntheticEmail,
        password: randomPassword,
        email_confirm: true,
      });

      if (createErr || !authUser.user) {
        return sendError(res, 'AUTH_ERROR', createErr?.message || 'Could not create account', 500, reqAny.id);
      }

      const { data: newProfile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authUser.user.id,
          email: syntheticEmail,
          phone_number,
          full_name: `User ${phone_number.slice(-4)}`,
          role: 'buyer',
          is_active: true,
          auth_method: 'phone',
        })
        .select()
        .single();

      if (profileErr || !newProfile) {
        try { await supabaseAdmin.auth.admin.deleteUser(authUser.user.id); } catch (_) {}
        return sendError(res, 'PROFILE_ERROR', 'Could not create profile', 500, reqAny.id);
      }
      profile = newProfile;
    }

    const token = generateToken(profile);
    sendResponse(res, { user: profile, token }, 'Login successful');
  })
);

/* =========================================================
   FORGOT PASSWORD (Send OTP to email or phone)
   ========================================================= */
router.post(
  '/forgot-password',
  authStrictLimiter,
  publicLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const { email, phone_number } = req.body as any;

    if (email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login-email?reset=1`,
      });
      if (error) {
        return sendError(res, 'AUTH_ERROR', error.message, 400, reqAny.id);
      }
      return sendResponse(res, { message: 'If an account exists, you will receive a password reset link.' });
    }

    if (phone_number) {
      const phone = String(phone_number).replace(/\D/g, '').slice(-10);
      if (phone.length < 10) {
        return sendError(res, 'VALIDATION_ERROR', 'Valid phone number required', 400, reqAny.id);
      }

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const { count } = await supabaseAdmin
        .from('user_otps')
        .select('id', { count: 'exact', head: true })
        .eq('phone_number', phone)
        .eq('purpose', 'reset_password')
        .eq('is_used', false)
        .gte('created_at', fiveMinutesAgo.toISOString());

      if (count && count > 0) {
        return sendError(res, 'RATE_LIMIT', 'Please wait before requesting a new OTP', 429, reqAny.id);
      }

      const otp_code = generateOTP();
      const expires_at = new Date(Date.now() + 5 * 60 * 1000);
      await supabaseAdmin.from('user_otps').update({ is_used: true }).eq('phone_number', phone).eq('purpose', 'reset_password').eq('is_used', false);
      await supabaseAdmin.from('user_otps').insert({
        phone_number: phone,
        otp_code,
        expires_at: expires_at.toISOString(),
        purpose: 'reset_password',
      });

      const whatsapp_url = generateCustomerOTPLink(phone, otp_code, 'reset_password');
      console.log('Reset OTP:', { phone, otp_code, whatsapp_url });
      sendResponse(res, { message: 'OTP sent to your WhatsApp.', whatsapp_url, expires_in_seconds: 300 });
    }
  })
);

/* =========================================================
   RESET PASSWORD (Verify OTP → set new password or sign in)
   ========================================================= */
router.post(
  '/reset-password',
  publicLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const { email, phone_number, otp_code, new_password } = req.body as any;

    if (phone_number) {
      const phone = String(phone_number).replace(/\D/g, '').slice(-10);
      const { data: otpRow } = await supabaseAdmin
        .from('user_otps')
        .select('*')
        .eq('phone_number', phone)
        .eq('otp_code', otp_code)
        .eq('purpose', 'reset_password')
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!otpRow || new Date(otpRow.expires_at) < new Date()) {
        return sendError(res, 'INVALID_OTP', 'Invalid or expired OTP', 400, reqAny.id);
      }
      await supabaseAdmin.from('user_otps').update({ is_used: true }).eq('id', otpRow.id);

      const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('phone_number', phone).single();
      if (profile) {
        const token = generateToken(profile);
        return sendResponse(res, { user: profile, token }, 'Signed in. You can set a new password in Profile.');
      }
      return sendResponse(res, { message: 'OTP verified. Sign up with this number to set a password.' });
    }

    if (email && new_password) {
      // Email reset: Supabase handles via link; optional in-app flow can use magic link
      return sendError(res, 'NOT_SUPPORTED', 'Use the link sent to your email to set a new password.', 400, reqAny.id);
    }
  })
);

/* =========================================================
   OAUTH REDIRECT URL VALIDATION (prevent open redirect)
   ========================================================= */
function getAllowedFrontendOrigins(): string[] {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  let frontendOrigin = 'http://localhost:5173';
  try {
    frontendOrigin = new URL(frontendUrl).origin.toLowerCase();
  } catch {
    // keep default
  }
  const fromEnv = process.env.ALLOW_ORIGINS
    ? process.env.ALLOW_ORIGINS.split(',').map((o: string) => o.trim().toLowerCase()).filter(Boolean)
    : [];
  return [...new Set([frontendOrigin, ...fromEnv])];
}

function validateOAuthRedirectUrl(candidate: string): string {
  const defaultUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`;
  if (!candidate || typeof candidate !== 'string') return defaultUrl;
  const trimmed = candidate.trim();
  if (!trimmed) return defaultUrl;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return defaultUrl;
    const origin = parsed.origin.toLowerCase();
    const allowed = getAllowedFrontendOrigins();
    if (allowed.some((o) => o.toLowerCase() === origin)) return trimmed;
  } catch {
    // Path-only (e.g. /auth/callback) — allow and prepend FRONTEND_URL origin
    if (trimmed.startsWith('/')) {
      const base = process.env.FRONTEND_URL || 'http://localhost:5173';
      try {
        return new URL(trimmed, base).href;
      } catch {
        return defaultUrl;
      }
    }
  }
  return defaultUrl;
}

/* =========================================================
   GOOGLE OAUTH - INITIATE
   ========================================================= */
router.get(
  '/google',
  publicLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const rawRedirect = req.query.redirect_url as string || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`;
    const redirectUrl = validateOAuthRedirectUrl(rawRedirect);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback?redirect_url=${encodeURIComponent(redirectUrl)}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      return sendError(res, 'OAUTH_ERROR', error.message || 'Google sign-in failed', 400);
    }

    // Redirect to Google OAuth
    res.redirect(data.url);
  })
);

/* =========================================================
   GOOGLE OAUTH - CALLBACK
   Handles both NEW and EXISTING users. Supabase trigger may create minimal profile;
   we UPDATE with auth_method, avatar, full_name from Google metadata.
   ========================================================= */
router.get(
  '/google/callback',
  publicLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { code, error: oauthError } = req.query;
    const rawRedirect = req.query.redirect_url as string || `${process.env.FRONTEND_URL || 'http://localhost:5173'}`;
    const redirectUrl = validateOAuthRedirectUrl(rawRedirect);
    const frontendOrigin = (() => {
      try {
        return new URL(redirectUrl).origin;
      } catch {
        return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '').replace(/\?.*$/, '');
      }
    })();

    const redirectToLogin = (msg: string) =>
      res.redirect(`${frontendOrigin}/login?error=${encodeURIComponent(msg)}`);

    if (oauthError) {
      const msg = oauthError === 'access_denied'
        ? 'Google sign-in was cancelled'
        : `Google sign-in failed: ${oauthError}. Ensure Google provider is enabled in Supabase and redirect URL is configured.`;
      return redirectToLogin(msg);
    }

    if (!code) {
      return redirectToLogin('Authorization code not provided. Please try signing in again.');
    }

    // Exchange code for session (works for both new and existing users)
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code as string);

    if (sessionError || !sessionData.user) {
      const errMsg = sessionError?.message || 'Failed to authenticate with Google';
      console.error('[Google OAuth] exchangeCodeForSession failed:', errMsg);
      return redirectToLogin(`Google sign-in failed: ${errMsg}. Try again or use email sign-in.`);
    }

    const user = sessionData.user;
    // Google sends 'name' in metadata; trigger may use 'full_name'
    const googleName = user.user_metadata?.name || user.user_metadata?.full_name || 'User';
    const googleAvatar = user.user_metadata?.picture || user.user_metadata?.avatar_url || null;

    // Check if profile exists (trigger may have created it)
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // New user: create profile
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert([
          {
            id: user.id,
            email: user.email || '',
            full_name: googleName,
            role: 'buyer',
            is_active: true,
            avatar_url: googleAvatar,
            auth_method: 'google',
          },
        ])
        .select()
        .single();

      if (createError || !newProfile) {
        console.error('[Google OAuth] Profile create failed:', createError?.message);
        return redirectToLogin(`Failed to create profile: ${createError?.message || 'Unknown error'}. Contact support.`);
      }
      profile = newProfile;
    } else {
      // Existing profile (from trigger or previous signup): UPDATE with Google data
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          auth_method: 'google',
          avatar_url: googleAvatar || profile.avatar_url,
          full_name: (profile.full_name && profile.full_name.trim()) ? profile.full_name : googleName,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (!updateError && updatedProfile) profile = updatedProfile;
    }

    // Generate JWT token
    const token = generateToken(profile);

    // Redirect to frontend callback
    const baseUrl = (typeof redirectUrl === 'string' && redirectUrl.includes('/auth/callback'))
      ? redirectUrl.replace(/\?.*$/, '')
      : `${redirectUrl.replace(/\/$/, '')}/auth/callback`;
    const sep = baseUrl.includes('?') ? '&' : '?';
    res.redirect(`${baseUrl}${sep}token=${token}&user=${encodeURIComponent(JSON.stringify(profile))}`);
  })
);

export default router;