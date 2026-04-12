export interface Product {
  id: string
  name: string
  variant: string | null
  cost: number
  price: number
  supplier: string | null
  stock: number
  min_stock: number
  sku: string | null
  category: string | null
  unit: string | null
  note: string | null
  is_active: boolean
  created_at: string
}

export type ProductInsert = Omit<Product, 'id' | 'created_at'>

export type ProductUpdate = Partial<ProductInsert> & { id: string }

export const PRODUCT_UNITS = ['個', '件', '箱', '包', '組', '台', '支', '瓶', '袋', '盒'] as const
