import { Router, Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireAdmin, sendResponse, sendError, asyncHandler } from '../server.js';
import { upload, uploadForAdmin } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { updateProductSchema, createProductSchema } from '../schemas/product.schema.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { v4 as uuidv4 } from 'uuid';
import { validateImageUrl } from '../utils/urlValidator.js';
import { writeAuditLog, getRequestMeta } from '../utils/auditLog.js';

const router = Router();
const MAX_LIST_LIMIT = 100;

/* ================= GLOBAL ADMIN MIDDLEWARE ================= */
router.use(requireAuth);
router.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/status') return next();
  return requireAdmin(req, res, next);
});

/* ================= CHECK ADMIN STATUS ================= */
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const user = reqAny.user;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error) {
    return sendError(res, 'NOT_FOUND', 'User profile not found', 404, reqAny.id);
  }

  const isAdmin = profile?.role === 'admin';
  sendResponse(res, { isAdmin, role: profile?.role });
}));

/* ================= GET DASHBOARD STATS (ADMIN ONLY) ================= */
router.get('/stats', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const user = reqAny.user;

  // STEP 1: Strict Admin Check
  const { data: adminCheck, error: adminError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (adminError || adminCheck?.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Admin access required', 403, reqAny.id);
  }

  // STEP 2: Fetch counts in parallel for better performance
  const [
    { count: totalUsers },
    { count: totalProducts },
    { count: totalOrders },
    { count: activeUsers },
    { count: pendingOrders },
    { data: revenueData }
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin
      .from('orders')
      .select('total_amount')
      .eq('status', 'delivered')
  ]);

  // Calculate total revenue from delivered orders
  const revenue = revenueData?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0;

  // STEP 3: Get today's stats
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    { count: newOrdersToday },
    { count: completedOrdersToday },
    { count: leadsCount }
  ] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString()),
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'delivered')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString()),
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .not('user_name', 'is', null)
      .not('user_email', 'is', null)
  ]);

  sendResponse(res, {
    totalUsers: totalUsers || 0,
    totalProducts: totalProducts || 0,
    totalOrders: totalOrders || 0,
    activeUsers: activeUsers || 0,
    pendingOrders: pendingOrders || 0,
    revenue: revenue || 0,
    newOrdersToday: newOrdersToday || 0,
    completedOrdersToday: completedOrdersToday || 0,
    leadsCount: leadsCount || 0,
  });
}));

