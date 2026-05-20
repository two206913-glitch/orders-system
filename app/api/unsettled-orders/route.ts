import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const customerName = searchParams.get('customer')
  
  if (!customerName) {
    return NextResponse.json({ orders: [], message: '未提供客戶名稱' })
  }
  
  const supabase = await createClient()
  
  // 取得該客戶的未結清訂單（包含 sale 和 sale_return）
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, date, type, total_price, shipping_fee, note, customer_name')
    .ilike('customer_name', `%${customerName}%`)
    .in('type', ['sale', 'sale_return'])
    .or('is_settled.is.null,is_settled.eq.false')
    .order('date', { ascending: false })
  
  if (error) {
    console.error('Error fetching unsettled orders:', error)
    return NextResponse.json({ orders: [], message: `查詢錯誤: ${error.message}` }, { status: 500 })
  }
  
  // 如果沒有找到任何訂單，檢查是否有已結清的訂單
  if (!orders || orders.length === 0) {
    const { data: settledOrders } = await supabase
      .from('orders')
      .select('id')
      .ilike('customer_name', `%${customerName}%`)
      .in('type', ['sale', 'sale_return'])
      .eq('is_settled', true)
      .limit(1)
    
    if (settledOrders && settledOrders.length > 0) {
      return NextResponse.json({ orders: [], message: '此客戶訂單皆已結清' })
    } else {
      return NextResponse.json({ orders: [], message: '找不到此客戶的銷售訂單' })
    }
  }
  
  // 取得這些訂單的商品明細
  const orderIds = orders.map(o => o.id)
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('order_id, product_name, product_variant, quantity')
    .in('order_id', orderIds)
  
  // 組合訂單與商品明細，sale_return 的金額轉為負數
  const ordersWithItems = orders.map(order => ({
    ...order,
    // sale_return 金額顯示為負數
    display_amount: order.type === 'sale_return' ? -(order.total_price || 0) : (order.total_price || 0),
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
