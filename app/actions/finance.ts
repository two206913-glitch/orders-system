'use server'

import { createClient } from '@/lib/supabase/server'

export interface ReceivablePayable {
  name: string
  type: 'customer' | 'supplier'
  total_amount: number    // 總金額
  paid_amount: number     // 已付/已收
  pending_amount: number  // 待付/待收
  order_count: number
}

export async function getReceivablesPayables(): Promise<{
  receivables: ReceivablePayable[]
  payables: ReceivablePayable[]
  totals: {
    totalReceivable: number
    totalPayable: number
    netPosition: number
  }
}> {
  const supabase = await createClient()
  
  const { data: orders } = await supabase
    .from('orders')
    .select('customer_name, supplier, total_price, cost, payment_status, type')
  
  if (!orders) {
    return {
      receivables: [],
      payables: [],
      totals: { totalReceivable: 0, totalPayable: 0, netPosition: 0 },
    }
  }
  
  // 應收帳款來自客戶（銷貨用 total_price，銷退沖銷）
  const receivablesMap = new Map<string, ReceivablePayable>()
  // 應付帳款來自供應商（進貨用 cost，進退沖銷）
  const payablesMap = new Map<string, ReceivablePayable>()
  
  orders.forEach((order) => {
    const type = order.type || 'sale'
    const isPaid = order.payment_status === 'paid'
    
    // 銷貨/銷退：影響應收帳款
    if ((type === 'sale' || type === 'sale_return') && order.customer_name) {
      const name = order.customer_name
      const item = receivablesMap.get(name) || {
        name,
        type: 'customer' as const,
        total_amount: 0,
        paid_amount: 0,
        pending_amount: 0,
        order_count: 0,
      }
      
      // 銷貨用 total_price（售價），銷退用負數沖銷
      const amount = order.total_price || 0
      const effectiveAmount = type === 'sale_return' ? -amount : amount
      
      item.total_amount += effectiveAmount
      item.order_count += 1
      if (isPaid) {
        item.paid_amount += effectiveAmount
      } else {
        item.pending_amount += effectiveAmount
      }
      
      receivablesMap.set(name, item)
    }
    
    // 進貨/進退：影響應付帳款
    if ((type === 'purchase' || type === 'purchase_return') && order.supplier) {
      const name = order.supplier
      const item = payablesMap.get(name) || {
        name,
        type: 'supplier' as const,
        total_amount: 0,
        paid_amount: 0,
        pending_amount: 0,
        order_count: 0,
      }
      
      // 進貨用 cost（成本），進退用負數沖銷
      const amount = order.cost || 0
      const effectiveAmount = type === 'purchase_return' ? -amount : amount
      
      item.total_amount += effectiveAmount
      item.order_count += 1
      if (isPaid) {
        item.paid_amount += effectiveAmount
      } else {
        item.pending_amount += effectiveAmount
      }
      
      payablesMap.set(name, item)
    }
  })
  
  // 過濾掉待收/待付為 0 的項目
  const receivables = Array.from(receivablesMap.values())
    .filter((r) => Math.abs(r.pending_amount) > 0.01)
    .sort((a, b) => b.pending_amount - a.pending_amount)
  
  const payables = Array.from(payablesMap.values())
    .filter((p) => Math.abs(p.pending_amount) > 0.01)
    .sort((a, b) => b.pending_amount - a.pending_amount)
  
  const totalReceivable = receivables.reduce((sum, r) => sum + r.pending_amount, 0)
  const totalPayable = payables.reduce((sum, p) => sum + p.pending_amount, 0)
  
  return {
    receivables,
    payables,
    totals: {
      totalReceivable,
      totalPayable,
      netPosition: totalReceivable - totalPayable,
    },
  }
}
