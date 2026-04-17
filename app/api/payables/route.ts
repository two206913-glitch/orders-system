import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  // 取得所有進貨訂單
  const { data: orders } = await supabase
    .from('orders')
    .select('supplier, cost, type')
    .in('type', ['purchase', 'purchase_return'])
    .not('supplier', 'is', null)

  // 取得所有付款紀錄（從 payments 表，欄位為 supplier_name）
  const { data: paymentsData } = await supabase
    .from('payments')
    .select('supplier_name, amount')

  // 計算付款總額 by 供應商
  const paymentsMap = new Map<string, number>()
  paymentsData?.forEach((p) => {
    if (!p.supplier_name) return
    const current = paymentsMap.get(p.supplier_name) || 0
    paymentsMap.set(p.supplier_name, current + (p.amount || 0))
  })

  // 計算應付金額 by 供應商
  const payablesMap = new Map<string, { total: number; count: number }>()
  orders?.forEach((order) => {
    if (!order.supplier) return
    const name = order.supplier
    const current = payablesMap.get(name) || { total: 0, count: 0 }
    const amount = order.cost || 0
    const effectiveAmount = order.type === 'purchase_return' ? -amount : amount
    payablesMap.set(name, {
      total: current.total + effectiveAmount,
      count: current.count + 1,
    })
  })

  // 組合結果
  const payables = Array.from(payablesMap.entries()).map(([name, data]) => {
    const paidAmount = paymentsMap.get(name) || 0
    const pendingAmount = data.total - paidAmount
    return {
      name,
      total_amount: data.total,
      received_amount: paidAmount, // 這裡用 received_amount 保持一致性
      pending_amount: pendingAmount,
      is_settled: pendingAmount <= 0,
      order_count: data.count,
    }
  })
    .filter(p => p.pending_amount > 0) // 只顯示有未付餘額的供應商
    .sort((a, b) => b.pending_amount - a.pending_amount)

  return NextResponse.json({ payables })
}
