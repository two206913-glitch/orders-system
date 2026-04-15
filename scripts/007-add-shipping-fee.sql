-- Add shipping_fee column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee integer DEFAULT 0;
