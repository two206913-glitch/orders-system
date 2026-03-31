'use server'

import { createClient } from '@/lib/supabase/server'

export interface ReceivablePayable {
  name: string
  type: 'customer' | 'supplier'
  total_amount: number
  paid_amount: number
  pending_amount: number
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
    .select('customer_name, supplier, total_price, payment_status, type')
  
  if (!orders) {
    return {
      receivables: [],
      payables: [],
      totals: { totalReceivable: 0, totalPayable: 0, netPosition: 0 },
    }
  }
  
  // Process receivables (from customers - sales)
  const receivablesMap = new Map<string, ReceivablePayable>()
  const payablesMap = new Map<string, ReceivablePayable>()
  
  orders.forEach((order) => {
    const type = order.type || 'sale'
    const amount = order.total_price || 0
    const isPaid = order.payment_status === 'paid'
    
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
  
  const receivables = Array.from(receivablesMap.values())
    .filter((r) => r.pending_amount !== 0)
    .sort((a, b) => b.pending_amount - a.pending_amount)
  
  const payables = Array.from(payablesMap.values())
    .filter((p) => p.pending_amount !== 0)
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
