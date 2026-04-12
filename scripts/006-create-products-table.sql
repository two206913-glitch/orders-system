-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  variant text,
  cost integer DEFAULT 0,
  price integer DEFAULT 0,
  supplier text,
  stock integer DEFAULT 0,
  min_stock integer DEFAULT 0,
  sku text,
  category text,
  unit text,
  note text,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update products" ON products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete products" ON products FOR DELETE USING (true);

-- Add product_id column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_variant text;
