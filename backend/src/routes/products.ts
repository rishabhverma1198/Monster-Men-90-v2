/**
 * Products Routes
 * Thin routing layer - delegates to controllers
 */

import { Router, Request, Response } from 'express';
import { requireAuth, asyncHandler, sendError } from '../server.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { createProductSchema } from '../schemas/product.schema.js';
import { publicLimiter, authLimiter } from '../middleware/rateLimiter.js';
import * as productController from '../controllers/product.controller.js';

const router = Router();

/* ======================================================
   ADMIN GUARD
   ====================================================== */
function requireAdmin(req: Request, res: Response, next: Function) {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Access Denied: Admins only.', 403, (req as any).id);
  }
  next();
}

/* ================= GET ALL PRODUCTS ================= */
router.get(
  '/',
  publicLimiter,
  asyncHandler(productController.getProducts)
);

/* ================= SEARCH PRODUCTS ================= */
router.get(
  '/search',
  publicLimiter,
  asyncHandler(productController.searchProducts)
);

/* ================= GET CATEGORIES ================= */
router.get(
  '/categories',
  publicLimiter,
  asyncHandler(productController.getCategories)
);

/* ================= CREATE PRODUCT (ADMIN ONLY) ================= */
router.post(
  '/',
  authLimiter,
  requireAuth,
  requireAdmin,
  upload.single('image'),
  validate(createProductSchema),
  asyncHandler(productController.createProduct)
);

/* ================= GET PRODUCT BY ID ================= */
router.get(
  '/:id',
  publicLimiter,
  asyncHandler(productController.getProductById)
);

export default router;