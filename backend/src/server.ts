import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import { csrfProtection } from './middleware/csrf.js';
import { logError } from './utils/logger.js';
import { supabaseAdmin } from './config/supabase.js';

/* =========================================================
   ENV VALIDATION
   ========================================================= */
const REQUIRED_ENVS = [
  'PORT',
  'NODE_ENV',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
];

for (const key of REQUIRED_ENVS) {
  if (!process.env[key]) {
    console.error(`❌ Missing ENV: ${key}`);
    process.exit(1);
  }
}

/* Reject weak JWT_SECRET in production */
if (process.env.NODE_ENV === 'production') {
  const secret = process.env.JWT_SECRET!;
  const weakSecrets = ['monster-secret-key', 'secret', 'jwt-secret', 'change-me', 'your_jwt_secret'];
  if (secret.length < 32 || weakSecrets.some((w) => secret.toLowerCase().includes(w))) {
    console.error('❌ JWT_SECRET is too weak or default. Use a long random string (32+ chars) in production.');
    process.exit(1);
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV!;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* =========================================================
   REQUEST ID
   ========================================================= */
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).id = crypto.randomUUID();
  next();
});

/* =========================================================
   SECURITY & CORE MIDDLEWARES
   ========================================================= */
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        connectSrc: ["'self'", 'http://localhost:5000', 'http://localhost:5173', 'http://localhost:5174', 'https://*.supabase.co'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);

// CORS Configuration - Allow all localhost ports for development
const allowedOrigins = process.env.ALLOW_ORIGINS
  ? process.env.ALLOW_ORIGINS.split(',').map(o => o.trim())
  : [
      'http://localhost:5173', // Frontend (Vite default)
      'http://localhost:5174', // Admin Panel (Vite auto-increment)
      'http://localhost:3000', // Alternative frontend port
      'http://localhost:5175', // Alternative admin port
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (process.env.NODE_ENV !== 'production') {
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          return callback(null, true);
        }
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Idempotency-Key'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());

/* =========================================================
   LOGGER
   ========================================================= */
app.use(
  morgan((tokens, req: any, res) =>
    [
      `[${req.id.slice(0, 8)}]`,
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      `${tokens['response-time'](req, res)}ms`,
    ].join(' ')
  )
);

/* =========================================================
   CSRF — DISABLED FOR ALL /api/* (JWT BASED)
   ========================================================= */
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next(); // ✅ APIs are JWT-based → no CSRF
  }
  return csrfProtection(req, res, next);
});

/* =========================================================
   HELPERS
   ========================================================= */
export function asyncHandler(fn: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/* =========================================================
   AUTH MIDDLEWARE (FINAL FIX)
   ========================================================= */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'AUTH_ERROR', 'Missing token', 401);
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      email: string;
      role?: string;
    };

    (req as any).user = {
      id: decoded.sub,     // ✅ IMPORTANT (was broken earlier)
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch {
    return sendError(res, 'AUTH_ERROR', 'Invalid or expired token', 401);
  }
}

/** Requires req.user.role === 'admin'. Must run after requireAuth. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const reqAny = req as any;
  const user = reqAny.user;
  if (!user || user.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Admin access required', 403, reqAny.id);
  }
  next();
}

/* =========================================================
   RESPONSE HELPERS
   ========================================================= */
export function sendResponse(
  res: Response,
  data: any = null,
  message = 'OK',
  status = 200
) {
  res.status(status).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

export function sendError(
  res: Response,
  code = 'ERROR',
  message = 'An error occurred',
  status = 500,
  requestId?: string
) {
  res.status(status).json({
    success: false,
    code,
    message,
    requestId: requestId || (res.req as any)?.id,
    timestamp: new Date().toISOString(),
  });
}

/* Resolve when routes + global error handler are ready (for Vitest/supertest). */
let resolveAppReady!: () => void;
export const appReady = new Promise<void>((r) => {
  resolveAppReady = r;
});

/* =========================================================
   ROUTE LOADER
   ========================================================= */
async function loadRoutes() {
  const routesPath = path.join(__dirname, 'routes');

  if (!fs.existsSync(routesPath)) {
    console.error(`❌ Routes directory not found: ${routesPath}`);
    return;
  }

  const ext = process.env.VITEST === 'true' ? '.ts' : '.js';
  for (const file of fs.readdirSync(routesPath)) {
    if (file.endsWith(ext) && file !== 'test-db' + ext) {
      const routeName = file.replace(ext, '');
      const route = await import(`./routes/${file}`);
      app.use(`/api/${routeName}`, route.default);
      console.log(`✅ Route loaded: /api/${routeName}`);
    }
  }
}

/* =========================================================
   BOOTSTRAP
   ========================================================= */
(async () => {
  try {
    app.get('/health', (_req, res) =>
      sendResponse(res, {
        uptime: process.uptime(),
        env: NODE_ENV,
      })
    );

    app.get('/health/db', async (_req, res) => {
      try {
        const { error } = await supabaseAdmin.from('profiles').select('id').limit(1).maybeSingle();
        if (error) {
          res.status(503).json({
            success: false,
            code: 'DB_UNHEALTHY',
            message: 'Database check failed',
            timestamp: new Date().toISOString(),
          });
          return;
        }
        sendResponse(res, { ok: true }, 'Database reachable');
      } catch (err) {
        res.status(503).json({
          success: false,
          code: 'DB_UNHEALTHY',
          message: 'Database unreachable',
          timestamp: new Date().toISOString(),
        });
      }
    });

    await loadRoutes();

    /* GLOBAL ERROR HANDLER */
    app.use(
      (err: any, req: Request, res: Response, _next: NextFunction) => {
        const reqAny = req as any;
        let status = err.statusCode || 500;
        let code = err.code || 'INTERNAL_ERROR';
        let message = err.message || 'Internal Server Error';

        if (err.code === 'LIMIT_FILE_SIZE') {
          status = 400;
          code = 'VALIDATION_ERROR';
          message = 'File too large. Maximum size is 5MB.';
        } else if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
          status = 400;
          code = 'VALIDATION_ERROR';
          message = err.message || 'Invalid file upload.';
        }

        logError(err, req, {
          level: status >= 500 ? 'error' : 'warn',
          userId: reqAny.user?.id,
        });

        sendError(res, code, message, status, reqAny.id);
      }
    );

    resolveAppReady();

    if (process.env.VITEST !== 'true') {
      app.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════════════╗
║      🚀 MonsterMen90 Backend Server 🚀           ║
╠══════════════════════════════════════════════════╣
║  📍 Server:      http://localhost:${PORT}              ║
║  🌍 Environment: ${NODE_ENV.toUpperCase()}                     ║
║  🗄️  Database:    Supabase ✅                    ║
║  ✅ Status:       RUNNING                        ║
╚══════════════════════════════════════════════════╝
`);
      });
    }
  } catch (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
})();

export default app;