/* ================= UPDATE PRODUCT (Admin Only) ================= */
router.put('/products/:id', adminLimiter, upload.single('image'), validate(updateProductSchema), asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const { id } = req.params;
  const userId = reqAny.user?.id;

  // STEP 1: Validate product ID format (UUID)
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid product ID format', 400, reqAny.id);
  }

  // STEP 2: Strict Admin Check
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Access Denied: Admins only.', 403, reqAny.id);
  }

  // STEP 3: Check if product exists
  const { data: existingProduct, error: fetchError } = await supabaseAdmin
    .from('products')
    .select('id, title, slug')
    .eq('id', id)
    .single();

  if (fetchError || !existingProduct) {
    return sendError(res, 'NOT_FOUND', 'Product not found', 404, reqAny.id);
  }

  // STEP 4: Prepare update data
  const updateData: any = {};
  const { name, description, price, wholesalePrice, moq, category, gender, stock, is_active } = req.body;

  if (name !== undefined) {
    updateData.title = name;
    // Regenerate slug if name changes
    function generateSlug(text: string): string {
      return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 100) || `product-${Date.now()}`;
    }
    updateData.slug = generateSlug(name);
  }

  if (description !== undefined) updateData.description = description;
  if (price !== undefined) updateData.price_buyer = Math.round(Number(price));
  if (wholesalePrice !== undefined) {
    updateData.price_wholesale = Math.round(Number(wholesalePrice));
    // updateData.price_wholesaler = Removed temporarily due to Supabase cache issue
  }
  if (moq !== undefined) updateData.wholesale_moq = Number(moq);
  if (category !== undefined) updateData.category = category;
  if (gender !== undefined) {
    const validGenders = ['men', 'women', 'unisex'];
    if (validGenders.includes(gender)) {
      updateData.gender = gender;
    }
  }
  if (stock !== undefined) updateData.stock = Number(stock);
  if (is_active !== undefined) updateData.is_active = is_active;

  // STEP 5: Handle image upload if provided
  if (req.file) {
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      return sendError(res, 'UPLOAD_ERROR', `Image upload failed: ${uploadError.message}`, 500, reqAny.id);
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(filePath);

    updateData.image_url = urlData.publicUrl;

    // Validate uploaded image URL
    if (!validateImageUrl(urlData.publicUrl)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid image URL', 400, reqAny.id);
    }

    // Update image_urls array if image_url exists
    if (urlData.publicUrl) {
      const { data: currentProduct } = await supabaseAdmin
        .from('products')
        .select('image_urls')
        .eq('id', id)
        .single();
      
      const existingUrls = (currentProduct?.image_urls as string[]) || [];
      if (!existingUrls.includes(urlData.publicUrl)) {
        updateData.image_urls = [...existingUrls, urlData.publicUrl];
      }
    }
  } else if (req.body.image_url !== undefined) {
    const providedUrl = req.body.image_url || null;
    
    // Validate provided image URL
    if (providedUrl && !validateImageUrl(providedUrl)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid image URL', 400, reqAny.id);
    }

    updateData.image_url = providedUrl;
    if (providedUrl) {
      const { data: currentProduct } = await supabaseAdmin
        .from('products')
        .select('image_urls')
        .eq('id', id)
        .single();
      
      const existingUrls = (currentProduct?.image_urls as string[]) || [];
      if (!existingUrls.includes(req.body.image_url)) {
        updateData.image_urls = [...existingUrls, req.body.image_url];
      }
    }
  }

  // updateData.updated_at removed - column doesn't exist in products table

  // STEP 6: Update product
  const { data: updatedProduct, error: updateError } = await supabaseAdmin
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return sendError(res, 'UPDATE_ERROR', updateError.message, 400, reqAny.id);
  }

  // STEP 7: Update inventory if stock changed
  if (stock !== undefined) {
    const { data: inventory } = await supabaseAdmin
      .from('inventory')
      .select('id')
      .eq('product_id', id)
      .is('variant_id', null)
      .single();

    if (inventory) {
      // Update existing inventory
      await supabaseAdmin
        .from('inventory')
        .update({
          stock: Number(stock),
          updated_at: new Date().toISOString(),
        })
        .eq('id', inventory.id);
    } else {
      // Create inventory entry if it doesn't exist
      await supabaseAdmin
        .from('inventory')
        .insert([{
          product_id: id,
          variant_id: null,
          stock: Number(stock),
          reserved: 0,
          reorder_level: 10,
        }]);
    }
  }

  sendResponse(res, updatedProduct, 'Product updated successfully');
}));

/* ================= DELETE PRODUCT (Admin Only - Hard Delete) ================= */
router.delete('/products/:id', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const { id } = req.params;
  const userId = reqAny.user?.id;

  // STEP 1: Validate product ID format (UUID)
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid product ID format', 400, reqAny.id);
  }

  // STEP 2: Strict Admin Check
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Access Denied: Admins only.', 403, reqAny.id);
  }

  // STEP 3: Check if product exists
  const { data: existingProduct, error: fetchError } = await supabaseAdmin
    .from('products')
    .select('id, title, is_active')
    .eq('id', id)
    .single();

  if (fetchError || !existingProduct) {
    return sendError(res, 'NOT_FOUND', 'Product not found', 404, reqAny.id);
  }

  // STEP 4: Check if product is used in any orders
  const { data: orderItems, error: orderItemsError } = await supabaseAdmin
    .from('order_items')
    .select('id')
    .eq('product_id', id)
    .limit(1);

  if (orderItemsError) {
    console.error('Error checking order items:', orderItemsError);
  }

  // STEP 5: Hard delete product (permanently remove)
  // If product is used in orders, we'll still delete but warn admin
  const { data: deletedProduct, error: deleteError } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (deleteError) {
    // If delete fails due to foreign key constraint, try soft delete instead
    if (deleteError.code === '23503' || deleteError.message.includes('foreign key')) {
      const { data: softDeletedProduct, error: softDeleteError } = await supabaseAdmin
        .from('products')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (softDeleteError) {
        return sendError(res, 'DELETE_ERROR', softDeleteError.message, 400, reqAny.id);
      }

      const { ip, user_agent } = getRequestMeta(req);
      await writeAuditLog({
        admin_id: userId,
        action: 'product.soft_delete',
        entity_type: 'product',
        entity_id: id,
        old_value: { title: existingProduct.title, is_active: existingProduct.is_active },
        new_value: { is_active: false },
        ip,
        user_agent,
      });

      return sendResponse(
        res,
        softDeletedProduct,
        'Product cannot be deleted as it is used in orders. Product has been deactivated instead.'
      );
    }

    return sendError(res, 'DELETE_ERROR', deleteError.message, 400, reqAny.id);
  }

  const { ip, user_agent } = getRequestMeta(req);
  await writeAuditLog({
    admin_id: userId,
    action: 'product.delete',
    entity_type: 'product',
    entity_id: id,
    old_value: { title: existingProduct.title, is_active: existingProduct.is_active },
    ip,
    user_agent,
  });

  sendResponse(res, deletedProduct, 'Product deleted successfully');
}));

