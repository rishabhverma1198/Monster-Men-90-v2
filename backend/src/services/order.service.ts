/**
 * Order Service
 * Business logic for order operations
 */

import { supabaseAdmin } from '../config/supabase.js';
import { sendWhatsAppNotification } from './whatsapp.service.js';

interface CreateOrderParams {
  userId: string;
  userType: 'single' | 'wholeseller';
  userDetails?: {
    name: string;
    email: string;
    contact_number: string;
  };
}

interface OrderItem {
  product_id: string;
  quantity: number;
  price_at_purchase: number;
}

/**
 * Create order with validation and WhatsApp notification
 */
export async function createOrder(params: CreateOrderParams, cartItems: any[], orderItems: OrderItem[]) {
  const { userId, userType, userDetails } = params;

  // Calculate total amount
  const totalAmount = Math.round(
    orderItems.reduce((sum, item) => sum + item.price_at_purchase * item.quantity, 0)
  );

  // Generate order number
  const orderNumber = `MM90-${Date.now()}-${userId.slice(0, 6)}`;

  // Prepare order data
  // Store all data in notes first (always works), then try to add to columns if they exist
  const notesData: any = {
    order_number: orderNumber,
    user_type: userType,
  };

  if (userDetails) {
    notesData.user_details = userDetails;
  }

  const orderData: any = {
    user_id: userId,
    total_amount: totalAmount,
    status: 'pending',
    user_role: userType === 'wholeseller' ? 'wholesaler' : 'buyer',
    notes: JSON.stringify(notesData), // Always store in notes as fallback
  };

  // Try to add columns if they exist (will fail gracefully if columns don't exist)
  // These columns may not exist if migration hasn't been run
  orderData.order_number = orderNumber;
  orderData.user_type = userType;

  if (userDetails) {
    orderData.user_name = userDetails.name;
    orderData.user_email = userDetails.email;
    orderData.user_phone = userDetails.contact_number;
  }

  // Create order - handle missing columns gracefully
  let order: any;
  let orderError: any;

  // First try with all columns
  const insertResult = await supabaseAdmin
    .from('orders')
    .insert(orderData)
    .select()
    .single();

  order = insertResult.data;
  orderError = insertResult.error;

  // If error is about missing columns, retry with only required columns
  if (orderError && (orderError.message?.includes('column') || orderError.code === '42703')) {
    console.warn('⚠️ Some columns missing, retrying with basic columns only:', orderError.message);
    
    // Retry with only required columns + notes
    const basicOrderData: any = {
      user_id: userId,
      total_amount: totalAmount,
      status: 'pending',
      user_role: userType === 'wholeseller' ? 'wholesaler' : 'buyer',
      notes: JSON.stringify(notesData), // All data stored in notes
    };

    const retryResult = await supabaseAdmin
      .from('orders')
      .insert(basicOrderData)
      .select()
      .single();

    order = retryResult.data;
    orderError = retryResult.error;
  }

  if (orderError) {
    console.error('❌ Order insert error:', JSON.stringify(orderError, null, 2));
    throw new Error(`Failed to create order: ${orderError.message}`);
  }

  if (!order) {
    throw new Error('Order creation returned no data');
  }

  // Create order items
  // Note: Schema only has unit_price, not price_snapshot
  const { error: orderItemsError } = await supabaseAdmin.from('order_items').insert(
    orderItems.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.price_at_purchase,
    }))
  );

  if (orderItemsError) {
    console.error('❌ Order items insert error:', JSON.stringify(orderItemsError, null, 2));
    throw new Error(`Failed to create order items: ${orderItemsError.message}`);
  }

  // Clear cart
  const { error: cartClearError } = await supabaseAdmin
    .from('cart_items')
    .delete()
    .eq('user_id', userId);

  if (cartClearError) {
    console.error('⚠️ Cart clear error (non-fatal):', JSON.stringify(cartClearError, null, 2));
    // Don't fail the order if cart clear fails - order is already created
  }

  // Send WhatsApp notification
  if (userDetails) {
    try {
      // Get admin phone from profile (priority: phone_number > env)
      // REMOVED whatsapp_number and contact_number - columns don't exist in Supabase
      const { data: adminProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, phone_number')
        .eq('role', 'admin')
        .eq('is_active', true)
        .limit(1)
        .single();

      const adminName = adminProfile?.full_name || process.env.ADMIN_NAME || 'Admin';
      // Priority: phone_number > env variable
      const adminPhone = adminProfile?.phone_number || process.env.ADMIN_PHONE || '';

      if (adminPhone) {
        await sendWhatsAppNotification({
          adminName,
          adminPhone,
          orderNumber,
          customerName: userDetails.name,
          contactNumber: userDetails.contact_number,
        });
      }
    } catch (whatsappError) {
      console.error('Failed to send WhatsApp notification:', whatsappError);
      // Don't fail the order if WhatsApp fails
    }
  }

  // Fetch final order with relations - handle missing columns gracefully
  let finalOrder: any;
  let fetchError: any;

  // Try to fetch with all columns first
  const fetchResult = await supabaseAdmin
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
      notes,
      user_role,
      order_items:order_items!order_items_order_id_fkey (
        id,
        quantity,
        unit_price,
        products:products!order_items_product_id_fkey (
          id,
          name
        )
      )
    `)
    .eq('id', order.id)
    .single();

  finalOrder = fetchResult.data;
  fetchError = fetchResult.error;

  // If error is about missing columns, try with basic columns only
  if (fetchError && (fetchError.message?.includes('column') || fetchError.code === '42703')) {
    console.warn('⚠️ Some columns missing in SELECT, retrying with basic columns');
    
    const basicFetchResult = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        status,
        total_amount,
        created_at,
        notes,
        user_role,
        order_items:order_items!order_items_order_id_fkey (
          id,
          quantity,
          unit_price,
          products:products!order_items_product_id_fkey (
            id,
            name
          )
        )
      `)
      .eq('id', order.id)
      .single();

    finalOrder = basicFetchResult.data;
    fetchError = basicFetchResult.error;

    // Extract data from notes if columns don't exist
    if (finalOrder && finalOrder.notes) {
      try {
        const notesData = JSON.parse(finalOrder.notes);
        finalOrder.order_number = notesData.order_number || order.id;
        finalOrder.user_type = notesData.user_type || (finalOrder.user_role === 'wholesaler' ? 'wholeseller' : 'single');
        if (notesData.user_details) {
          finalOrder.user_name = notesData.user_details.name;
          finalOrder.user_email = notesData.user_details.email;
          finalOrder.user_phone = notesData.user_details.contact_number;
        }
      } catch {
        // Invalid JSON in notes, use defaults
        finalOrder.order_number = order.id;
        finalOrder.user_type = finalOrder.user_role === 'wholesaler' ? 'wholeseller' : 'single';
      }
    }
  }

  if (fetchError) {
    console.error('⚠️ Order fetch error (non-fatal):', JSON.stringify(fetchError, null, 2));
    // Return the order we created even if fetch fails, with data from notes
    if (order.notes) {
      try {
        const notesData = JSON.parse(order.notes);
        order.order_number = notesData.order_number || order.id;
        order.user_type = notesData.user_type;
        if (notesData.user_details) {
          order.user_name = notesData.user_details.name;
          order.user_email = notesData.user_details.email;
          order.user_phone = notesData.user_details.contact_number;
        }
      } catch {
        order.order_number = order.id;
        order.user_type = order.user_role === 'wholesaler' ? 'wholeseller' : 'single';
      }
    }
    return order;
  }

  if (!finalOrder) {
    // Return the order we created if fetch returns null
    return order;
  }

  return finalOrder;
}

