import { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { sendResponse } from '../server.js';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  
  sendResponse(res, data, 'Login successful');
};