/* ================= UPLOAD FILE (Admin Only) ================= */
router.post('/upload', adminLimiter, uploadForAdmin.single('file'), asyncHandler(async (req: Request, res: Response) => {
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

  // STEP 2: Validate file upload
  if (!req.file) {
    return sendError(res, 'VALIDATION_ERROR', 'No file uploaded', 400, reqAny.id);
  }

  // STEP 3: Determine bucket based on gender or file type
  const fileMimeType = req.file.mimetype;
  const gender = req.body.gender as string | undefined; // 'men' or 'women'
  
  let bucketName: string;
  let filePath: string;
  
  if (fileMimeType.startsWith('image/')) {
    if (gender === 'men') {
      bucketName = 'men-products';
      filePath = `men-products/${uuidv4()}.${req.file.originalname.split('.').pop()}`;
    } else if (gender === 'women') {
      bucketName = 'women-products';
      filePath = `women-products/${uuidv4()}.${req.file.originalname.split('.').pop()}`;
    } else {
      bucketName = 'product-images';
      filePath = `products/${uuidv4()}.${req.file.originalname.split('.').pop()}`;
    }
  } else {
    bucketName = 'product-videos';
    filePath = `videos/${uuidv4()}.${req.file.originalname.split('.').pop()}`;
  }

  // STEP 4: Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from(bucketName)
    .upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true
    });

  if (uploadError) {
    return sendError(res, 'UPLOAD_ERROR', `File upload failed: ${uploadError.message}`, 500, reqAny.id);
  }

  // STEP 5: Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  sendResponse(res, {
    url: urlData.publicUrl,
    path: filePath,
    bucket: bucketName,
    filename: filePath.split('/').pop(),
    size: req.file.size,
    mimetype: req.file.mimetype,
  }, 'File uploaded successfully');
}));

/* ================= GET ALL PRODUCTS (Admin Only - Includes Inactive) ================= */
router.get('/products', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
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

  // STEP 2: Get query parameters
  const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const category = req.query.category as string | undefined;
  const gender = req.query.gender as string | undefined;
  const searchQuery = req.query.q as string | undefined;

  // STEP 3: Build query - NO is_active filter (admin sees all products)
  let query = supabaseAdmin
    .from('products')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  // Apply filters
  if (category) {
    query = query.eq('category', category);
  }
  if (gender && ['men', 'women', 'unisex'].includes(gender)) {
    query = query.eq('gender', gender);
  }
  if (searchQuery && searchQuery.trim().length >= 2) {
    query = query.or(`title.ilike.%${searchQuery.trim()}%,description.ilike.%${searchQuery.trim()}%,category.ilike.%${searchQuery.trim()}%`);
  }

  // STEP 4: Execute query
  const { data: products, error, count } = await query;

  if (error) {
    return sendError(res, 'FETCH_ERROR', error.message, 400, reqAny.id);
  }

  sendResponse(res, {
    products: products || [],
    total: count || 0,
    page: offset / limit + 1,
  }, 'Products retrieved successfully');
}));

