'use server'

import { createClient } from '@/lib/supabase/server'
import type { OrderInsert, OrderUpdate, OrderItem } from '@/lib/types/order'

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

  if (filters?.search && filters.search.trim() !== "") {
    const keyword = filters.search.trim()

    // 先搜尋 order_items 表中的商品名稱和規格
    const { data: matchedItems } = await supabase
      .from("order_items")
      .select("order_id")
      .or(`product_name.ilike.%${keyword}%,product_variant.ilike.%${keyword}%`)

    const orderIds = [
      ...new Set(
        (matchedItems || [])
          .map((item) => item.order_id)
          .filter(Boolean)
      ),
    ]

    // 建立搜尋條件：客戶名稱、批次、供應商
    const conditions = [
      `customer_name.ilike.%${keyword}%`,
      `batch.ilike.%${keyword}%`,
      `supplier.ilike.%${keyword}%`,
    ]

    // 如果在 order_items 中有找到匹配的訂單，也加入搜尋條件
    if (orderIds.length > 0) {
      conditions.push(`id.in.(${orderIds.join(",")})`)
    }

    query = query.or(conditions.join(","))
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

// 建立訂單（所有商品資料必須透過 order_items 傳入）
export async function createOrder(order: OrderInsert, items?: OrderItem[]) {
  const supabase = await createClient()

  // Debug: 印出送出的 payload
  console.log('[v0] createOrder - order payload:', JSON.stringify(order, null, 2))
  console.log('[v0] createOrder - items payload:', JSON.stringify(items, null, 2))

  try {
    // 建立訂單主表（不再寫入 product_name, quantity, unit_price, spec）
    const { data: newOrder, error } = await supabase
      .from('orders')
      .insert([order])
      .select('id')
      .single()

    if (error) {
      console.error('[v0] createOrder - orders insert error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      throw new Error(`Failed to create order: ${error.message}`)
    }

    console.log('[v0] createOrder - order created:', newOrder.id)

    // 寫入 order_items 表（所有商品資料都存這裡）
    if (items && items.length > 0) {
      const orderItems = items.map(item => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_variant: item.product_variant,
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
        cost: Number(item.cost) || 0,
        subtotal: Math.round(Number(item.subtotal)) || 0,
      }))

      console.log('[v0] createOrder - orderItems to insert:', JSON.stringify(orderItems, null, 2))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('[v0] createOrder - order_items insert error:', {
          message: itemsError.message,
          details: itemsError.details,
          hint: itemsError.hint,
          code: itemsError.code,
        })
        throw new Error(`Failed to create order items: ${itemsError.message}`)
      }

      console.log('[v0] createOrder - order_items inserted successfully')

      // 更新每個商品的庫存
      for (const item of items) {
        const stockDelta = getStockDelta(order.type, item.quantity)
        await updateProductStock(supabase, item.product_name, item.product_variant, stockDelta)
      }
    }

    return newOrder
  } catch (err) {
    console.error('[v0] createOrder - unexpected error:', err)
    throw err
  }
}

// 取得訂單的商品項目
export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching order items:', error)
    return []
  }

  return data || []
}

// 更新訂單（所有商品資料必須透過 order_items 傳入）
export async function updateOrder(id: string, updates: Partial<OrderInsert>, items?: OrderItem[]) {
  const supabase = await createClient()

  // Debug: 印出送出的 payload
  console.log('[v0] updateOrder - id:', id)
  console.log('[v0] updateOrder - updates payload:', JSON.stringify(updates, null, 2))
  console.log('[v0] updateOrder - items payload:', JSON.stringify(items, null, 2))

  try {
    // 先取得原訂單資料以計算庫存差異
    const { data: originalOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    // 取得原訂單的商品項目（從 order_items 表）
    const { data: originalItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id)

    const { error } = await supabase.from('orders').update(updates).eq('id', id)

    if (error) {
      console.error('[v0] updateOrder - orders update error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      throw new Error(`Failed to update order: ${error.message}`)
    }

    console.log('[v0] updateOrder - order updated successfully')

    // 處理商品項目（一律從 order_items 處理）
    if (items && items.length > 0) {
      // 還原原有商品項目的庫存
      if (originalItems && originalItems.length > 0 && originalOrder) {
        for (const item of originalItems) {
          const oldDelta = getStockDelta(originalOrder.type, item.quantity)
          await updateProductStock(supabase, item.product_name, item.product_variant, -oldDelta)
        }
      }

      // 刪除原有商品項目
      const { error: deleteError } = await supabase.from('order_items').delete().eq('order_id', id)
      if (deleteError) {
        console.error('[v0] updateOrder - delete order_items error:', {
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint,
          code: deleteError.code,
        })
      }

      // 插入新的商品項目
      const orderItems = items.map(item => ({
        order_id: id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_variant: item.product_variant,
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
        cost: Number(item.cost) || 0,
        subtotal: Math.round(Number(item.subtotal)) || 0,
      }))

      console.log('[v0] updateOrder - orderItems to insert:', JSON.stringify(orderItems, null, 2))

      const { error: insertError } = await supabase.from('order_items').insert(orderItems)

      if (insertError) {
        console.error('[v0] updateOrder - insert order_items error:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        })
        throw new Error(`Failed to insert order items: ${insertError.message}`)
      }

      console.log('[v0] updateOrder - order_items inserted successfully')

      // 套用新商品項目的庫存
      const newType = updates.type ?? originalOrder?.type
      for (const item of items) {
        const newDelta = getStockDelta(newType, item.quantity)
        await updateProductStock(supabase, item.product_name, item.product_variant, newDelta)
      }
    }
  } catch (err) {
    console.error('[v0] updateOrder - unexpected error:', err)
    throw err
  }
}

export async function deleteOrder(id: string) {
  const supabase = await createClient()

  // 先取得訂單資料以還原庫存
  const { data: order } = await supabase
    .from('orders')
    .select('type')
    .eq('id', id)
    .single()

  // 取得訂單的商品項目（從 order_items 表）
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('product_name, product_variant, quantity')
    .eq('order_id', id)

  // 刪除訂單（order_items 會因為 ON DELETE CASCADE 自動刪除）
  const { error } = await supabase.from('orders').delete().eq('id', id)

  if (error) {
    console.error('Error deleting order:', error)
    throw new Error('Failed to delete order')
  }

  // 還原庫存（一律從 order_items 取得商品資訊）
  if (order && orderItems && orderItems.length > 0) {
    for (const item of orderItems) {
      const stockDelta = getStockDelta(order.type, item.quantity)
      await updateProductStock(supabase, item.product_name, item.product_variant, -stockDelta)
    }
  }
}
