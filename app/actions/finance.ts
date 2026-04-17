'use server'

import { createClient } from '@/lib/supabase/server'

export interface ReceivablePayable {
  name: string
  type: 'customer' | 'supplier'
  total_amount: number    // 應收/應付金額（訂單）
  received_amount: number // 已收/已付金額（收付款紀錄）
  pending_amount: number  // 待收/待付（差額）
  order_count: number
}

export async function getReceivablesPayables(): Promise<{
  receivables: ReceivablePayable[]
  payables: ReceivablePayable[]
  totals: {
    totalReceivable: number
    totalPayable: number
    netPosition: number
    totalReceipts: number
    totalPayments: number
  }
}> {
  const supabase = await createClient()
  
  // 取得訂單資料
  const { data: orders } = await supabase
    .from('orders')
    .select('customer_name, supplier, total_price, cost, type')
  
  // 取得收款資料（從 receipts 表，欄位為 customer_name）
  const { data: receiptsData } = await supabase
    .from('receipts')
    .select('customer_name, amount')
  
  // 取得付款資料（從 payments 表，欄位為 supplier_name）
  const { data: paymentsData } = await supabase
    .from('payments')
    .select('supplier_name, amount')
  
  // 計算收付款總額
  const receiptsMap = new Map<string, number>()
  const paymentsToSupplierMap = new Map<string, number>()
  let totalReceipts = 0
  let totalPayments = 0
  
  receiptsData?.forEach((r) => {
    if (!r.customer_name) return
    const current = receiptsMap.get(r.customer_name) || 0
    receiptsMap.set(r.customer_name, current + (r.amount || 0))
    totalReceipts += r.amount || 0
  })
  
  paymentsData?.forEach((p) => {
    if (!p.supplier_name) return
    const current = paymentsToSupplierMap.get(p.supplier_name) || 0
    paymentsToSupplierMap.set(p.supplier_name, current + (p.amount || 0))
    totalPayments += p.amount || 0
  })
  
  // 應收帳款來自客戶（銷貨用 total_price，銷退沖銷）
  const receivablesMap = new Map<string, ReceivablePayable>()
  // 應付帳款來自供應商（進貨用 cost，進退沖銷）
  const payablesMap = new Map<string, ReceivablePayable>()
  
  orders?.forEach((order) => {
    const type = order.type || 'sale'
    
    // 銷貨/銷退：影響應收帳款
    if ((type === 'sale' || type === 'sale_return') && order.customer_name) {
      const name = order.customer_name
      const item = receivablesMap.get(name) || {
        name,
        type: 'customer' as const,
        total_amount: 0,
        received_amount: 0,
        pending_amount: 0,
        order_count: 0,
      }
      
      // 銷貨用 total_price（售價），銷退用負數沖銷
      const amount = order.total_price || 0
      const effectiveAmount = type === 'sale_return' ? -amount : amount
      
      item.total_amount += effectiveAmount
      item.order_count += 1
      
      receivablesMap.set(name, item)
    }
    
    // 進貨/進退：影響應付帳款
    if ((type === 'purchase' || type === 'purchase_return') && order.supplier) {
      const name = order.supplier
      const item = payablesMap.get(name) || {
        name,
        type: 'supplier' as const,
        total_amount: 0,
        received_amount: 0,
        pending_amount: 0,
        order_count: 0,
      }
      
      // 進貨用 cost（成本），進退用負數沖銷
      const amount = order.cost || 0
      const effectiveAmount = type === 'purchase_return' ? -amount : amount
      
      item.total_amount += effectiveAmount
      item.order_count += 1
      
      payablesMap.set(name, item)
    }
  })
  
  // 計算待收金額：應收 - 已收（收款紀錄）
  receivablesMap.forEach((item, name) => {
    item.received_amount = receiptsMap.get(name) || 0
    item.pending_amount = item.total_amount - item.received_amount
  })
  
  // 計算待付金額：應付 - 已付（付款紀錄）
  payablesMap.forEach((item, name) => {
    item.received_amount = paymentsToSupplierMap.get(name) || 0
    item.pending_amount = item.total_amount - item.received_amount
  })
  
  // 過濾掉待收/待付為 0 的項目，並按待收/待付金額排序
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
      totalReceipts,
      totalPayments,
    },
  }
}
