-- Add type column for transaction type
ALTER TABLE orders ADD COLUMN IF NOT EXISTS type text DEFAULT 'sale';

-- Add comment for column
COMMENT ON COLUMN orders.type IS 'Transaction type: sale, purchase, sale_return, purchase_return';
