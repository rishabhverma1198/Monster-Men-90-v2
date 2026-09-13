/**
 * Shipping Routes
 * Nimbuspost Shipping Integration
 */

import { Router, Request, Response } from 'express';
import { requireAuth, asyncHandler, sendResponse, sendError } from '../server.js';
import { adminLimiter, publicLimiter } from '../middleware/rateLimiter.js';
import { supabaseAdmin } from '../config/supabase.js';
import {
  createShipment,
  trackShipment,
  cancelShipment,
  getShippingRates,
} from '../services/nimbuspost.service.js';

const router = Router();

/**
 * Create Shipment for Order
 * POST /api/shipping/create
 * Admin Only
 */
router.post(
  '/create',
  adminLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const { order_id } = req.body;

    if (!order_id) {
      return sendError(res, 'VALIDATION_ERROR', 'Order ID is required', 400, reqAny.id);
    }

    // STEP 1: Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items:order_items (
          quantity,
          price_snapshot,
          products:products (
            title,
            sku,
            weight
          )
        )
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return sendError(res, 'NOT_FOUND', 'Order not found', 404, reqAny.id);
    }

    // STEP 2: Check if shipment already exists
    if (order.shipping_awb) {
      return sendError(res, 'SHIPMENT_EXISTS', 'Shipment already created for this order', 400, reqAny.id);
    }

    // STEP 3: Prepare shipment data
    const orderItems = ((order as any).order_items || []).map((item: any) => ({
      name: item.products?.title || 'Product',
      sku: item.products?.sku || 'SKU001',
      quantity: item.quantity,
      price: item.price_snapshot || 0,
      weight: item.products?.weight || 100, // Default 100g if not specified
    }));

    const totalWeight = orderItems.reduce((sum: number, item: any) => 
      sum + (item.weight * item.quantity), 0
    );

    // Extract address components (you may need to parse shipping_address)
    const shippingAddress = order.shipping_address || '';
    const addressParts = shippingAddress.split(',');

    // STEP 4: Create shipment in Nimbuspost
    const shipmentData = await createShipment({
      order_id: order.id,
      order_number: (order as any).order_number || order.id,
      customer_name: (order as any).user_name || 'Customer',
      customer_phone: (order as any).user_phone || '',
      customer_email: (order as any).user_email || '',
      customer_address: {
        address_line1: addressParts[0] || shippingAddress || 'Address not provided',
        address_line2: addressParts[1] || '',
        city: addressParts[addressParts.length - 3] || 'City',
        state: addressParts[addressParts.length - 2] || 'State',
        pincode: (order as any).delivery_pincode || '',
        country: 'India',
      },
      order_items: orderItems,
      payment_mode: order.payment_status === 'completed' ? 'prepaid' : 'cod',
      cod_amount: order.payment_status === 'completed' ? 0 : order.total_amount,
      weight: totalWeight,
      pickup_pincode: (order as any).shipping_pincode || process.env.PICKUP_PINCODE || '110001',
    });

    // STEP 5: Update order with shipping details
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        shipping_awb: shipmentData.awb_number,
        shipping_courier: 'Nimbuspost',
        shipping_tracking_url: shipmentData.tracking_url,
        shipping_label_url: shipmentData.label_url,
        status: 'shipped',
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', order_id);

    if (updateError) {
      console.error('❌ Order update error:', updateError);
      return sendError(res, 'UPDATE_ERROR', 'Failed to update order', 500, reqAny.id);
    }

    sendResponse(res, {
      order_id: order.id,
      awb_number: shipmentData.awb_number,
      tracking_url: shipmentData.tracking_url,
      label_url: shipmentData.label_url,
      status: shipmentData.status,
    }, 'Shipment created successfully');
  })
);

/**
 * Track Shipment
 * GET /api/shipping/track/:awb
 * Admin Only
 */
router.get(
  '/track/:awb',
  adminLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { awb } = req.params;

    const tracking = await trackShipment({ awb_number: awb });

    sendResponse(res, tracking, 'Tracking information retrieved');
  })
);

/**
 * Get Shipping Rates
 * POST /api/shipping/rates
 * Admin Only
 */
router.post(
  '/rates',
  adminLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const { pickup_pincode, delivery_pincode, weight, cod_amount } = req.body;

    if (!pickup_pincode || !delivery_pincode || !weight) {
      return sendError(res, 'VALIDATION_ERROR', 'Pickup pincode, delivery pincode, and weight are required', 400, reqAny.id);
    }

    const rates = await getShippingRates({
      pickup_pincode,
      delivery_pincode,
      weight,
      cod_amount,
    });

    if (!rates.success) {
      return sendError(
        res,
        'NIMBUSPOST_ERROR',
        'Unable to fetch shipping rates. Please check Nimbuspost API configuration.',
        503,
        reqAny.id
      );
    }

    sendResponse(res, rates, 'Shipping rates retrieved');
  })
);

/**
 * Cancel Shipment
 * POST /api/shipping/cancel
 * Admin Only
 */
router.post(
  '/cancel',
  adminLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const { awb_number } = req.body;

    if (!awb_number) {
      return sendError(res, 'VALIDATION_ERROR', 'AWB number is required', 400, reqAny.id);
    }

    const cancelled = await cancelShipment(awb_number);

    if (cancelled) {
      // Update order status
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('shipping_awb', awb_number);
    }

    sendResponse(res, { cancelled }, 'Shipment cancelled successfully');
  })
);

/**
 * Public Track Order (for customers)
 * GET /api/shipping/public-track/:order_id
 * No authentication required
 */
router.get(
  '/public-track/:order_id',
  publicLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { order_id } = req.params;

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('shipping_awb, shipping_tracking_url')
      .eq('id', order_id)
      .single();

    if (!order || !order.shipping_awb) {
      return sendError(res, 'NOT_FOUND', 'Shipment not found', 404);
    }

    const tracking = await trackShipment({ awb_number: order.shipping_awb });

    sendResponse(res, tracking, 'Tracking information');
  })
);

export default router;
