import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  // 取得所有銷貨訂單
  const { data: orders } = await supabase
    .from('orders')
    .select('customer_name, total_price, type')
    .in('type', ['sale', 'sale_return'])
    .not('customer_name', 'is', null)

  // 取得所有收款紀錄
  const { data: payments } = await supabase
    .from('payments')
    .select('party_name, amount')
    .eq('type', 'receipt')

  // 計算收款總額 by 客戶
  const receiptsMap = new Map<string, number>()
  payments?.forEach((p) => {
    const current = receiptsMap.get(p.party_name) || 0
    receiptsMap.set(p.party_name, current + (p.amount || 0))
  })

  // 計算應收金額 by 客戶
  const receivablesMap = new Map<string, { total: number; count: number }>()
  orders?.forEach((order) => {
    if (!order.customer_name) return
    const name = order.customer_name
    const current = receivablesMap.get(name) || { total: 0, count: 0 }
    const amount = order.total_price || 0
    const effectiveAmount = order.type === 'sale_return' ? -amount : amount
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
