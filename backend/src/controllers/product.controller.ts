/**
 * Product Controller
 * Business logic for product operations
 */

import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { sendResponse, sendError } from '../server.js';
import { validateImageUrl } from '../utils/urlValidator.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get all products with filters
 */
const MAX_LIST_LIMIT = 100;

export async function getProducts(req: Request, res: Response) {
  const reqAny = req as any;
  const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const category = req.query.category as string | undefined;
  const gender = req.query.gender as string | undefined;

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('is_active', true);

  if (category) query = query.eq('category', category);
  if (gender && ['men', 'women', 'unisex'].includes(gender)) {
    if (gender === 'men' || gender === 'women') {
      query = query.in('gender', [gender, 'unisex']);
    } else {
      query = query.eq('gender', gender);
    }
  }

  query = query
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    return sendError(res, 'FETCH_ERROR', error.message, 400, reqAny.id);
  }

  sendResponse(res, {
    products: data || [],
    total: count || 0,
    page: offset / limit + 1,
  });
}

/**
 * Search products
 */
export async function searchProducts(req: Request, res: Response) {
  const reqAny = req as any;
  const q = (req.query.q as string)?.trim();

  if (!q || q.length < 2) {
    return sendError(res, 'VALIDATION_ERROR', 'Search query too short', 400, reqAny.id);
  }

  const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  const { data, error, count } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
    .range(offset, offset + limit - 1);

  if (error) {
    return sendError(res, 'SEARCH_ERROR', error.message, 400, reqAny.id);
  }

  sendResponse(res, {
    products: data || [],
    total: count || 0,
  });
}

/**
 * Get categories
 */
export async function getCategories(req: Request, res: Response) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    return sendError(res, 'FETCH_ERROR', error.message, 400);
  }

  sendResponse(res, data || []);
}

/**
 * Get product by ID
 */
export async function getProductById(req: Request, res: Response) {
  const reqAny = req as any;
  const { id } = req.params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid product ID', 400, reqAny.id);
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return sendError(res, 'NOT_FOUND', 'Product not found', 404, reqAny.id);
  }

  sendResponse(res, data);
}

/**
 * Create product (Admin only)
 */
export async function createProduct(req: Request, res: Response) {
  const reqAny = req as any;
  const userId = reqAny.user.id;

  const {
    name,
    description,
    price,
    wholesalePrice,
    moq,
    category,
    stock,
  } = req.body;

  // Image upload
  let imageUrl: string | null = null;

  if (req.file) {
    const ext = req.file.originalname.split('.').pop();
    const fileName = `products/${uuidv4()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      return sendError(res, 'UPLOAD_ERROR', uploadError.message, 500, reqAny.id);
    }

    imageUrl = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(fileName).data.publicUrl;

    if (!validateImageUrl(imageUrl)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid image URL', 400, reqAny.id);
    }
  }

  // Generate slug
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 100) || `product-${Date.now()}`;

  // Insert product
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .insert({
      title: name,
      slug,
      description,
      category,
      price_buyer: Math.round(Number(price)),
      price_wholesale: Math.round(Number(wholesalePrice || price)),
      wholesale_moq: Number(moq) || 10,
      image_url: imageUrl,
      image_urls: imageUrl ? [imageUrl] : [],
      stock: Number(stock) || 0,
      created_by: userId,
      is_active: true,
    })
    .select('id, title, slug, description, price_buyer, price_wholesale, wholesale_moq, category, image_url, image_urls, created_by, stock, is_active, created_at')
    .single();

  if (error) {
    return sendError(res, 'INSERT_ERROR', error.message, 400, reqAny.id);
  }

  // Create inventory entry
  await supabaseAdmin.from('inventory').insert({
    product_id: product.id,
    variant_id: null,
    stock: Number(stock) || 0,
    reserved: 0,
    reorder_level: 10,
  });

  sendResponse(res, product, 'Product created successfully', 201);
}
