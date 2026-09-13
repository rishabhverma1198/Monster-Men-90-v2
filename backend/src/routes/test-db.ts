import { Router, Request, Response } from 'express';
// Step 1: Config se admin client lo
import { supabaseAdmin } from '../config/supabase.js'; 
// Step 2: Utils se helpers lo (Make sure path is correct)
import { asyncHandler, sendResponse, sendError } from '../server.js';
import { publicLimiter } from '../middleware/rateLimiter.js'; 

const router = Router();

/* =========================================================
   DATABASE CONNECTION TEST (FIXED)
   ========================================================= */
router.get('/', publicLimiter, asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;

  // Profiles table se data fetch kar rahe hain
  // supabaseAdmin use karne se Postgres RLS policies ko ignore kar dega
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email') // Thoda extra data for testing
    .limit(5);

  if (error) {
    // Agar ab bhi error aaye, toh wo connection ya table name ka issue hoga
    return sendError(res, 'DB_ERROR', error.message, 500, reqAny.id);
  }

  sendResponse(
    res, 
    {
      status: 'connected ✅',
      auth_bypass: 'Service Role Active (No Recursion)',
      record_count: data?.length || 0,
      sample_data: data,
      timestamp: new Date().toISOString()
    }, 
    'Database connection successful'
  );
}));

export default router;