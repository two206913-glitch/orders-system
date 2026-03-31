-- Create payments table for tracking payment records
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('receipt', 'payment')),  -- receipt=收款, payment=付款
  party_type TEXT NOT NULL CHECK (party_type IN ('customer', 'supplier')),
  party_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow public access (same as orders)
CREATE POLICY "Allow public read" ON payments FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON payments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON payments FOR DELETE USING (true);
