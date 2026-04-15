'use server'

import { createClient } from '@/lib/supabase/server'
import type { OrderInsert, OrderUpdate } from '@/lib/types/order'

export async function getOrders(filters?: {
  search?: string
  payment?: string
  shipping?: string
  type?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}) {
  const supabase = await createClient()
  
  const page = filters?.page || 1
  const pageSize = filters?.pageSize || 10
  const offset = (page - 1) * pageSize
  
  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })

  if (filters?.search) {
    query = query.or(
      `customer_name.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%,batch.ilike.%${filters.search}%,supplier.ilike.%${filters.search}%`
    )
  }

  if (filters?.payment) {
    query = query.eq('payment_status', filters.payment)
  }

  if (filters?.shipping) {
    query = query.eq('shipping_status', filters.shipping)
  }

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  // Sorting
  const sortBy = filters?.sortBy || 'created_at'
  const sortOrder = filters?.sortOrder || 'desc'
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  // Pagination
  query = query.range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching orders:', error)
    return { orders: [], total: 0 }
  }

  return { orders: data || [], total: count || 0 }
}

export async function getOrderStats() {
  const supabase = await createClient()
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]
  
  // Total orders
  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })

  // Today's orders
  const { count: todayOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('date', today)

  // Today's revenue
  const { data: todayRevenueData } = await supabase
    .from('orders')
    .select('total_price')
    .eq('date', today)
    .eq('payment_status', 'paid')

  const todayRevenue = todayRevenueData?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0

  // Pending shipments
  const { count: pendingShipments } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('shipping_status', 'pending')

  return {
    totalOrders: totalOrders || 0,
    todayOrders: todayOrders || 0,
    todayRevenue,
    pendingShipments: pendingShipments || 0,
  }
}

export async function getWeeklyTrend() {
  const supabase = await createClient()
  
  // Get last 7 days
  const days = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    days.push(date.toISOString().split('T')[0])
  }
  
  // Fetch orders for last 7 days
  const { data: orders } = await supabase
    .from('orders')
    .select('date, total_price, payment_status')
    .gte('date', days[0])
    .lte('date', days[6])
  
  // Aggregate by date
  const trend = days.map((date) => {
    const dayOrders = orders?.filter((o) => o.date === date) || []
    const revenue = dayOrders
      .filter((o) => o.payment_status === 'paid')
      .reduce((sum, o) => sum + (o.total_price || 0), 0)
    
    return {
      date,
      orders: dayOrders.length,
      revenue,
    }
  })
  
  return trend
}

export async function updateOrderStatus(
  id: string,
  field: 'payment_status' | 'shipping_status',
  value: string
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('orders')
    .update({ [field]: value })
    .eq('id', id)

  if (error) {
    console.error('Error updating order status:', error)
    throw new Error('Failed to update order status')
  }
}

// 根據訂單類型計算庫存變化量
// 進貨: +quantity, 銷貨: -quantity, 銷貨退回: +quantity, 進貨退回: -quantity
function getStockDelta(type: string | null, quantity: number): number {
  switch (type) {
    case 'purchase':
      return quantity // 進貨增加庫存
    case 'sale':
      return -quantity // 銷貨減少庫存
    case 'sale_return':
      return quantity // 銷貨退回增加庫存
    case 'purchase_return':
      return -quantity // 進貨退回減少庫存
    default:
      return 0
  }
}

// 更新商品庫存
async function updateProductStock(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  productName: string | null,
  spec: string | null,
  delta: number
) {
  if (!productName || delta === 0) return

  // 根據名稱和規格查找商品
  let query = supabase
    .from('products')
    .select('id, stock')
    .eq('name', productName)
    .eq('is_active', true)

  if (spec) {
    query = query.eq('variant', spec)
  } else {
    query = query.is('variant', null)
  }

  const { data: products } = await query.limit(1)

  if (products && products.length > 0) {
    const product = products[0]
    const newStock = Math.max(0, (product.stock || 0) + delta)
    
    await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', product.id)
  }
}

export async function createOrder(order: OrderInsert) {
  const supabase = await createClient()

  const { error } = await supabase.from('orders').insert([order])

  if (error) {
    console.error('Error creating order:', error)
    throw new Error('Failed to create order')
  }

  // 更新商品庫存
  const quantity = order.quantity ?? 0
  const stockDelta = getStockDelta(order.type, quantity)
  await updateProductStock(supabase, order.product_name, order.spec, stockDelta)
}

export async function updateOrder(id: string, updates: Partial<OrderInsert>) {
  const supabase = await createClient()

  // 先取得原訂單資料以計算庫存差異
  const { data: originalOrder } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('orders').update(updates).eq('id', id)

  if (error) {
    console.error('Error updating order:', error)
    throw new Error('Failed to update order')
  }

  // 如果商品名稱、規格、數量或類型有變化，需要更新庫存
  if (originalOrder) {
    const oldType = originalOrder.type
    const newType = updates.type ?? oldType
    const oldQty = originalOrder.quantity ?? 0
    const newQty = updates.quantity ?? oldQty
    const oldProduct = originalOrder.product_name
    const newProduct = updates.product_name ?? oldProduct
    const oldSpec = originalOrder.spec
    const newSpec = updates.spec ?? oldSpec

    // 還原原訂單的庫存影響
    const oldDelta = getStockDelta(oldType, oldQty)
    await updateProductStock(supabase, oldProduct, oldSpec, -oldDelta)

    // 套用新訂單的庫存影響
    const newDelta = getStockDelta(newType, newQty)
    await updateProductStock(supabase, newProduct, newSpec, newDelta)
  }
}

export async function deleteOrder(id: string) {
  const supabase = await createClient()

  // 先取得訂單資料以還原庫存
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('orders').delete().eq('id', id)

  if (error) {
    console.error('Error deleting order:', error)
    throw new Error('Failed to delete order')
  }

  // 還原庫存
  if (order) {
    const quantity = order.quantity ?? 0
    const stockDelta = getStockDelta(order.type, quantity)
    // 刪除訂單時要反向更新庫存
    await updateProductStock(supabase, order.product_name, order.spec, -stockDelta)
  }
}