/* ================= CREATE PRODUCT (Admin Only) ================= */
router.post('/products', adminLimiter, upload.single('image'), validate(createProductSchema), asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  // UPDATE: Wholesale fields bhi receive kar rahe hain
  const { name, description, price, wholesalePrice, moq, category, gender, stock } = req.body;
  const userId = reqAny.user?.id;

  // STEP 1: Strict Admin Check using 'supabaseAdmin'
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Access Denied: Admins only.', 403, reqAny.id);
  }

  // STEP 2: Image Upload Logic
  let image_url = req.body.image_url || null; 
  
  if (req.file) {
    // Unique filename using UUID
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(filePath, req.file.buffer, { 
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      return sendError(res, 'UPLOAD_ERROR', `Image upload failed: ${uploadError.message}`, 500, reqAny.id);
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(filePath);
      
    image_url = urlData.publicUrl;

    // Validate uploaded image URL
    if (!validateImageUrl(image_url)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid image URL', 400, reqAny.id);
    }
  } else if (req.body.image_url) {
    // Validate provided image URL
    if (!validateImageUrl(req.body.image_url)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid image URL', 400, reqAny.id);
    }
  }

  // STEP 3: Generate slug (REQUIRED field in schema)
  // Format: lowercase, hyphenated, URL-safe
  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 100) || `product-${Date.now()}`;
  }
  const slug = generateSlug(name);

  // STEP 4: Insert Product into Database (price_wholesaler exists in schema)
  // ALIGNED TO PRODUCTION SCHEMA: title (not name), slug (required), stock (exists), created_by (exists)
  // image_urls (jsonb array), price_buyer (integer), both price_wholesale and price_wholesaler
  // Note: gender is already destructured from req.body on line 389
  
  const { data: newProduct, error: insertError } = await supabaseAdmin
    .from('products')
    .insert([{
      title: name, // ✅ Schema uses 'title', not 'name'
      slug: slug, // ✅ REQUIRED field in schema
      description,
      price_buyer: Math.round(Number(price)), // ✅ Schema uses INTEGER, not numeric
      price_wholesale: Math.round(Number(wholesalePrice) || Number(price)), // ✅ INTEGER
      // price_wholesaler: Removed temporarily due to Supabase cache issue - column exists but cache doesn't recognize it
      wholesale_moq: Number(moq) || 10,
      category,
      gender: gender || 'unisex', // ✅ Add gender field
      image_urls: image_url ? [image_url] : [], // ✅ Schema uses jsonb array
      image_url: image_url || null, // ✅ Also set single URL (both exist in schema)
      created_by: userId, // ✅ EXISTS in schema
      stock: Number(stock) || 0, // ✅ EXISTS in schema (integer)
      is_active: true
    }])
    .select('id, title, slug, description, price_buyer, price_wholesale, wholesale_moq, category, image_url, image_urls, created_by, stock, is_active, created_at')
    .single();

  if (insertError) {
    return sendError(res, 'INSERT_ERROR', insertError.message, 400, reqAny.id);
  }

  // STEP 5: Create inventory row (trigger may also create; duplicate = ignore)
  const initialStock = Number(stock) || 0;
  const { error: inventoryError } = await supabaseAdmin
    .from('inventory')
    .insert([{
      product_id: newProduct.id,
      variant_id: null,
      stock: initialStock,
      reserved: 0,
      reorder_level: 10,
    }]);

  if (inventoryError) {
    if (inventoryError.code === '23505') {
      // Unique violation: trigger already created row; update stock
      await supabaseAdmin.from('inventory').update({ stock: initialStock, reorder_level: 10 })
        .eq('product_id', newProduct.id).is('variant_id', null);
    } else {
      await supabaseAdmin.from('products').delete().eq('id', newProduct.id);
      return sendError(res, 'INVENTORY_ERROR', `Failed to create inventory: ${inventoryError.message}`, 500, reqAny.id);
    }
  }

  sendResponse(res, newProduct, 'Product created successfully', 201);
}));

