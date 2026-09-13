/**
 * Cart Routes
 * Thin routing layer - delegates to controllers
 */

import { Router } from 'express';
import { requireAuth, asyncHandler } from '../server.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import * as cartController from '../controllers/cart.controller.js';

const router = Router();

/* ================= ADD / UPDATE CART ================= */
router.post(
  '/',
  authLimiter,
  requireAuth,
  asyncHandler(cartController.addToCart)
);

/* ================= GET CART ================= */
router.get(
  '/',
  authLimiter,
  requireAuth,
  asyncHandler(cartController.getCart)
);

/* ================= UPDATE CART ITEM ================= */
router.put(
  '/update',
  authLimiter,
  requireAuth,
  asyncHandler(cartController.updateCartItem)
);

/* ================= REMOVE CART ITEM ================= */
router.delete(
  '/remove/:id',
  authLimiter,
  requireAuth,
  asyncHandler(cartController.removeCartItem)
);

/* ================= CLEAR CART ================= */
router.delete(
  '/clear',
  authLimiter,
  requireAuth,
  asyncHandler(cartController.clearCart)
);

export default router;
