/**
 * Order Routes
 * Thin routing layer - delegates to controllers
 */

import { Router } from 'express';
import { requireAuth, asyncHandler } from '../server.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import * as orderController from '../controllers/order.controller.js';

const router = Router();

/* ================= CREATE ORDER ================= */
router.post(
  '/',
  authLimiter,
  requireAuth,
  asyncHandler(orderController.createOrderController)
);

/* ================= GET USER ORDERS ================= */
router.get(
  '/',
  authLimiter,
  requireAuth,
  asyncHandler(orderController.getUserOrders)
);

/* ================= GET ORDER BY ID ================= */
router.get(
  '/:id',
  authLimiter,
  requireAuth,
  asyncHandler(orderController.getOrderById)
);

export default router;