/* ================= GET ALL ORDERS (Admin Only) ================= */
router.get('/orders', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
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

  // STEP 2: Pagination and filtering
  const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const status = req.query.status as string | undefined;
  const userIdFilter = req.query.user_id as string | undefined;

  // STEP 3: Build query with user info from orders table
  // Query orders first, then fetch order_items separately to avoid Supabase alias issues
  let query = supabaseAdmin
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      total_amount,
      created_at,
      user_id,
      user_name,
      user_email,
      user_phone,
      user_type
    `, { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  // Apply filters
  if (status) {
    query = query.eq('status', status);
  }

  if (userIdFilter) {
    query = query.eq('user_id', userIdFilter);
  }

  // STEP 4: Execute query
  const { data: orders, error, count } = await query;

  if (error) {
    return sendError(res, 'FETCH_ERROR', error.message, 400, reqAny.id);
  }

  // STEP 5: Batch fetch order_items for all orders (avoid N+1)
  const orderIds = (orders || []).map((o: any) => o.id);
  let itemsByOrderId: Record<string, any[]> = {};
  if (orderIds.length > 0) {
    const { data: allItems } = await supabaseAdmin
      .from('order_items')
      .select(`
        order_id,
        id,
        quantity,
        unit_price,
        products (
          id,
          title,
          image_url
        )
      `)
      .in('order_id', orderIds);
    for (const item of allItems || []) {
      const oid = (item as any).order_id;
      if (!itemsByOrderId[oid]) itemsByOrderId[oid] = [];
      itemsByOrderId[oid].push(item);
    }
  }

  const ordersWithItems = (orders || []).map((order: any) => ({
    ...order,
    order_items: itemsByOrderId[order.id] || [],
  }));

  sendResponse(res, {
    orders: ordersWithItems,
    total: count || 0,
    page: offset / limit + 1,
    limit,
    offset,
  }, 'Orders retrieved successfully');
}));

/* ================= UPDATE ORDER (Admin Only) ================= */
router.put('/orders/:id', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const userId = reqAny.user?.id;
  const { id } = req.params;
  const { status, notes } = req.body;

  // STEP 1: Strict Admin Check
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Access Denied: Admins only.', 403, reqAny.id);
  }

  // STEP 2: Validate order ID format (UUID)
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid order ID format', 400, reqAny.id);
  }

  // STEP 3: Validate status if provided
  const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    return sendError(res, 'VALIDATION_ERROR', `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400, reqAny.id);
  }

  // STEP 4: Check if order exists
  const { data: existingOrder, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('id, status')
    .eq('id', id)
    .single();

  if (fetchError || !existingOrder) {
    return sendError(res, 'NOT_FOUND', 'Order not found', 404, reqAny.id);
  }

  // STEP 5: Prepare update data
  const updateData: any = {
    // updated_at removed - column doesn't exist in orders table
  };

  if (status) {
    updateData.status = status;
  }

  if (notes !== undefined) {
    updateData.notes = notes;
  }

  // STEP 6: Update order
  const { data: updatedOrder, error: updateError } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('id', id)
    .select(`
      id,
      order_number,
      status,
      total_amount,
      created_at,
      user_id,
      user_name,
      user_email,
      user_phone,
      user_type,
      order_items!order_items_order_id_fkey (
        id,
        quantity,
        unit_price
      )
    `)
    .single();

  if (updateError) {
    return sendError(res, 'UPDATE_ERROR', updateError.message, 400, reqAny.id);
  }

  if (status && existingOrder.status !== status) {
    const { ip, user_agent } = getRequestMeta(req);
    await writeAuditLog({
      admin_id: userId,
      action: 'order.status_update',
      entity_type: 'order',
      entity_id: id,
      old_value: { status: existingOrder.status },
      new_value: { status },
      ip,
      user_agent,
    });
  }

  // Note: Inventory release is handled by database trigger if status changes to 'cancelled'
  sendResponse(res, updatedOrder, 'Order updated successfully');
}));

/* ================= GET ORDER BY ID (Admin Only) ================= */
router.get('/orders/:id', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
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

  // STEP 2: Validate order ID format (UUID)
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid order ID format', 400, reqAny.id);
  }

  // STEP 3: Fetch order with full details
  const { data: order, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      total_amount,
      created_at,
      updated_at,
      user_id,
      user_name,
      user_email,
      user_phone,
      user_type,
      order_items!order_items_order_id_fkey (
        id,
        quantity,
        unit_price
      )
    `)
    .eq('id', id)
    .single();

  if (fetchError || !order) {
    return sendError(res, 'NOT_FOUND', 'Order not found', 404, reqAny.id);
  }

  sendResponse(res, order, 'Order retrieved successfully');
}));

/* ================= GET INVENTORY (Admin Only) ================= */
router.get('/inventory', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
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

  // STEP 2: Fetch inventory with product details
  const { data: inventory, error: fetchError } = await supabaseAdmin
    .from('inventory')
    .select(`
      id,
      product_id,
      variant_id,
      stock,
      reserved,
      reorder_level,
      updated_at,
      products (
        id,
        title,
        image_url,
        image_urls
      )
    `)
    .is('variant_id', null) // Base products only
    .order('updated_at', { ascending: false });

  if (fetchError) {
    return sendError(res, 'FETCH_ERROR', fetchError.message, 400, reqAny.id);
  }

  sendResponse(res, inventory || [], 'Inventory retrieved successfully');
}));

/* ================= UPDATE INVENTORY STOCK (Admin Only) ================= */
router.put('/inventory/:id/stock', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
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

  // STEP 3: Update inventory
  const { data: updatedInventory, error: updateError } = await supabaseAdmin
    .from('inventory')
    .update({
      stock: Math.round(stock),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      id,
      product_id,
      variant_id,
      stock,
      reserved,
      reorder_level,
      updated_at,
      products (
        id,
        title,
        image_url
      )
    `)
    .single();

  if (updateError) {
    return sendError(res, 'UPDATE_ERROR', updateError.message, 400, reqAny.id);
  }

  sendResponse(res, updatedInventory, 'Inventory stock updated successfully');
}));

