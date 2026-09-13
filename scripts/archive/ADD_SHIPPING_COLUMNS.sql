-- Add shipping columns to orders table for Nimbuspost integration
-- Run this in Supabase SQL Editor

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_awb TEXT,
ADD COLUMN IF NOT EXISTS shipping_courier TEXT,
ADD COLUMN IF NOT EXISTS shipping_tracking_url TEXT,
ADD COLUMN IF NOT EXISTS shipping_label_url TEXT,
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_pincode TEXT,
ADD COLUMN IF NOT EXISTS delivery_pincode TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.orders.shipping_awb IS 'AWB (Airway Bill) number from shipping provider';
COMMENT ON COLUMN public.orders.shipping_courier IS 'Courier service name (e.g., Nimbuspost)';
COMMENT ON COLUMN public.orders.shipping_tracking_url IS 'URL to track shipment';
COMMENT ON COLUMN public.orders.shipping_label_url IS 'URL to download shipping label';
COMMENT ON COLUMN public.orders.shipping_cost IS 'Shipping cost charged to customer';
COMMENT ON COLUMN public.orders.shipping_pincode IS 'Pickup location pincode';
COMMENT ON COLUMN public.orders.delivery_pincode IS 'Delivery location pincode';
