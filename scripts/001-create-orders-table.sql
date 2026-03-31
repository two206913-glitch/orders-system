-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create orders table
create table orders (
  id uuid primary key default uuid_generate_v4(),
  date date,
  batch text,
  customer_name text,
  product_name text,
  spec text,
  quantity int,
  unit_price int,
  total_price int,
  supplier text,
  source text,
  payment_status text,
  payment_method text,
  shipping_status text,
  note text,
  created_at timestamp default now()
);

-- Enable Row Level Security
alter table orders enable row level security;

-- Create a policy that allows all operations for authenticated users
create policy "Allow all operations for authenticated users" on orders
  for all
  using (true)
  with check (true);
