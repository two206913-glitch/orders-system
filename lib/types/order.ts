export interface Order {
  id: string
  date: string | null
  batch: string | null
  customer_name: string | null
  product_name: string | null
  spec: string | null
  quantity: number | null
  unit_price: number | null
  total_price: number | null
  supplier: string | null
  source: string | null
  payment_status: string | null
  payment_method: string | null
  shipping_status: string | null
  note: string | null
  created_at: string
}

export type OrderInsert = Omit<Order, 'id' | 'created_at'>

export type OrderUpdate = Partial<OrderInsert> & { id: string }

export const PAYMENT_STATUSES = ['pending', 'paid', 'cancelled'] as const
export const SHIPPING_STATUSES = ['pending', 'shipped', 'delivered'] as const
export const PAYMENT_METHODS = ['cash', 'credit_card', 'bank_transfer', 'check'] as const
