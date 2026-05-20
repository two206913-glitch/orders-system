import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const customerName = searchParams.get('customer')
  
  console.log('[v0] unsettled-orders API - customerName:', customerName)
  
  if (!customerName) {
    return NextResponse.json({ orders: [] })
  }
  
  const supabase = await createClient()
  
  // 先查詢該客戶的所有銷售訂單（不限制 is_settled），用於 debug
  const { data: allSaleOrders, error: debugError } = await supabase
    .from('orders')
    .select('id, date, type, is_settled, total_price, customer_name')
    .eq('customer_name', customerName)
    .eq('type', 'sale')
    .limit(10)
  
  console.log('[v0] unsettled-orders API - allSaleOrders:', JSON.stringify(allSaleOrders, null, 2))
  console.log('[v0] unsettled-orders API - debugError:', debugError)
  
  // 取得該客戶的未結清銷售訂單
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, date, total_price, shipping_fee, note')
    .eq('customer_name', customerName)
    .eq('type', 'sale')
    .or('is_settled.is.null,is_settled.eq.false')
    .order('date', { ascending: false })
  
  console.log('[v0] unsettled-orders API - filtered orders:', JSON.stringify(orders, null, 2))
  console.log('[v0] unsettled-orders API - error:', error)
  
  if (error) {
    console.error('Error fetching unsettled orders:', error)
    return NextResponse.json({ orders: [], error: error.message }, { status: 500 })
  }
  
  // 取得這些訂單的商品明細
  const orderIds = orders?.map(o => o.id) || []
  const { data: orderItems } = orderIds.length > 0
    ? await supabase
        .from('order_items')
        .select('order_id, product_name, product_variant, quantity')
        .in('order_id', orderIds)
    : { data: [] }
  
  // 組合訂單與商品明細
  const ordersWithItems = (orders || []).map(order => ({
    ...order,
    items: (orderItems || [])
      .filter(item => item.order_id === order.id)
      .map(item => ({
        product_name: item.product_name,
        product_variant: item.product_variant,
        quantity: item.quantity,
      })),
  }))
  
  return NextResponse.json({ orders: ordersWithItems })
}
