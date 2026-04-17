// 訂單商品項目（多商品支援）
export interface OrderItem {
  id?: string
  order_id?: string
  product_id: string | null
  product_name: string
  product_variant: string | null
  quantity: number
  unit_price: number
  cost: number
  subtotal: number
}

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
  cost: number | null
  profit: number | null
  supplier: string | null
  source: string | null
  payment_status: string | null
  payment_method: string | null
  shipping_status: string | null
  shipping_fee: number | null
  note: string | null
  type: string | null
  created_at: string
  // 多商品支援
  items?: OrderItem[]
}

export type OrderInsert = Omit<Order, 'id' | 'created_at'>

export type OrderUpdate = Partial<OrderInsert> & { id: string }

export const PAYMENT_STATUSES = ['pending', 'paid', 'cancelled'] as const
export const SHIPPING_STATUSES = ['pending', 'shipped', 'delivered'] as const
export const PAYMENT_METHODS = ['cash', 'credit_card', 'bank_transfer', 'check'] as const
export const ORDER_TYPES = ['sale', 'purchase', 'sale_return', 'purchase_return'] as const