/* ================= UPDATE INVENTORY REORDER LEVEL (Admin Only) ================= */
router.put('/inventory/:id/reorder-level', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const userId = reqAny.user?.id;
  const { id } = req.params;
  const { reorder_level } = req.body;

  // STEP 1: Strict Admin Check
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Access Denied: Admins only.', 403, reqAny.id);
  }

  // STEP 2: Validate reorder_level
  if (typeof reorder_level !== 'number' || reorder_level < 0) {
    return sendError(res, 'VALIDATION_ERROR', 'Reorder level must be a non-negative number', 400, reqAny.id);
  }

  // STEP 3: Update reorder level
  const { data: updatedInventory, error: updateError } = await supabaseAdmin
    .from('inventory')
    .update({
      reorder_level: Math.round(reorder_level),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      id,
      product_id,
      variant_id,
      stock,
      reserved,
      reorder_level,
      updated_at,
      products (
        id,
        title,
        image_url
      )
    `)
    .single();

  if (updateError) {
    return sendError(res, 'UPDATE_ERROR', updateError.message, 400, reqAny.id);
  }

  sendResponse(res, updatedInventory, 'Reorder level updated successfully');
}));

/* ================= GET NOTIFICATIONS (Admin Only) ================= */
router.get('/notifications', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
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

  // STEP 2: Fetch notifications
  const { data: notifications, error: fetchError } = await supabaseAdmin
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (fetchError) {
    return sendError(res, 'FETCH_ERROR', fetchError.message, 400, reqAny.id);
  }

  // STEP 3: Count unread notifications
  const { count: unreadCount } = await supabaseAdmin
    .from('admin_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);

  sendResponse(res, {
    notifications: notifications || [],
    unread_count: unreadCount || 0,
  }, 'Notifications retrieved successfully');
}));

/* ================= MARK NOTIFICATION AS READ (Admin Only) ================= */
router.put('/notifications/:id/read', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
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

  // STEP 2: Validate notification ID
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid notification ID format', 400, reqAny.id);
  }

  // STEP 3: Update notification
  const { data: updatedNotification, error: updateError } = await supabaseAdmin
    .from('admin_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return sendError(res, 'UPDATE_ERROR', updateError.message, 400, reqAny.id);
  }

  sendResponse(res, updatedNotification, 'Notification marked as read');
}));

/* ================= MARK ALL NOTIFICATIONS AS READ (Admin Only) ================= */
router.put('/notifications/read-all', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
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

  // STEP 2: Update all unread notifications
  const { error: updateError } = await supabaseAdmin
    .from('admin_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('is_read', false);

  if (updateError) {
    return sendError(res, 'UPDATE_ERROR', updateError.message, 400, reqAny.id);
  }

  sendResponse(res, { success: true }, 'All notifications marked as read');
}));

/* ================= MOVE PRODUCT TO GENDER CATEGORY (Admin Only) ================= */
router.put('/products/:id/move-gender', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const userId = reqAny.user?.id;
  const { id } = req.params;
  const { gender } = req.body;

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
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid product ID format', 400, reqAny.id);
  }

  // STEP 3: Validate gender
  const validGenders = ['men', 'women', 'unisex'];
  if (!gender || !validGenders.includes(gender)) {
    return sendError(res, 'VALIDATION_ERROR', `Invalid gender. Must be one of: ${validGenders.join(', ')}`, 400, reqAny.id);
  }

  // STEP 4: Check if product exists
  const { data: existingProduct, error: fetchError } = await supabaseAdmin
    .from('products')
    .select('id, title')
    .eq('id', id)
    .single();

  if (fetchError || !existingProduct) {
    return sendError(res, 'NOT_FOUND', 'Product not found', 404, reqAny.id);
  }

  // STEP 5: Update product gender
  const { data: updatedProduct, error: updateError } = await supabaseAdmin
    .from('products')
    .update({ gender })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return sendError(res, 'UPDATE_ERROR', updateError.message, 400, reqAny.id);
  }

  sendResponse(res, updatedProduct, 'Product moved to gender category successfully');
}));

/* ================= UPDATE PRODUCT STATUS (Admin Only) ================= */
router.put('/products/:id/status', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const userId = reqAny.user?.id;
  const { id } = req.params;
  const { is_active } = req.body;

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
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid product ID format', 400, reqAny.id);
  }

  // STEP 3: Validate is_active
  if (typeof is_active !== 'boolean') {
    return sendError(res, 'VALIDATION_ERROR', 'is_active must be a boolean', 400, reqAny.id);
  }

  // STEP 4: Check if product exists
  const { data: existingProduct, error: fetchError } = await supabaseAdmin
    .from('products')
    .select('id, title')
    .eq('id', id)
    .single();

  if (fetchError || !existingProduct) {
    return sendError(res, 'NOT_FOUND', 'Product not found', 404, reqAny.id);
  }

  // STEP 5: Update product status
  const { data: updatedProduct, error: updateError } = await supabaseAdmin
    .from('products')
    .update({ is_active })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return sendError(res, 'UPDATE_ERROR', updateError.message, 400, reqAny.id);
  }

  sendResponse(res, updatedProduct, 'Product status updated successfully');
}));

/* ================= GET LEADS (Admin Only) ================= */
router.get('/leads', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
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

  // STEP 2: Pagination
  const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  // STEP 3: Fetch leads (orders with user details from checkout)
  const { data: leads, error: fetchError, count } = await supabaseAdmin
    .from('orders')
    .select(`
      id,
      order_number,
      user_name,
      user_email,
      user_phone,
      user_type,
      total_amount,
      status,
      created_at
    `, { count: 'exact' })
    .not('user_name', 'is', null)
    .not('user_email', 'is', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (fetchError) {
    return sendError(res, 'FETCH_ERROR', fetchError.message, 400, reqAny.id);
  }

  sendResponse(res, {
    leads: leads || [],
    total: count || 0,
    page: offset / limit + 1,
    limit,
    offset,
  }, 'Leads retrieved successfully');
}));

/* ================= GET ADMIN PROFILE (Admin Only) ================= */
router.get('/profile', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
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

  // STEP 2: Fetch full profile
  // Include phone_number (Supabase schema) - REMOVED contact_number, whatsapp_number, otp_enabled (don't exist)
  // Using is_active instead of status
  // Note: avatar_url column may not exist yet - fetch without it first, then add null if missing
  const { data: fullProfile, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, full_name, phone_number, is_active, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (fetchError) {
    console.error('❌ Profile fetch error:', JSON.stringify(fetchError, null, 2));
    return sendError(res, 'NOT_FOUND', `Profile not found: ${fetchError.message}`, 404, reqAny.id);
  }

  // Add avatar_url as null if column doesn't exist (will be added via migration)
  if (fullProfile && !('avatar_url' in fullProfile)) {
    (fullProfile as any).avatar_url = null;
  }

  if (!fullProfile) {
    return sendError(res, 'NOT_FOUND', 'Profile not found', 404, reqAny.id);
  }

  // Add default values for fields that don't exist in schema
  const profileResponse = {
    ...fullProfile,
    otp_enabled: true, // Default to true if column doesn't exist
    status: fullProfile.is_active ? 'active' : 'inactive', // Map is_active to status for frontend compatibility
  };

  sendResponse(res, profileResponse, 'Profile retrieved successfully');
}));

/* ================= UPDATE ADMIN PROFILE (Admin Only) ================= */
router.put('/profile', adminLimiter, asyncHandler(async (req: Request, res: Response) => {
  const reqAny = req as any;
  const userId = reqAny.user?.id;
  // Accept phone_number (Supabase schema)
  // REMOVED contact_number, whatsapp_number, otp_enabled - columns don't exist in Supabase
  const { full_name, phone_number, avatar_url } = req.body;
  // Ignore otp_enabled if sent - column doesn't exist

  // STEP 1: Strict Admin Check
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return sendError(res, 'FORBIDDEN', 'Access Denied: Admins only.', 403, reqAny.id);
  }

  // STEP 2: Validate phone numbers if provided
  if (phone_number && !/^[6-9]\d{9}$/.test(phone_number)) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid phone number format', 400, reqAny.id);
  }

  // REMOVED contact_number validation - column doesn't exist

  // REMOVED whatsapp_number validation - column doesn't exist

  // STEP 3: Prepare update data
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  // Only include fields that have actual values (not empty strings or undefined)
  if (full_name !== undefined && full_name !== null && full_name.trim() !== '') {
    updateData.full_name = full_name.trim();
  }
  
  // phone_number is the main column in Supabase schema
  // REMOVED contact_number, whatsapp_number, otp_enabled - columns don't exist
  if (phone_number !== undefined && phone_number !== null && phone_number.trim() !== '') {
    updateData.phone_number = phone_number.trim();
  }
  
  // Avatar URL support - allow empty string to clear avatar
  if (avatar_url !== undefined && avatar_url !== null) {
    updateData.avatar_url = avatar_url.trim() || null;
  }
  // REMOVED otp_enabled update - column doesn't exist in Supabase

  // STEP 4: Update profile
  // Try to include avatar_url in SELECT, but handle gracefully if column doesn't exist
  let updatedProfile: any;
  let updateError: any;
  
  // First try with avatar_url in SELECT
  const updateResult = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select('id, email, role, full_name, phone_number, avatar_url, is_active, created_at, updated_at')
    .single();
  
  updatedProfile = updateResult.data;
  updateError = updateResult.error;
  
  // If error is about avatar_url column not existing, retry without it in SELECT
  if (updateError && (updateError.message?.includes('avatar_url') || updateError.code === '42703')) {
    const retryResult = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, role, full_name, phone_number, is_active, created_at, updated_at')
      .single();
    
    updatedProfile = retryResult.data;
    updateError = retryResult.error;
  }

  if (updateError) {
    console.error('❌ Profile update error:', JSON.stringify(updateError, null, 2));
    
    // If error is about avatar_url column not existing, try update without it
    if (updateError.message?.includes('avatar_url') || updateError.code === '42703') {
      // Remove avatar_url from updateData and retry
      const updateDataWithoutAvatar = { ...updateData };
      delete updateDataWithoutAvatar.avatar_url;
      
      const { data: retryProfile, error: retryError } = await supabaseAdmin
        .from('profiles')
        .update(updateDataWithoutAvatar)
        .eq('id', userId)
        .select('id, email, role, full_name, phone_number, is_active, created_at, updated_at')
        .single();
      
      if (retryError) {
        return sendError(res, 'UPDATE_ERROR', retryError.message, 400, reqAny.id);
      }
      
      // Add avatar_url as null since column doesn't exist
      if (retryProfile) {
        (retryProfile as any).avatar_url = null;
      }
      
      const profileResponse = {
        ...retryProfile,
        otp_enabled: true,
        status: (retryProfile as any).is_active ? 'active' : 'inactive',
      };
      
      return sendResponse(res, profileResponse, 'Profile updated successfully (avatar_url column not available yet)');
    }
    
    return sendError(res, 'UPDATE_ERROR', updateError.message, 400, reqAny.id);
  }

  if (!updatedProfile) {
    return sendError(res, 'UPDATE_ERROR', 'Failed to update profile', 400, reqAny.id);
  }

  // Cast to any to allow adding avatar_url property
  const updatedProfileAny = updatedProfile as any;
  
  // Try to fetch avatar_url separately if it was in updateData
  if (updateData.avatar_url !== undefined) {
    try {
      const { data: profileWithAvatar } = await supabaseAdmin
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();
      
      if (profileWithAvatar && 'avatar_url' in profileWithAvatar) {
        updatedProfileAny.avatar_url = (profileWithAvatar as any).avatar_url;
      } else {
        updatedProfileAny.avatar_url = updateData.avatar_url || null;
      }
    } catch {
      // Column doesn't exist, use the value from updateData
      updatedProfileAny.avatar_url = updateData.avatar_url || null;
    }
  } else {
    // avatar_url wasn't being updated, try to fetch it or set to null
    try {
      const { data: profileWithAvatar } = await supabaseAdmin
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();
      
      if (profileWithAvatar && 'avatar_url' in profileWithAvatar) {
        updatedProfileAny.avatar_url = (profileWithAvatar as any).avatar_url;
      } else {
        updatedProfileAny.avatar_url = null;
      }
    } catch {
      updatedProfileAny.avatar_url = null;
    }
  }

  // Add default values for fields that don't exist in schema
  const profileResponse = {
    ...updatedProfileAny,
    otp_enabled: true, // Default to true if column doesn't exist
    status: updatedProfileAny.is_active ? 'active' : 'inactive', // Map is_active to status for frontend compatibility
  };

  sendResponse(res, profileResponse, 'Profile updated successfully');
}));

export default router;