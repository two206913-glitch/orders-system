'use server'

import { createClient } from '@/lib/supabase/server'
import type { OrderInsert, OrderUpdate } from '@/lib/types/order'

export async function getOrders(filters?: {
  search?: string
  payment?: string
  shipping?: string
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

export async function createOrder(order: OrderInsert) {
  const supabase = await createClient()

  const { error } = await supabase.from('orders').insert([order])

  if (error) {
    console.error('Error creating order:', error)
    throw new Error('Failed to create order')
  }
}

export async function updateOrder(id: string, updates: Partial<OrderInsert>) {
  const supabase = await createClient()

  const { error } = await supabase.from('orders').update(updates).eq('id', id)

  if (error) {
    console.error('Error updating order:', error)
    throw new Error('Failed to update order')
  }
}

export async function deleteOrder(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('orders').delete().eq('id', id)

  if (error) {
    console.error('Error deleting order:', error)
    throw new Error('Failed to delete order')
  }
}