/**
 * Validate order quantities based on user type
 */
export function validateOrderQuantities(
  cartItems: any[],
  userType: 'single' | 'wholeseller'
): { valid: boolean; error?: string; productTitle?: string; quantity?: number } {
  for (const item of cartItems) {
    if (userType === 'wholeseller' && item.quantity < 20) {
      return {
        valid: false,
        error: `Minimum quantity for wholeseller is 20`,
        productTitle: item.products?.name || item.products?.title || 'Unknown Product',
        quantity: item.quantity,
      };
    }
    if (userType === 'single' && item.quantity < 1) {
      return {
        valid: false,
        error: `Invalid quantity`,
        productTitle: item.products?.name || item.products?.title || 'Unknown Product',
        quantity: item.quantity,
      };
    }
  }
  return { valid: true };
}

/**
 * Calculate order items with pricing based on user type
 */
export async function calculateOrderItems(
  cartItems: any[],
  userType: 'single' | 'wholeseller'
): Promise<{ orderItems: OrderItem[]; totalAmount: number }> {
  const orderItems: OrderItem[] = [];
  let totalAmount = 0;

  for (const item of cartItems) {
    const product: any = item.products;

    // Check inventory
    const { data: invRows } = await supabaseAdmin
      .from('inventory')
      .select('stock, reserved')
      .eq('product_id', product.id)
      .is('variant_id', null)
      .limit(1);

    const inventory = invRows?.[0];
    const productName = product.name || product.title || 'Unknown Product';
    
    if (!inventory) {
      throw new Error(`Inventory missing for ${productName}`);
    }

    const available = (inventory.stock || 0) - (inventory.reserved || 0);
    if (available < item.quantity) {
      throw new Error(
        `Insufficient stock for ${productName}. Available: ${available}, Requested: ${item.quantity}`
      );
    }

    // Use appropriate price based on user type
    // Handle both column name variations: price_wholesale/price_buyer OR wholesaler_price/buyer_price
    const price = userType === 'wholeseller' && (product.price_wholesale || product.wholesaler_price)
      ? (product.price_wholesale || product.wholesaler_price)
      : (product.price_buyer || product.buyer_price);
    
    if (!price || price <= 0) {
      throw new Error(`Invalid price for ${productName}`);
    }

    totalAmount += price * item.quantity;

    orderItems.push({
      product_id: product.id,
      quantity: item.quantity,
      price_at_purchase: price,
    });
  }

  return { orderItems, totalAmount };
}
