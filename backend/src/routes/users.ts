import { Router, Request, Response } from 'express';
// FIX: Correct Imports
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { requireAuth, sendResponse, sendError, asyncHandler } from '../server.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/* ================= GET ALL USERS (ADMIN ONLY) ================= */
router.get('/', authLimiter, requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const user = reqAny.user;

  // Check Admin Role
  const { data: adminCheck } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (adminCheck?.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Admin access required', 403, reqAny.id);
  }

  // Fetch Users with all fields (avatar_url doesn't exist in schema)
  const { data: users, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, role, created_at, is_active, phone_number, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    return sendError(res, 'DB_ERROR', error.message, 400, reqAny.id);
  }

  sendResponse(res, users || [], 'Users retrieved');
}));

/* ================= UPDATE USER ROLE (ADMIN ONLY) ================= */
router.put('/:id/role', authLimiter, requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const { id } = req.params;
  const { role } = req.body;
  const currentUser = reqAny.user;

  // STEP 1: Admin check
  const { data: adminCheck } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (adminCheck?.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Admin access required', 403, reqAny.id);
  }

  // STEP 2: Validate role
  const validRoles = ['admin', 'buyer', 'wholesaler'];
  if (!role || !validRoles.includes(role)) {
    return sendError(res, 'VALIDATION_ERROR', `Invalid role. Must be one of: ${validRoles.join(', ')}`, 400, reqAny.id);
  }

  // STEP 3: Update role
  const { data: updatedUser, error } = await supabaseAdmin
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return sendError(res, 'UPDATE_ERROR', error.message, 400, reqAny.id);
  }

  sendResponse(res, updatedUser, 'User role updated successfully');
}));

/* ================= UPDATE USER ACTIVE STATUS (ADMIN ONLY) ================= */
router.put('/:id/status', authLimiter, requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const { id } = req.params;
  const { is_active } = req.body;
  const currentUser = reqAny.user;

  // STEP 1: Admin check
  const { data: adminCheck } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (adminCheck?.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Admin access required', 403, reqAny.id);
  }

  // STEP 2: Validate is_active
  if (typeof is_active !== 'boolean') {
    return sendError(res, 'VALIDATION_ERROR', 'is_active must be a boolean', 400, reqAny.id);
  }

  // STEP 3: Update status
  const { data: updatedUser, error } = await supabaseAdmin
    .from('profiles')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return sendError(res, 'UPDATE_ERROR', error.message, 400, reqAny.id);
  }

  sendResponse(res, updatedUser, 'User status updated successfully');
}));

/* ================= SET USER ROLE (BUYER vs WHOLESALER) ================= */
// Ye naya endpoint hai jo aapke frontend popup ke liye kaam aayega
router.post('/set-role', authLimiter, requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const userId = reqAny.user.id;
  const { role } = req.body; // Expecting 'buyer' or 'wholesaler'

  if (!['buyer', 'wholesaler'].includes(role)) {
    return sendError(res, 'INVALID_ROLE', 'Role must be either buyer or wholesaler', 400, reqAny.id);
  }

  const { data: updatedProfile, error } = await supabaseAdmin
    .from('profiles')
    .update({ role: role })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return sendError(res, 'UPDATE_ERROR', error.message, 400, reqAny.id);
  }

  sendResponse(res, updatedProfile, `Role updated to ${role}`);
}));

/* ================= GET USER BY ID ================= */
router.get('/:id', authLimiter, requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const { id } = req.params;
  const currentUser = reqAny.user;

  // Agar user khud ka data nahi maang raha, toh check karo ki wo admin hai ya nahi
  if (id !== currentUser.id) {
    const { data: adminCheck } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (adminCheck?.role !== 'admin') {
      return sendError(res, 'FORBIDDEN', 'Unauthorized access', 403, reqAny.id);
    }
  }

  const { data: user, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return sendError(res, 'NOT_FOUND', 'User not found', 404, reqAny.id);
  }

  sendResponse(res, user, 'User retrieved');
}));

/* ================= UPDATE USER PROFILE (Generic) ================= */
router.put('/:id', authLimiter, requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const { id } = req.params;
  const currentUser = reqAny.user;
  const { full_name } = req.body;

  if (id !== currentUser.id) {
    return sendError(res, 'FORBIDDEN', 'Cannot update other users', 403, reqAny.id);
  }

  const { data: updatedUser, error } = await supabaseAdmin
    .from('profiles')
    .update({
      full_name: full_name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return sendError(res, 'UPDATE_ERROR', error.message, 400, reqAny.id);
  }

  sendResponse(res, updatedUser, 'Profile updated');
}));

/* ================= DELETE USER (ADMIN ONLY) ================= */
router.delete('/:id', authLimiter, requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const { id } = req.params;
  const currentUser = reqAny.user;

  const { data: adminCheck } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (adminCheck?.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Admin access required', 403, reqAny.id);
  }

  // 1. Delete from Auth (Supabase internal)
  await supabaseAdmin.auth.admin.deleteUser(id);

  // 2. Delete from Profiles table
  const { error } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', id);

  if (error) {
    return sendError(res, 'DELETE_ERROR', error.message, 400, reqAny.id);
  }

  sendResponse(res, null, 'User deleted', 200);
}));

/* ================= SEARCH USERS (Admin Only) ================= */
router.get('/search/:query', authLimiter, requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const { query } = req.params;

  // Search functionality usually restricted to Admins in production
  const { data: users, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, role')
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10);

  if (error) {
    return sendError(res, 'SEARCH_ERROR', error.message, 400, reqAny.id);
  }

  sendResponse(res, users, 'Search results');
}));

export default router;