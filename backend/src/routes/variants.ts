import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { sendResponse, sendError, requireAuth, asyncHandler } from '../server.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { z } from 'zod';

const router = Router();

/**
 * Variant Schema
 */
const variantSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  type: z.enum(['size', 'color']),
  value: z.string().min(1, 'Value is required'),
  sku_suffix: z.string().optional(),
  buyer_price: z.number().positive().optional(),
  wholesaler_price: z.number().positive().optional(),
});

const variantUpdateSchema = z.object({
  type: z.enum(['size', 'color']).optional(),
  value: z.string().min(1).optional(),
  sku_suffix: z.string().optional(),
  buyer_price: z.number().positive().optional(),
  wholesaler_price: z.number().positive().optional(),
});

/* ================= GET VARIANTS BY PRODUCT (Admin Only) ================= */
router.get(
  '/product/:productId',
  adminLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const userId = reqAny.user?.id;
    const { productId } = req.params;

    // STEP 1: Strict Admin Check
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return sendError(res, 'FORBIDDEN', 'Access Denied: Admins only.', 403, reqAny.id);
    }

    // STEP 2: Validate product ID
    if (!productId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid product ID format', 400, reqAny.id);
    }

    // STEP 3: Fetch variants with inventory
    const { data: variants, error: variantsError } = await supabaseAdmin
      .from('variants')
      .select(`
        id,
        product_id,
        type,
        value,
        sku_suffix,
        buyer_price,
        wholesaler_price,
        created_at,
        inventory (
          id,
          stock,
          reserved,
          reorder_level
        )
      `)
      .eq('product_id', productId)
      .order('type', { ascending: true })
      .order('value', { ascending: true });

    if (variantsError) {
      return sendError(res, 'FETCH_ERROR', variantsError.message, 400, reqAny.id);
    }

    sendResponse(res, variants || [], 'Variants retrieved successfully');
  })
);

/* ================= CREATE VARIANT (Admin Only) ================= */
router.post(
  '/',
  adminLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const userId = reqAny.user?.id;

    // STEP 1: Strict Admin Check
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return sendError(res, 'FORBIDDEN', 'Access Denied: Admins only.', 403, reqAny.id);
    }

    // STEP 2: Validate input
    const validationResult = variantSchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        validationResult.error.errors[0].message,
        400,
        reqAny.id
      );
    }

    const { product_id, type, value, sku_suffix, buyer_price, wholesaler_price } = validationResult.data;

    // STEP 3: Check if product exists
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, title')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return sendError(res, 'NOT_FOUND', 'Product not found', 404, reqAny.id);
    }

    // STEP 4: Check for duplicate variant (same product, type, value)
    const { data: existingVariant } = await supabaseAdmin
      .from('variants')
      .select('id')
      .eq('product_id', product_id)
      .eq('type', type)
      .eq('value', value)
      .single();

    if (existingVariant) {
      return sendError(res, 'DUPLICATE_ERROR', 'Variant with this type and value already exists', 409, reqAny.id);
    }

    // STEP 5: Create variant
    const { data: newVariant, error: insertError } = await supabaseAdmin
      .from('variants')
      .insert([
        {
          product_id,
          type,
          value,
          sku_suffix: sku_suffix || null,
          buyer_price: buyer_price || null,
          wholesaler_price: wholesaler_price || null,
        },
      ])
      .select()
      .single();

    if (insertError) {
      return sendError(res, 'INSERT_ERROR', insertError.message, 400, reqAny.id);
    }

    // STEP 6: Create inventory entry for this variant
    await supabaseAdmin.from('inventory').insert([
      {
        product_id,
        variant_id: newVariant.id,
        stock: 0,
        reserved: 0,
        reorder_level: 10,
      },
    ]);

    sendResponse(res, newVariant, 'Variant created successfully', 201);
  })
);

