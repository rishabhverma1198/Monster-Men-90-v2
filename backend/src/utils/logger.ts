import winston from 'winston';
import { Request } from 'express';

/**
 * Centralized Winston Logger Configuration
 * 
 * Provides structured logging with different log levels:
 * - error: Application errors
 * - warn: Warning messages
 * - info: Informational messages
 * - debug: Debug messages (development only)
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),
  ],
});

/**
 * Centralized Error Logging Utility
 * 
 * Logs errors with comprehensive context:
 * - Request ID
 * - User ID (if authenticated)
 * - Route (method + path)
 * - Error stack trace
 * - Request details (query, params, body sanitized)
 * - Error code and status
 */
export function logError(
  error: any,
  req: Request,
  options?: {
    level?: 'error' | 'warn' | 'info';
    userId?: string;
    additionalContext?: Record<string, any>;
  }
) {
  const reqAny = req as any;
  const requestId = reqAny.id || 'N/A';
  const userId = options?.userId || reqAny.user?.id || null;
  const level = options?.level || 'error';

  // Sanitize request body to avoid logging sensitive data
  const sanitizeBody = (body: any): any => {
    if (!body || typeof body !== 'object') return body;
    const sanitized = { ...body };
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'refreshToken', 'authorization', 'creditCard', 'cvv'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    return sanitized;
  };

  const errorContext = {
    requestId,
    userId,
    route: {
      method: req.method,
      path: req.path,
      url: req.url,
    },
    error: {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      stack: error.stack || null,
      code: error.code || null,
      statusCode: error.statusCode || null,
    },
    request: {
      query: req.query || {},
      params: req.params || {},
      body: sanitizeBody(req.body),
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] || null,
    },
    ...(options?.additionalContext || {}),
  };

  // Log based on level
  if (level === 'warn') {
    logger.warn(error.message || 'Warning occurred', errorContext);
  } else if (level === 'info') {
    logger.info(error.message || 'Info message', errorContext);
  } else {
    logger.error(error.message || 'Error occurred', errorContext);
  }
}

/**
 * Log warning messages with context
 */
export function logWarning(message: string, req: Request, context?: Record<string, any>) {
  const reqAny = req as any;
  logger.warn(message, {
    requestId: reqAny.id || 'N/A',
    userId: reqAny.user?.id || null,
    route: { method: req.method, path: req.path },
    ...context,
  });
}

/**
 * Log info messages with context
 */
export function logInfo(message: string, req: Request, context?: Record<string, any>) {
  const reqAny = req as any;
  logger.info(message, {
    requestId: reqAny.id || 'N/A',
    userId: reqAny.user?.id || null,
    route: { method: req.method, path: req.path },
    ...context,
  });
}