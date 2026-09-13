/**
 * Order Controller
 * Business logic for order operations
 */

import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { sendResponse, sendError } from '../server.js';
import { createOrder, validateOrderQuantities, calculateOrderItems } from '../services/order.service.js';

/** Idempotency key TTL: 24 hours */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/** Validate idempotency key format (1-128 chars, alphanumeric, hyphen, underscore) */
function isValidIdempotencyKey(key: string): boolean {
  return typeof key === 'string' && key.length >= 1 && key.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(key);
}

/**
 * Create order (supports Idempotency-Key header to prevent duplicate orders)
 */
export async function createOrderController(req: Request, res: Response) {
  const reqAny = req as any;
  const userId = reqAny.user?.id;

  if (!userId) {
    return sendError(res, 'AUTH_ERROR', 'User not authenticated', 401, reqAny.id);
  }

  const idempotencyKey = (req.headers['idempotency-key'] ?? req.headers['Idempotency-Key']) as string | undefined;
  if (idempotencyKey && isValidIdempotencyKey(idempotencyKey)) {
    const since = new Date(Date.now() - IDEMPOTENCY_TTL_MS).toISOString();
    const { data: existing } = await supabaseAdmin
      .from('idempotency_keys')
      .select('order_id')
      .eq('idempotency_key', idempotencyKey)
      .eq('user_id', userId)
      .gte('created_at', since)
      .maybeSingle();

    if (existing?.order_id) {
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select(`
          id,
          order_number,
          user_type,
          user_name,
          user_email,
          user_phone,
          status,
          total_amount,
          created_at,
          order_items:order_items!order_items_order_id_fkey (
            id,
            quantity,
            price_snapshot,
            products:products!order_items_product_id_fkey (
              id,
              title,
              description,
              image_url,
              image_urls
            )
          )
        `)
        .eq('id', existing.order_id)
        .eq('user_id', userId)
        .single();

      if (!orderError && order) {
        const orderWithUnitPrice = {
          ...order,
          order_items: (order.order_items || []).map((item: any) => ({
            ...item,
            unit_price: item.price_snapshot ?? item.unit_price ?? 0,
          })),
        };
        return res.status(200).json({
          success: true,
          message: 'Order already created (idempotent)',
          data: orderWithUnitPrice,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // Fetch cart: products table uses title, price_buyer, price_wholesale (order.service handles both naming conventions)
  const { data: cartItems, error: cartError } = await supabaseAdmin
    .from('cart_items')
    .select(`
      product_id,
      quantity,
      products:products!cart_items_product_id_fkey (
        id,
        title,
        price_buyer,
        price_wholesale
      )
    `)
    .eq('user_id', userId);

  if (cartError) {
    console.error('❌ Cart fetch error:', JSON.stringify(cartError, null, 2));
    return sendError(res, 'CART_ERROR', `Failed to fetch cart: ${cartError.message}`, 500, reqAny.id);
  }
  
  if (!cartItems || cartItems.length === 0) {
    return sendError(res, 'EMPTY_CART', 'Your cart is empty', 400, reqAny.id);
  }

  // Get user type and details
  const userType = req.body.user_type || 'single';
  const userDetails = req.body.user_details || null;

  // Validate user_details
  if (userDetails) {
    if (!userDetails.name || !userDetails.email || !userDetails.contact_number) {
      return sendError(res, 'VALIDATION_ERROR', 'Name, email, and contact number are required', 400, reqAny.id);
    }
  }

  // Validate quantities
  const validation = validateOrderQuantities(cartItems, userType);
  if (!validation.valid) {
    return sendError(
      res,
      'VALIDATION_ERROR',
      `${validation.error}. Product: ${validation.productTitle}, Quantity: ${validation.quantity}`,
      400,
      reqAny.id
    );
  }

  // Calculate order items
  let orderItems;
  try {
    const result = await calculateOrderItems(cartItems, userType);
    orderItems = result.orderItems;
  } catch (error: any) {
    return sendError(res, 'INVENTORY_ERROR', error.message, 400, reqAny.id);
  }

  // Create order with detailed error handling
  try {
    const finalOrder = await createOrder(
      { userId, userType, userDetails },
      cartItems,
      orderItems
    );

    if (!finalOrder) {
      return sendError(res, 'ORDER_ERROR', 'Order creation returned no data', 500, reqAny.id);
    }

    if (idempotencyKey && isValidIdempotencyKey(idempotencyKey)) {
      const { error: keyErr } = await supabaseAdmin.from('idempotency_keys').insert({
        idempotency_key: idempotencyKey,
        user_id: userId,
        order_id: finalOrder.id,
      });
      if (keyErr && keyErr.code !== '23505') {
        console.warn('Idempotency key insert failed (non-duplicate):', keyErr.message);
      }
    }

    sendResponse(res, finalOrder, 'Order created successfully', 201);
  } catch (error: any) {
    console.error('❌ Order creation error:', JSON.stringify(error, null, 2));
    const errorMessage = error.message || 'Failed to create order';
    const errorCode = error.code || 'ORDER_ERROR';
    return sendError(res, errorCode, errorMessage, 500, reqAny.id);
  }
}

/**
 * Get user orders
 */
export async function getUserOrders(req: Request, res: Response) {
  const reqAny = req as any;
  const userId = reqAny.user?.id;

  if (!userId) {
    return sendError(res, 'AUTH_ERROR', 'User not authenticated', 401, reqAny.id);
  }

  const MAX_LIST_LIMIT = 100;
  const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  const { data, error, count } = await supabaseAdmin
    .from('orders')
    .select(
      `
      id,
      order_number,
      user_type,
      user_name,
      user_email,
      user_phone,
      status,
      total_amount,
      created_at,
      order_items:order_items!order_items_order_id_fkey (
        id,
        quantity,
        price_snapshot,
        products:products!order_items_product_id_fkey (
          id,
          title,
          image_url
        )
      )
    `,
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (error) {
    return sendError(res, 'FETCH_ERROR', error.message, 400, reqAny.id);
  }

  const orders = (data || []).map((o: any) => ({
    ...o,
    order_items: (o.order_items || []).map((item: any) => ({
      ...item,
      unit_price: item.price_snapshot ?? item.unit_price ?? 0,
    })),
  }));

  sendResponse(res, { orders, total: count || 0 });
}

/**
 * Get order by ID
 */
export async function getOrderById(req: Request, res: Response) {
  const reqAny = req as any;
  const userId = reqAny.user?.id;
  const { id } = req.params;

  if (!userId) {
    return sendError(res, 'AUTH_ERROR', 'User not authenticated', 401, reqAny.id);
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select(`
      id,
      order_number,
      user_type,
      user_name,
      user_email,
      user_phone,
      status,
      total_amount,
      created_at,
      order_items:order_items!order_items_order_id_fkey (
        id,
        quantity,
        price_snapshot,
        products:products!order_items_product_id_fkey (
          id,
          title,
          description,
          image_url,
          image_urls
        )
      )
    `)
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (orderError || !order) {
    return sendError(res, 'NOT_FOUND', 'Order not found', 404, reqAny.id);
  }

  const orderWithUnitPrice = {
    ...order,
    order_items: (order.order_items || []).map((item: any) => ({
      ...item,
      unit_price: item.price_snapshot ?? item.unit_price ?? 0,
    })),
  };

  sendResponse(res, orderWithUnitPrice);
}