/* ================= UPDATE VARIANT (Admin Only) ================= */
router.put(
  '/:id',
  adminLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const userId = reqAny.user?.id;
    const { id } = req.params;

    // STEP 1: Strict Admin Check
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return sendError(res, 'FORBIDDEN', 'Access Denied: Admins only.', 403, reqAny.id);
    }

    // STEP 2: Validate variant ID
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid variant ID format', 400, reqAny.id);
    }

    // STEP 3: Validate input
    const validationResult = variantUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        validationResult.error.errors[0].message,
        400,
        reqAny.id
      );
    }

    // STEP 4: Check if variant exists
    const { data: existingVariant, error: fetchError } = await supabaseAdmin
      .from('variants')
      .select('id, product_id, type, value')
      .eq('id', id)
      .single();

    if (fetchError || !existingVariant) {
      return sendError(res, 'NOT_FOUND', 'Variant not found', 404, reqAny.id);
    }

    // STEP 5: Check for duplicate if type/value is being changed
    if (validationResult.data.type || validationResult.data.value) {
      const newType = validationResult.data.type || existingVariant.type;
      const newValue = validationResult.data.value || existingVariant.value;

      const { data: duplicate } = await supabaseAdmin
        .from('variants')
        .select('id')
        .eq('product_id', existingVariant.product_id)
        .eq('type', newType)
        .eq('value', newValue)
        .neq('id', id)
        .single();

      if (duplicate) {
        return sendError(res, 'DUPLICATE_ERROR', 'Variant with this type and value already exists', 409, reqAny.id);
      }
    }

    // STEP 6: Update variant
    const updateData: any = {};
    if (validationResult.data.type !== undefined) updateData.type = validationResult.data.type;
    if (validationResult.data.value !== undefined) updateData.value = validationResult.data.value;
    if (validationResult.data.sku_suffix !== undefined) updateData.sku_suffix = validationResult.data.sku_suffix;
    if (validationResult.data.buyer_price !== undefined) updateData.buyer_price = validationResult.data.buyer_price;
    if (validationResult.data.wholesaler_price !== undefined) updateData.wholesaler_price = validationResult.data.wholesaler_price;

    const { data: updatedVariant, error: updateError } = await supabaseAdmin
      .from('variants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return sendError(res, 'UPDATE_ERROR', updateError.message, 400, reqAny.id);
    }

    sendResponse(res, updatedVariant, 'Variant updated successfully');
  })
);

/* ================= DELETE VARIANT (Admin Only) ================= */
router.delete(
  '/:id',
  adminLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const userId = reqAny.user?.id;
    const { id } = req.params;

    // STEP 1: Strict Admin Check
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return sendError(res, 'FORBIDDEN', 'Access Denied: Admins only.', 403, reqAny.id);
    }

    // STEP 2: Validate variant ID
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid variant ID format', 400, reqAny.id);
    }

    // STEP 3: Check if variant exists
    const { data: existingVariant, error: fetchError } = await supabaseAdmin
      .from('variants')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingVariant) {
      return sendError(res, 'NOT_FOUND', 'Variant not found', 404, reqAny.id);
    }

    // STEP 4: Delete variant (cascade will delete inventory)
    const { error: deleteError } = await supabaseAdmin.from('variants').delete().eq('id', id);

    if (deleteError) {
      return sendError(res, 'DELETE_ERROR', deleteError.message, 400, reqAny.id);
    }

    sendResponse(res, { id }, 'Variant deleted successfully');
  })
);

/* ================= UPDATE VARIANT INVENTORY (Admin Only) ================= */
router.put(
  '/:id/inventory',
  adminLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const reqAny = req as any;
    const userId = reqAny.user?.id;
    const { id } = req.params;
    const { stock } = req.body;

    // STEP 1: Strict Admin Check
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return sendError(res, 'FORBIDDEN', 'Access Denied: Admins only.', 403, reqAny.id);
    }

    // STEP 2: Validate stock
    if (typeof stock !== 'number' || stock < 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Stock must be a non-negative number', 400, reqAny.id);
    }

    // STEP 3: Get variant to find product_id
    const { data: variant, error: variantError } = await supabaseAdmin
      .from('variants')
      .select('id, product_id')
      .eq('id', id)
      .single();

    if (variantError || !variant) {
      return sendError(res, 'NOT_FOUND', 'Variant not found', 404, reqAny.id);
    }

    // STEP 4: Update inventory
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('inventory')
      .select('id')
      .eq('product_id', variant.product_id)
      .eq('variant_id', id)
      .single();

    if (inventoryError || !inventory) {
      // Create inventory if it doesn't exist
      const { data: newInventory, error: createError } = await supabaseAdmin
        .from('inventory')
        .insert([
          {
            product_id: variant.product_id,
            variant_id: id,
            stock: Math.round(stock),
            reserved: 0,
            reorder_level: 10,
          },
        ])
        .select()
        .single();

      if (createError) {
        return sendError(res, 'INVENTORY_ERROR', createError.message, 400, reqAny.id);
      }

      return sendResponse(res, newInventory, 'Inventory created and updated successfully');
    }

    const { data: updatedInventory, error: updateError } = await supabaseAdmin
      .from('inventory')
      .update({
        stock: Math.round(stock),
        updated_at: new Date().toISOString(),
      })
      .eq('id', inventory.id)
      .select()
      .single();

    if (updateError) {
      return sendError(res, 'UPDATE_ERROR', updateError.message, 400, reqAny.id);
    }

    sendResponse(res, updatedInventory, 'Inventory updated successfully');
  })
);

export default router;
