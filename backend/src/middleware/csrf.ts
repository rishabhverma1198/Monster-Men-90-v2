import { Request, Response, NextFunction } from 'express';

/**
 * CSRF Protection Middleware
 * 
 * Validates Origin header for state-changing operations (POST, PUT, DELETE, PATCH)
 * to prevent Cross-Site Request Forgery attacks.
 * 
 * Strategy:
 * - GET/OPTIONS requests are allowed without Origin check
 * - State-changing requests must include Origin header matching allowed origins
 * - Uses same origin whitelist as CORS configuration
 * - Allows same-origin requests without Origin header (browsers don't always send it)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const reqAny = req as any;
  
  // GET and OPTIONS requests don't need CSRF protection
  if (req.method === 'GET' || req.method === 'OPTIONS') {
    return next();
  }

  // Get allowed origins from environment or use defaults
  const allowedOrigins = process.env.ALLOW_ORIGINS 
    ? process.env.ALLOW_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

  // Get Origin header (browsers send this for cross-origin requests)
  const origin = req.headers.origin;

  // If no Origin header, check if it's a same-origin request
  if (!origin) {
    // Extract protocol and host from request
    const protocol = req.secure ? 'https' : 'http';
    const host = req.headers.host;
    const requestOrigin = host ? `${protocol}://${host}` : null;

    // Allow if request is from same origin (browsers don't send Origin for same-origin)
    if (requestOrigin && allowedOrigins.some(allowed => {
      // Normalize URLs for comparison (remove trailing slashes, handle ports)
      const normalize = (url: string) => url.replace(/\/$/, '').toLowerCase();
      return normalize(allowed) === normalize(requestOrigin);
    })) {
      return next();
    }

    // Reject cross-origin requests without Origin header
    return res.status(403).json({
      success: false,
      code: 'CSRF_ERROR',
      message: 'Origin header is required for this request',
      requestId: reqAny.id,
      timestamp: new Date().toISOString(),
    });
  }

  // Validate Origin against allowed origins
  const isAllowed = allowedOrigins.some(allowedOrigin => {
    // Exact match (case-insensitive)
    if (origin.toLowerCase() === allowedOrigin.toLowerCase()) {
      return true;
    }
    // Support wildcard subdomain matching (e.g., https://*.example.com)
    if (allowedOrigin.includes('*')) {
      const allowedPattern = allowedOrigin
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
        .replace(/\*/g, '.*'); // Replace * with .*
      const regex = new RegExp(`^${allowedPattern}$`, 'i');
      return regex.test(origin);
    }
    return false;
  });

  if (!isAllowed) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_ERROR',
      message: 'Origin not allowed',
      requestId: reqAny.id,
      timestamp: new Date().toISOString(),
    });
  }

  next();
}
