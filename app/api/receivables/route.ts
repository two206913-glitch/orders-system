import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  // 取得所有銷貨訂單（包含 shipping_fee 用於計算）
  const { data: orders } = await supabase
    .from('orders')
    .select('id, customer_name, total_price, shipping_fee, type')
    .in('type', ['sale', 'sale_return'])
    .not('customer_name', 'is', null)

  // 取得所有 order_items（用於計算正確金額）
  const orderIds = orders?.map(o => o.id) || []
  const { data: orderItems } = orderIds.length > 0
    ? await supabase
        .from('order_items')
        .select('order_id, subtotal')
        .in('order_id', orderIds)
    : { data: [] }

  // 取得所有收款紀錄（從 receipts 表，欄位為 customer_name）
  const { data: receipts } = await supabase
    .from('receipts')
    .select('customer_name, amount')

  // 計算收款總額 by 客戶
  const receiptsMap = new Map<string, number>()
  receipts?.forEach((r) => {
    if (!r.customer_name) return
    const current = receiptsMap.get(r.customer_name) || 0
    receiptsMap.set(r.customer_name, current + (r.amount || 0))
  })

  // 計算應收金額 by 客戶
  // 重要：應收金額 = SUM(order_items.subtotal) + shipping_fee
  const receivablesMap = new Map<string, { total: number; count: number }>()
  orders?.forEach((order) => {
    if (!order.customer_name) return
    const name = order.customer_name
    const current = receivablesMap.get(name) || { total: 0, count: 0 }
    
    // 優先從 order_items 計算金額，若無則用 total_price
    const itemsForOrder = orderItems?.filter(item => item.order_id === order.id) || []
    let orderAmount: number
    
    if (itemsForOrder.length > 0) {
      // 有 order_items：商品小計 + 運費
      orderAmount = itemsForOrder.reduce((s, item) => s + (item.subtotal || 0), 0) + (order.shipping_fee || 0)
    } else {
      // 無 order_items：使用 total_price（舊資料已包含運費）
      orderAmount = order.total_price || 0
    }
    
    const effectiveAmount = order.type === 'sale_return' ? -orderAmount : orderAmount
    receivablesMap.set(name, {
      total: current.total + effectiveAmount,
      count: current.count + 1,
    })
  })

  // 組合結果
  const receivables = Array.from(receivablesMap.entries()).map(([name, data]) => {
    const receivedAmount = receiptsMap.get(name) || 0
    const pendingAmount = data.total - receivedAmount
    return {
      name,
      total_amount: data.total,
      received_amount: receivedAmount,
      pending_amount: pendingAmount,
      is_settled: pendingAmount <= 0,
      order_count: data.count,
    }
  })
    .filter(r => r.pending_amount > 0) // 只顯示有未收餘額的客戶
    .sort((a, b) => b.pending_amount - a.pending_amount)

  return NextResponse.json({ receivables })
}
