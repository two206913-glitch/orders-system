-- Add payment_method column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method text;
