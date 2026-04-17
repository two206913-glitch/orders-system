-- 建立 order_items 資料表（訂單商品明細）
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  spec TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 啟用 RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 建立 RLS 政策（允許所有操作）
CREATE POLICY "Allow all operations on order_items" ON order_items
  FOR ALL
  USING (true)
  WITH CHECK (true);
