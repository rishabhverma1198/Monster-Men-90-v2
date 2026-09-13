import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../server.js';
import { logWarning } from '../utils/logger.js';

/* =========================================================
   VALIDATION MIDDLEWARE (ZOD INTEGRATION)
   ========================================================= */

/**
 * Validates request data against a Zod schema
 */
export const validate = (schema: ZodSchema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const requestId = (req as any).id || 'N/A';
        
        // Log validation error using centralized logger
        logWarning('Validation error', req, {
          validationErrors: error.errors.slice(0, 5).map((err) => ({
            field: err.path.join('.') || 'root',
            message: err.message,
          })),
          totalErrors: error.errors.length,
        });

        const formattedErrors = error.errors.slice(0, 5).map((err) => ({
          field: err.path.join('.') || 'root',
          message: err.message,
        }));

        const firstError = formattedErrors[0];
        const errorMessage =
          formattedErrors.length > 1
            ? `${firstError.message} (and ${formattedErrors.length - 1} more)`
            : firstError.message;

        // FIXED ORDER (Sync with server.ts): res, code, message, status, requestId
        return sendError(
          res,
          'VALIDATION_ERROR',
          errorMessage,
          400,
          requestId
        );
      }
      next(error);
    }
  };

/* =========================================================
   ADVANCED VALIDATION MIDDLEWARE
   ========================================================= */

export function validateHeaders(requiredHeaders: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingHeaders = requiredHeaders.filter(
      (header) => !req.headers[header.toLowerCase()]
    );

    if (missingHeaders.length > 0) {
      // Order: res, code, message, status, requestId
      return sendError(
        res,
        'MISSING_HEADERS',
        `Missing required headers: ${missingHeaders.join(', ')}`,
        400,
        (req as any).id
      );
    }
    next();
  };
}

export function validatePayloadSize(maxSizeMB: number = 10) {
  return (req: Request, res: Response, next: NextFunction) => {
    const sizeInMB = (JSON.stringify(req.body).length / (1024 * 1024));
    if (sizeInMB > maxSizeMB) {
      // Order: res, code, message, status, requestId
      return sendError(
        res,
        'PAYLOAD_TOO_LARGE',
        `Payload exceeds ${maxSizeMB}MB limit`,
        413,
        (req as any).id
      );
    }
    next();
  };
}

export function validateBodyNotEmpty(req: Request, res: Response, next: NextFunction) {
  if (!req.body || Object.keys(req.body).length === 0) {
    // Order: res, code, message, status, requestId
    return sendError(
      res,
      'EMPTY_BODY',
      'Request body cannot be empty',
      400,
      (req as any).id
    );
  }
  next();
}

/* =========================================================
   SANITIZATION & UTILS (Keep all original logic)
   ========================================================= */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isStrongPassword(password: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
}

export function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

export function isValidUrl(url: string): boolean {
  try { new URL(url); return true; } catch { return false; }
}

export function isValidImageFile(filename: string): boolean {
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const extension = filename.split('.').pop()?.toLowerCase();
  return validExtensions.includes(extension || '');
}

export function isValidFileSize(sizeInMB: number, maxSizeInMB: number = 10): boolean {
  return sizeInMB <= maxSizeInMB;
}

/** Validates UUID v4 format (e.g. product_id, cart_item_id). Named for MongoDB compatibility; prefer isValidUUID. */
export function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{8}(-[a-f\d]{4}){4}[a-f\d]{8}$/i.test(id);
}

/** Validates UUID format. Use for product_id, cart_item_id, order_id, etc. */
export const isValidUUID = isValidObjectId;

export function sanitizeString(str: string): string {
  return str.replace(/[<>]/g, '').trim().substring(0, 500);
}

export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const key in obj) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  return obj;
}

export function sanitizeRequest(req: Request, res: Response, next: NextFunction) {
  req.body = sanitizeObject(req.body);
  next();
}