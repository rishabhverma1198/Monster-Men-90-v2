/**
 * TRANSACTION-SAFE ORDER CREATION
 * Uses Supabase RPC function for atomic checkout
 */

import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, sendResponse, sendError, asyncHandler } from "../server.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

/* ================= CREATE ORDER (TRANSACTION-SAFE) ================= */
router.post(
  "/",
  authLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const userId = reqAny.user?.id;

    if (!userId) {
      return sendError(res, "AUTH_ERROR", "User not authenticated", 401, reqAny.id);
    }

    /* 1️⃣ FETCH CART WITH PRODUCT DETAILS */
    const { data: cartItems, error: cartError } = await supabaseAdmin
      .from("cart_items")
      .select(`
        product_id,
        quantity,
        products:products!cart_items_product_id_fkey (
          id,
          title,
          price_buyer
        )
      `)
      .eq("user_id", userId);

    if (cartError) {
      return sendError(res, "CART_ERROR", cartError.message, 400, reqAny.id);
    }

    if (!cartItems || cartItems.length === 0) {
      return sendError(res, "EMPTY_CART", "Your cart is empty", 400, reqAny.id);
    }

    /* 2️⃣ PREPARE CART ITEMS FOR RPC FUNCTION */
    const cartItemsJson = cartItems.map((item: any) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      price_buyer: item.products.price_buyer,
    }));

    /* 3️⃣ CALL TRANSACTION-SAFE RPC FUNCTION */
    const { data: orderResult, error: rpcError } = await supabaseAdmin.rpc(
      "create_order_transaction",
      {
        p_user_id: userId,
        p_cart_items: cartItemsJson,
      }
    );

    if (rpcError) {
      // RPC function handles all validation and rollback
      return sendError(
        res,
        "ORDER_ERROR",
        rpcError.message || "Failed to create order",
        400,
        reqAny.id
      );
    }

    /* 4️⃣ FETCH COMPLETE ORDER DETAILS */
    const { data: finalOrder, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        total_amount,
        created_at,
        order_items:order_items!order_items_order_id_fkey (
          id,
          quantity,
          price_at_purchase,
          products:products!order_items_product_id_fkey (
            id,
            title,
            image_url
          )
        )
      `)
      .eq("id", orderResult.order_id)
      .single();

    if (fetchError) {
      return sendError(res, "FETCH_ERROR", fetchError.message, 500, reqAny.id);
    }

    sendResponse(res, finalOrder, "Order created successfully", 201);
  })
);

export default router;
