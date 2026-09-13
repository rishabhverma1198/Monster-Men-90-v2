import * as express from 'express';

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: any; // Aapka user object yahan define ho gaya
    }
  }
}