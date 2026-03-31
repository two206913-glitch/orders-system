-- Enable public access to orders table (no authentication required)
-- This allows all CRUD operations without user authentication
-- Note: In production, you should add proper authentication and row-level security

CREATE POLICY "Allow public read access" ON orders
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON orders
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON orders
  FOR DELETE USING (true);
