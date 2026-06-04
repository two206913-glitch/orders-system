import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const idsParam = searchParams.get('ids')
  
  if (!idsParam) {
    return NextResponse.json({ orders: [] })
  }
  
  const orderIds = idsParam.split(',').filter(id => id.trim())
  
  if (orderIds.length === 0) {
    return NextResponse.json({ orders: [] })
  }
  
  const supabase = await createClient()
  
  // 取得訂單資料
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, date, type, total_price, shipping_fee, note, supplier')
    .in('id', orderIds)
    .order('date', { ascending: false })
  
  if (error) {
    console.error('Error fetching settled purchase orders:', error)
    return NextResponse.json({ orders: [] })
  }
  
  // 取得商品明細（包含 subtotal 用於計算正確金額）
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('order_id, product_name, product_variant, quantity, subtotal')
    .in('order_id', orderIds)
  
  // 組合訂單與商品明細
  // 重要：display_amount = SUM(order_items.subtotal) + shipping_fee
  const ordersWithItems = (orders || []).map(order => {
    const itemsForOrder = (orderItems || []).filter(item => item.order_id === order.id)
    
    // 計算正確金額：優先使用 order_items.subtotal 加總 + shipping_fee
    let orderAmount: number
    if (itemsForOrder.length > 0) {
      orderAmount = itemsForOrder.reduce((s, item) => s + (item.subtotal || 0), 0) + (order.shipping_fee || 0)
    } else {
      // 無 order_items：使用 total_price（舊資料）
      orderAmount = order.total_price || 0
    }
    
    return {
      ...order,
      display_amount: order.type === 'purchase_return' ? -orderAmount : orderAmount,
      items: itemsForOrder.map(item => ({
        product_name: item.product_name,
        product_variant: item.product_variant,
        quantity: item.quantity,
      })),
    }
  })
  
  return NextResponse.json({ orders: ordersWithItems })
}
