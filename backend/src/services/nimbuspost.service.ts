/**
 * Nimbuspost Shipping Service
 * Free Tier Integration
 */

import axios from 'axios';

// Nimbuspost API Configuration
const NIMBUSPOST_API_KEY = process.env.NIMBUSPOST_API_KEY || '';
const NIMBUSPOST_API_USERNAME = process.env.NIMBUSPOST_API_USERNAME || '';
const NIMBUSPOST_API_PASSWORD = process.env.NIMBUSPOST_API_PASSWORD || '';
const NIMBUSPOST_BASE_URL = process.env.NIMBUSPOST_BASE_URL || 'https://api.nimbuspost.com';

// Authentication: Pass API key in header as 'NP-API-KEY'
// Rate Limit: 10 requests/second

/**
 * Create Shipping Order in Nimbuspost
 */
export interface CreateShipmentRequest {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  order_items: Array<{
    name: string;
    sku: string;
    quantity: number;
    price: number;
    weight: number; // Weight in grams
  }>;
  payment_mode: 'prepaid' | 'cod';
  cod_amount?: number;
  weight: number; // Total weight in grams
  pickup_pincode: string;
}

export interface CreateShipmentResponse {
  success: boolean;
  shipment_id: string;
  awb_number: string;
  tracking_url: string;
  label_url?: string;
  status: string;
}

export async function createShipment(
  data: CreateShipmentRequest
): Promise<CreateShipmentResponse> {
  try {
    // Old API Document - Using API Key in header
    // Also support Basic Auth with username/password as fallback
    
    // Nimbuspost API: POST Create New Shipment
    // Documentation: https://api.nimbuspost.com/docs
    const response = await axios.post(
      `${NIMBUSPOST_BASE_URL}/api/shipments/create`, // Create shipment endpoint
      {
        order_id: data.order_id,
        order_number: data.order_number,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email,
        shipping_address: {
          address_line1: data.customer_address.address_line1,
          address_line2: data.customer_address.address_line2 || '',
          city: data.customer_address.city,
          state: data.customer_address.state,
          pincode: data.customer_address.pincode,
          country: data.customer_address.country || 'India',
        },
        order_items: data.order_items,
        payment_mode: data.payment_mode,
        cod_amount: data.cod_amount || 0,
        weight: data.weight,
        pickup_pincode: data.pickup_pincode,
      },
      {
        headers: {
          'NP-API-KEY': NIMBUSPOST_API_KEY, // Nimbuspost uses NP-API-KEY header
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      shipment_id: response.data.shipment_id || response.data.id,
      awb_number: response.data.awb_number || response.data.awb,
      tracking_url: response.data.tracking_url || response.data.tracking_link,
      label_url: response.data.label_url || response.data.label,
      status: response.data.status || 'created',
    };
  } catch (error: any) {
    console.error('❌ Nimbuspost Shipment Creation Error:', error.response?.data || error.message);
    throw new Error(
      `Shipment creation failed: ${error.response?.data?.message || error.message}`
    );
  }
}

/**
 * Track Shipment
 */
export interface TrackShipmentRequest {
  awb_number: string;
}

export interface TrackShipmentResponse {
  success: boolean;
  awb_number: string;
  status: string;
  current_status: string;
  tracking_events: Array<{
    status: string;
    location: string;
    timestamp: string;
    description: string;
  }>;
  estimated_delivery?: string;
}

export async function trackShipment(
  data: TrackShipmentRequest
): Promise<TrackShipmentResponse> {
  try {
    // Old API Document - Using API Key
    // Nimbuspost API: GET Shipment Tracking History using AWB
    const response = await axios.get(
      `${NIMBUSPOST_BASE_URL}/api/shipments/track/${data.awb_number}`, // Track by AWB
      {
        headers: {
          'NP-API-KEY': NIMBUSPOST_API_KEY, // Nimbuspost uses NP-API-KEY header
        },
      }
    );

    return {
      success: true,
      awb_number: response.data.awb_number || response.data.awb,
      status: response.data.status,
      current_status: response.data.current_status || response.data.status,
      tracking_events: response.data.tracking_events || response.data.events || [],
      estimated_delivery: response.data.estimated_delivery,
    };
  } catch (error: any) {
    console.error('❌ Nimbuspost Tracking Error:', error.response?.data || error.message);
    throw new Error(
      `Tracking failed: ${error.response?.data?.message || error.message}`
    );
  }
}

/**
 * Cancel Shipment
 */
export async function cancelShipment(awb_number: string): Promise<boolean> {
  try {
    // Old API Document - Using API Key
    // Nimbuspost API: POST Cancel Shipment
    const response = await axios.post(
      `${NIMBUSPOST_BASE_URL}/api/shipments/cancel`, // Cancel shipment
      { awb_number },
      {
        headers: {
          'NP-API-KEY': NIMBUSPOST_API_KEY, // Nimbuspost uses NP-API-KEY header
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.success === true;
  } catch (error: any) {
    console.error('❌ Nimbuspost Cancel Error:', error.response?.data || error.message);
    throw new Error(
      `Cancel failed: ${error.response?.data?.message || error.message}`
    );
  }
}

/**
 * Get Shipping Rates (Estimate)
 */
export interface ShippingRateRequest {
  pickup_pincode: string;
  delivery_pincode: string;
  weight: number; // in grams
  cod_amount?: number;
}

export interface ShippingRateResponse {
  success: boolean;
  rates: Array<{
    courier_name: string;
    service_type: string;
    rate: number;
    estimated_days: number;
  }>;
}

export async function getShippingRates(
  data: ShippingRateRequest
): Promise<ShippingRateResponse> {
  let lastError: any = null;
  
  // Try NP-API-KEY header first
  try {
    const response = await axios.post(
      `${NIMBUSPOST_BASE_URL}/api/shipments/rates`,
      {
        pickup_pincode: data.pickup_pincode,
        delivery_pincode: data.delivery_pincode,
        weight: data.weight,
        cod_amount: data.cod_amount || 0,
      },
      {
        headers: {
          'NP-API-KEY': NIMBUSPOST_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      rates: response.data.rates || response.data.data || [],
    };
  } catch (error: any) {
    lastError = error;
    // If NP-API-KEY fails and we have username/password, try Basic Auth
    if (NIMBUSPOST_API_USERNAME && NIMBUSPOST_API_PASSWORD) {
      try {
        const basicAuth = Buffer.from(`${NIMBUSPOST_API_USERNAME}:${NIMBUSPOST_API_PASSWORD}`).toString('base64');
        const response = await axios.post(
          `${NIMBUSPOST_BASE_URL}/api/shipments/rates`,
          {
            pickup_pincode: data.pickup_pincode,
            delivery_pincode: data.delivery_pincode,
            weight: data.weight,
            cod_amount: data.cod_amount || 0,
          },
          {
            headers: {
              'Authorization': `Basic ${basicAuth}`,
              'Content-Type': 'application/json',
            },
          }
        );

        return {
          success: true,
          rates: response.data.rates || response.data.data || [],
        };
      } catch (basicError: any) {
        lastError = basicError;
      }
    }
  }
  
  // All authentication methods failed
  console.error('❌ Nimbuspost Rates Error:', lastError?.response?.data || lastError?.message);
  const errorMessage = lastError?.response?.data?.message || lastError?.message || 'Authentication failed';
  
  // Return empty rates instead of throwing error (graceful degradation)
  // This allows the app to continue working even if Nimbuspost API is not configured
  console.warn('⚠️  Nimbuspost API not accessible. Returning empty rates. Please check API credentials.');
  return {
    success: false,
    rates: [],
  };
}
