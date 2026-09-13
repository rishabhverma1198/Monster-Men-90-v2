/**
 * Cart Controller
 * Business logic for cart operations
 */

import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { sendResponse, sendError } from '../server.js';
import { isValidObjectId } from '../middleware/validate.js';

/**
 * Add or update cart item
 */
export async function addToCart(req: Request, res: Response) {
  const reqAny = req as any;
  const user_id = reqAny.user.id;
  const { product_id, quantity = 1 } = req.body;

  if (!product_id || !isValidObjectId(product_id)) {
    return sendError(res, 'VALIDATION_ERROR', 'Valid product_id is required', 400, reqAny.id);
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return sendError(res, 'VALIDATION_ERROR', 'Quantity must be positive integer', 400, reqAny.id);
  }

  // Products table uses 'title' not 'name' (schema: title, price_buyer, price_wholesale)
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select('id, title')
    .eq('id', product_id)
    .single();

  if (productError || !product) {
    return sendError(res, 'NOT_FOUND', 'Product not found', 404, reqAny.id);
  }

  // Check available stock
  const { data: rows } = await supabaseAdmin
    .from('inventory')
    .select('stock, reserved')
    .eq('product_id', product_id)
    .is('variant_id', null)
    .limit(1);

  const inventory = rows?.[0];
  if (!inventory) {
    return sendError(res, 'INVENTORY_ERROR', 'Inventory not found for this product', 404, reqAny.id);
  }

  const availableStock = inventory.stock - inventory.reserved;
  if (availableStock < quantity) {
    return sendError(res, 'OUT_OF_STOCK', `Insufficient stock. Available: ${availableStock}`, 400, reqAny.id);
  }

  const { data, error } = await supabaseAdmin
    .from('cart_items')
    .upsert(
      { user_id, product_id, quantity },
      { onConflict: 'user_id,product_id' }
    )
    .select()
    .single();

  if (error) {
    return sendError(res, 'DB_ERROR', error.message, 400, reqAny.id);
  }

  sendResponse(res, data, 'Cart updated');
}

/**
 * Get user cart
 */
export async function getCart(req: Request, res: Response) {
  const user_id = (req as any).user.id;

  const { data, error } = await supabaseAdmin
    .from('cart_items')
    .select(`
      id,
      quantity,
      product_id,
      products!cart_items_product_id_fkey (
        id,
        title,
        price_buyer,
        price_wholesale,
        wholesale_moq,
        image_url,
        image_urls
      )
    `)
    .eq('user_id', user_id);

  if (error) {
    return sendError(res, 'DB_ERROR', error.message, 400);
  }

  const normalized = (data || []).map((item: any) => ({
    ...item,
    products: item.products
      ? {
          ...item.products,
          name: item.products.title,
          buyer_price: item.products.price_buyer,
          wholesaler_price: item.products.price_wholesale,
        }
      : item.products,
  }));

  sendResponse(res, normalized, 'Cart fetched');
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(req: Request, res: Response) {
  const reqAny = req as any;
  const user_id = reqAny.user.id;
  const { cart_item_id, quantity } = req.body;

  if (!cart_item_id || !isValidObjectId(cart_item_id)) {
    return sendError(res, 'VALIDATION_ERROR', 'Valid cart_item_id is required', 400, reqAny.id);
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return sendError(res, 'VALIDATION_ERROR', 'Quantity must be a positive integer', 400, reqAny.id);
  }

  // Verify cart item belongs to user
  const { data: cartItem, error: fetchError } = await supabaseAdmin
    .from('cart_items')
    .select('id, product_id, quantity')
    .eq('id', cart_item_id)
    .eq('user_id', user_id)
    .single();

  if (fetchError || !cartItem) {
    return sendError(res, 'NOT_FOUND', 'Cart item not found or does not belong to you', 404, reqAny.id);
  }

  // Check available stock
  const { data: invRows } = await supabaseAdmin
    .from('inventory')
    .select('stock, reserved')
    .eq('product_id', cartItem.product_id)
    .is('variant_id', null)
    .limit(1);

  const inventory = invRows?.[0];
  if (!inventory) {
    return sendError(res, 'INVENTORY_ERROR', 'Inventory not found for this product', 404, reqAny.id);
  }

  const availableStock = inventory.stock - inventory.reserved;
  if (availableStock < quantity) {
    return sendError(res, 'OUT_OF_STOCK', `Insufficient stock. Available: ${availableStock}`, 400, reqAny.id);
  }

  // Update cart item
  const { data: updatedItem, error: updateError } = await supabaseAdmin
    .from('cart_items')
    .update({ quantity })
    .eq('id', cart_item_id)
    .eq('user_id', user_id)
    .select()
    .single();

  if (updateError) {
    return sendError(res, 'UPDATE_ERROR', updateError.message, 400, reqAny.id);
  }

  sendResponse(res, updatedItem, 'Cart item updated successfully');
}

/**
 * Remove cart item
 */
export async function removeCartItem(req: Request, res: Response) {
  const reqAny = req as any;
  const user_id = reqAny.user.id;
  const { id } = req.params;

  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid cart item ID format', 400, reqAny.id);
  }

  // Verify cart item belongs to user
  const { data: cartItem, error: fetchError } = await supabaseAdmin
    .from('cart_items')
    .select('id')
    .eq('id', id)
    .eq('user_id', user_id)
    .single();

  if (fetchError || !cartItem) {
    return sendError(res, 'NOT_FOUND', 'Cart item not found or does not belong to you', 404, reqAny.id);
  }

  // Delete cart item
  const { error: deleteError } = await supabaseAdmin
    .from('cart_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user_id);

  if (deleteError) {
    return sendError(res, 'DELETE_ERROR', deleteError.message, 400, reqAny.id);
  }

  sendResponse(res, null, 'Cart item removed successfully');
}

/**
 * Clear cart
 */
export async function clearCart(req: Request, res: Response) {
  const reqAny = req as any;
  const user_id = reqAny.user.id;

  const { error: deleteError } = await supabaseAdmin
    .from('cart_items')
    .delete()
    .eq('user_id', user_id);

  if (deleteError) {
    return sendError(res, 'DELETE_ERROR', deleteError.message, 400, reqAny.id);
  }

  sendResponse(res, null, 'Cart cleared successfully');
}
