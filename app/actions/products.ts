'use server'

import { createClient } from '@/lib/supabase/server'
import type { ProductInsert, ProductUpdate } from '@/lib/types/product'

export async function getProducts(filters?: {
  search?: string
  category?: string
  supplier?: string
  showInactive?: boolean
}) {
  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true })

  if (!filters?.showInactive) {
    query = query.eq('is_active', true)
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,variant.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`
    )
  }

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.supplier) {
    query = query.eq('supplier', filters.supplier)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }

  return data || []
}

export async function getProductById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching product:', error)
    return null
  }

  return data
}

export async function createProduct(product: ProductInsert) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single()

  if (error) {
    console.error('Error creating product:', error)
    throw new Error('Failed to create product')
  }

  return data
}

export async function updateProduct(product: ProductUpdate) {
  const supabase = await createClient()

  const { id, ...updateData } = product
  const { error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Error updating product:', error)
    throw new Error('Failed to update product')
  }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()

  // Soft delete - set is_active to false
  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    console.error('Error deleting product:', error)
    throw new Error('Failed to delete product')
  }
}

// 切換商品啟用/停用狀態
export async function toggleProductStatus(id: string, isActive: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) {
    console.error('Error toggling product status:', error)
    throw new Error('Failed to toggle product status')
  }
}

export async function updateProductStock(id: string, stockChange: number) {
  const supabase = await createClient()

  // Get current stock
  const { data: product } = await supabase
    .from('products')
    .select('stock')
    .eq('id', id)
    .single()

  if (!product) {
    throw new Error('Product not found')
  }

  const newStock = product.stock + stockChange

  const { error } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', id)

  if (error) {
    console.error('Error updating product stock:', error)
    throw new Error('Failed to update product stock')
  }
}

export async function getProductCategories() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select('category')
    .eq('is_active', true)
    .not('category', 'is', null)

  const categories = [...new Set(data?.map((p) => p.category).filter(Boolean))]
  return categories as string[]
}

export async function getProductSuppliers() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select('supplier')
    .eq('is_active', true)
    .not('supplier', 'is', null)

  const suppliers = [...new Set(data?.map((p) => p.supplier).filter(Boolean))]
  return suppliers as string[]
}

// 取得商品列表供下拉選單使用
export async function getProductsForSelect() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select('id, name, variant, cost, price, supplier, unit, stock')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching products for select:', error)
    return []
  }

  return data || []
}
