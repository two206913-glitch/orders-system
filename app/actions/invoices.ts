'use server'

import { createClient } from '@/lib/supabase/server'

export interface InvoiceItem {
  id: string
  order_id: string          // 原始訂單 ID
  date: string
  type: string
  product_name: string
  spec: string | null
  quantity: number
  unit_price: number
  shipping_fee: number
  amount: number
  note: string | null
  is_settled: boolean       // 該訂單是否已結清
  settled_at: string | null // 結清時間
}

export interface CustomerInvoice {
  customer_name: string
  date_from: string
  date_to: string
  items: InvoiceItem[]
  sale_product_subtotal: number  // 純商品金額（不含運費）- 顯示用
  sale_total: number      // 本期銷貨小計（含運費）- 計算用
  shipping_total: number  // 本期運費合計
  return_total: number    // 本期銷退合計（含運費）
  return_product_subtotal: number  // 純銷退商品金額（不含運費）- 顯示用
  net_total: number       // 本期應收總額（淨額）
  period_received: number // 本期已收（已結清訂單金額）
  period_pending: number  // 本期未收
}

export interface SupplierInvoice {
  supplier_name: string
  date_from: string
  date_to: string
  items: InvoiceItem[]
  purchase_product_subtotal: number  // 純商品成本（不含運費）- 顯示用
  purchase_total: number    // 本期進貨小計（含運費）- 計算用
  shipping_total: number    // 本期運費合計
  return_total: number      // 本期進退合計（含運費）
  return_product_subtotal: number  // 純進退商品金額（不含運費）- 顯示用
  net_total: number         // 本期應付總額（淨額）
  period_paid: number       // 本期已付（已結清訂單金額）
  period_pending: number    // 本期未付
}

// 取得所有客戶列表（有銷貨紀錄的）
export async function getCustomerList(): Promise<string[]> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('orders')
    .select('customer_name')
    .in('type', ['sale', 'sale_return'])
    .not('customer_name', 'is', null)
  
  const uniqueNames = [...new Set(data?.map(o => o.customer_name).filter(Boolean) as string[])]
  return uniqueNames.sort()
}

// 取得所有供應商列表（有進貨紀錄的）
export async function getSupplierList(): Promise<string[]> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('orders')
    .select('supplier')
    .in('type', ['purchase', 'purchase_return'])
    .not('supplier', 'is', null)
  
  const uniqueNames = [...new Set(data?.map(o => o.supplier).filter(Boolean) as string[])]
  return uniqueNames.sort()
}

// 取得客戶請款單
export async function getCustomerInvoice(
  customerName: string,
  dateFrom: string,
  dateTo: string
): Promise<CustomerInvoice> {
  const supabase = await createClient()
  
  // 取得該客戶在日期區間內的銷貨和銷退訂單（包含已結清與未結清）
  const { data: orders } = await supabase
    .from('orders')
    .select('id, date, type, product_name, spec, quantity, unit_price, shipping_fee, total_price, note, is_settled, settled_at')
    .eq('customer_name', customerName)
    .in('type', ['sale', 'sale_return'])
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date', { ascending: true })
  
  // 取得這些訂單的 order_items（包含 cost 欄位用於利潤計算）
  const orderIds = orders?.map(o => o.id) || []
  const { data: orderItems } = orderIds.length > 0 
    ? await supabase
        .from('order_items')
        .select('order_id, product_name, product_variant, quantity, unit_price, cost, subtotal')
        .in('order_id', orderIds)
    : { data: [] }
  
  // 建立 items：優先從 order_items 取得，否則用 orders 的舊欄位
  // 每筆 item 包含該訂單的 is_settled 狀態
  const items: InvoiceItem[] = (orders || []).flatMap(order => {
    const orderItemsForThis = orderItems?.filter(item => item.order_id === order.id) || []
    const shippingFee = order.shipping_fee || 0
    const isSettled = order.is_settled === true
    const settledAt = order.settled_at || null
    
    if (orderItemsForThis.length > 0) {
      // 有 order_items：每個 item 獨立顯示
      return orderItemsForThis.map((item, idx) => {
        const unitPrice = item.unit_price ?? 0
        const qty = item.quantity ?? 0
        const amount = item.subtotal ?? (unitPrice * qty)
        
        return {
          id: `${order.id}-${idx}`,
          order_id: order.id,
          date: order.date || '',
          type: order.type || 'sale',
          product_name: item.product_name || '',
          spec: item.product_variant,
          quantity: order.type === 'sale_return' ? -qty : qty,
          unit_price: unitPrice,
          shipping_fee: idx === 0 ? (order.type === 'sale_return' ? -shippingFee : shippingFee) : 0,
          amount: order.type === 'sale_return' ? -amount : amount,
          note: idx === 0 ? order.note : null,
          is_settled: isSettled,
          settled_at: settledAt,
        }
      })
    } else {
      // 無 order_items：舊訂單不顯示商品明細（只顯示訂單總額）
      // 不再使用 orders.quantity，因為該欄位已停止更新
      return [{
        id: order.id,
        order_id: order.id,
        date: order.date || '',
        type: order.type || 'sale',
        product_name: '(舊資料格式)',
        spec: null,
        quantity: 0,  // 不使用 orders.quantity
        unit_price: 0,
        shipping_fee: order.type === 'sale_return' ? -(order.shipping_fee || 0) : (order.shipping_fee || 0),
        amount: order.type === 'sale_return' ? -(order.total_price || 0) : (order.total_price || 0),
        note: order.note,
        is_settled: isSettled,
        settled_at: settledAt,
      }]
    }
  })
  
  // 計算本期銷貨和銷退（所有訂單，不論結清狀態）
  // sale_product_subtotal = 純商品金額（不含運費）- 顯示用
  const sale_product_subtotal = items
    .filter(i => i.type === 'sale')
    .reduce((sum, i) => sum + i.amount, 0)
  
  // sale_total = 商品 + 運費（計算用）
  const sale_total = items
    .filter(i => i.type === 'sale')
    .reduce((sum, i) => sum + i.amount + i.shipping_fee, 0)
  
  const shipping_total = items
    .filter(i => i.type === 'sale')
    .reduce((sum, i) => sum + i.shipping_fee, 0)
  
  // return_product_subtotal = 純銷退商品金額（不含運費）- 顯示用
  const return_product_subtotal = items
    .filter(i => i.type === 'sale_return')
    .reduce((sum, i) => sum + Math.abs(i.amount), 0)
  
  // return_total = 銷退商品 + 運費（計算用）
  const return_total = items
    .filter(i => i.type === 'sale_return')
    .reduce((sum, i) => sum + Math.abs(i.amount) + Math.abs(i.shipping_fee), 0)
  
  // 本期應收 = 銷貨 - 銷退
  const net_total = sale_total - return_total
  
  // 本期已收 = 已結清訂單的金額加總（使用 order_id 去重複）
  // 重要：訂單金額必須包含商品小計 + 運費
  const settledOrderIds = new Set<string>()
  const period_received = items.reduce((sum, item) => {
    if (item.is_settled && !settledOrderIds.has(item.order_id)) {
      settledOrderIds.add(item.order_id)
      // 找出同一訂單的所有 items 金額加總（包含運費）
      const orderAmount = items
        .filter(i => i.order_id === item.order_id)
        .reduce((s, i) => s + i.amount + i.shipping_fee, 0)
      return sum + orderAmount
    }
    return sum
  }, 0)
  
  // 本期未收 = 本期應收 - 本期已收
  const period_pending = Math.max(0, net_total - period_received)
  
  return {
    customer_name: customerName,
    date_from: dateFrom,
    date_to: dateTo,
    items,
    sale_product_subtotal,
    sale_total,
    shipping_total,
    return_total,
    return_product_subtotal,
    net_total,
    period_received,
    period_pending,
  }
}

// 取得供應商付款單
export async function getSupplierInvoice(
  supplierName: string,
  dateFrom: string,
  dateTo: string
): Promise<SupplierInvoice> {
  const supabase = await createClient()
  
  // 取得該供應商在日期區間內的進貨和進退訂單（包含已結清與未結清）
  const { data: orders } = await supabase
    .from('orders')
    .select('id, date, type, product_name, spec, quantity, unit_price, shipping_fee, cost, note, is_settled, settled_at')
    .eq('supplier', supplierName)
    .in('type', ['purchase', 'purchase_return'])
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date', { ascending: true })
  
  // 取得這些訂單的 order_items（包含 cost 欄位）
  const orderIds = orders?.map(o => o.id) || []
  const { data: orderItems } = orderIds.length > 0 
    ? await supabase
        .from('order_items')
        .select('order_id, product_name, product_variant, quantity, unit_price, cost, subtotal')
        .in('order_id', orderIds)
    : { data: [] }
  
  // 建立 items：優先從 order_items 取得，否則用 orders 的舊欄位
  // 每筆 item 包含該訂單的 is_settled 狀態
  const items: InvoiceItem[] = (orders || []).flatMap(order => {
    const orderItemsForThis = orderItems?.filter(item => item.order_id === order.id) || []
    const shippingFee = order.shipping_fee || 0
    const isSettled = order.is_settled === true
    const settledAt = order.settled_at || null
    
    if (orderItemsForThis.length > 0) {
      // 有 order_items：每個 item 獨立顯示
      // 重要：金額使用 subtotal（最終依據），單件成本只作為顯示參考
      return orderItemsForThis.map((item, idx) => {
        const qty = item.quantity ?? 0
        // 金額直接使用 subtotal，這是使用者輸入的最終值
        const amount = item.subtotal ?? 0
        // 單件成本 = subtotal / quantity（作為顯示參考）
        const unitCost = qty > 0 ? amount / qty : (item.cost ?? 0)
        
        return {
          id: `${order.id}-${idx}`,
          order_id: order.id,
          date: order.date || '',
          type: order.type || 'purchase',
          product_name: item.product_name || '',
          spec: item.product_variant,
          quantity: order.type === 'purchase_return' ? -qty : qty,
          unit_price: unitCost,  // 單件成本（顯示用）
          shipping_fee: idx === 0 ? (order.type === 'purchase_return' ? -shippingFee : shippingFee) : 0,
          amount: order.type === 'purchase_return' ? -amount : amount,  // 使用 subtotal
          note: idx === 0 ? order.note : null,
          is_settled: isSettled,
          settled_at: settledAt,
        }
      })
    } else {
      // 無 order_items：舊訂單不顯示商品明細（只顯示訂單總成本）
      // 不再使用 orders.quantity，因為該欄位已停止更新
      const cost = order.cost || 0
      
      return [{
        id: order.id,
        order_id: order.id,
        date: order.date || '',
        type: order.type || 'purchase',
        product_name: '(舊資料格式)',
        spec: null,
        quantity: 0,  // 不使用 orders.quantity
        unit_price: 0,
        shipping_fee: order.type === 'purchase_return' ? -shippingFee : shippingFee,
        amount: order.type === 'purchase_return' ? -cost : cost,
        note: order.note,
        is_settled: isSettled,
        settled_at: settledAt,
      }]
    }
  })
  
  // 計算本期進貨和進退（所有訂單，不論結清狀態）
  // purchase_product_subtotal = 純商品成本（不含運費）- 顯示用
  const purchase_product_subtotal = items
    .filter(i => i.type === 'purchase')
    .reduce((sum, i) => sum + i.amount, 0)
  
  // purchase_total = 商品成本 + 運費（計算用）
  const purchase_total = items
    .filter(i => i.type === 'purchase')
    .reduce((sum, i) => sum + i.amount + i.shipping_fee, 0)
  
  const shipping_total = items
    .filter(i => i.type === 'purchase')
    .reduce((sum, i) => sum + i.shipping_fee, 0)
  
  // return_product_subtotal = 純進退商品金額（不含運費）- 顯示用
  const return_product_subtotal = items
    .filter(i => i.type === 'purchase_return')
    .reduce((sum, i) => sum + Math.abs(i.amount), 0)
  
  // return_total = 進退商品 + 運費（計算用）
  const return_total = items
    .filter(i => i.type === 'purchase_return')
    .reduce((sum, i) => sum + Math.abs(i.amount) + Math.abs(i.shipping_fee), 0)
  
  // 本期應付 = 進貨 - 進退
  const net_total = purchase_total - return_total
  
  // 本期已付 = 已結清訂單的金額加總（使用 order_id 去重複）
  // 重要：訂單金額必須包含商品小計 + 運費
  const settledOrderIds = new Set<string>()
  const period_paid = items.reduce((sum, item) => {
    if (item.is_settled && !settledOrderIds.has(item.order_id)) {
      settledOrderIds.add(item.order_id)
      // 找出同一訂單的所有 items 金額加總（包含運費）
      const orderAmount = items
        .filter(i => i.order_id === item.order_id)
        .reduce((s, i) => s + i.amount + i.shipping_fee, 0)
      return sum + orderAmount
    }
    return sum
  }, 0)
  
  // 本期未付 = 本期應付 - 本期已付
  const period_pending = Math.max(0, net_total - period_paid)
  
  return {
    supplier_name: supplierName,
    date_from: dateFrom,
    date_to: dateTo,
    items,
    purchase_product_subtotal,
    purchase_total,
    shipping_total,
    return_total,
    return_product_subtotal,
    net_total,
    period_paid,
    period_pending,
  }
}

// 取得所有客戶的應收狀態（用於列表）
export async function getCustomerReceivables(showSettled: boolean = false): Promise<{
  customer_name: string
  total_amount: number
  received_amount: number
  pending_amount: number
  is_settled: boolean
}[]> {
  const supabase = await createClient()
  
  const { data: orders } = await supabase
    .from('orders')
    .select('customer_name, type, total_price')
    .in('type', ['sale', 'sale_return'])
    .not('customer_name', 'is', null)
  
  const { data: receipts } = await supabase
    .from('receipts')
    .select('customer_name, amount')
  
  const customersMap = new Map<string, { total: number; received: number }>()
  
  orders?.forEach(o => {
    const name = o.customer_name
    if (!name) return
    const current = customersMap.get(name) || { total: 0, received: 0 }
    const amount = o.total_price || 0
    current.total += o.type === 'sale_return' ? -amount : amount
    customersMap.set(name, current)
  })
  
  receipts?.forEach(r => {
    const name = r.customer_name
    if (!name) return
    const current = customersMap.get(name)
    if (current) {
      current.received += r.amount || 0
    }
  })
  
  const result = Array.from(customersMap.entries()).map(([name, data]) => ({
    customer_name: name,
    total_amount: data.total,
    received_amount: data.received,
    pending_amount: Math.max(0, data.total - data.received),
    is_settled: data.total - data.received <= 0,
  }))
  
  return result
    .filter(r => showSettled || !r.is_settled)
    .sort((a, b) => b.pending_amount - a.pending_amount)
}

// 取得所有供應商的應付狀態（用於列表）
// 重要：使用 order_items.subtotal 計算應付金額
export async function getSupplierPayables(showSettled: boolean = false): Promise<{
  supplier_name: string
  total_amount: number
  paid_amount: number
  pending_amount: number
  is_settled: boolean
}[]> {
  const supabase = await createClient()
  
  const { data: orders } = await supabase
    .from('orders')
    .select('id, supplier, type, cost, shipping_fee')
    .in('type', ['purchase', 'purchase_return'])
    .not('supplier', 'is', null)
  
  // 取得所有 order_items
  const orderIds = orders?.map(o => o.id) || []
  const { data: orderItems } = orderIds.length > 0
    ? await supabase
        .from('order_items')
        .select('order_id, subtotal')
        .in('order_id', orderIds)
    : { data: [] }
  
  const { data: payments } = await supabase
    .from('payments')
    .select('supplier_name, amount')
  
  const suppliersMap = new Map<string, { total: number; paid: number }>()
  
  orders?.forEach(o => {
    const name = o.supplier
    if (!name) return
    const current = suppliersMap.get(name) || { total: 0, paid: 0 }
    
    // 優先從 order_items 計算金額
    const itemsForOrder = orderItems?.filter(item => item.order_id === o.id) || []
    let orderAmount: number
    
    if (itemsForOrder.length > 0) {
      // 有 order_items，使用 subtotal 加總 + shipping_fee
      orderAmount = itemsForOrder.reduce((s, item) => s + (item.subtotal || 0), 0) + (o.shipping_fee || 0)
    } else {
      // 無 order_items，使用 cost + shipping_fee
      orderAmount = (o.cost || 0) + (o.shipping_fee || 0)
    }
    
    current.total += o.type === 'purchase_return' ? -orderAmount : orderAmount
    suppliersMap.set(name, current)
  })
  
  payments?.forEach(p => {
    const name = p.supplier_name
    if (!name) return
    const current = suppliersMap.get(name)
    if (current) {
      current.paid += p.amount || 0
    }
  })
  
  const result = Array.from(suppliersMap.entries()).map(([name, data]) => ({
    supplier_name: name,
    total_amount: data.total,
    paid_amount: data.paid,
    pending_amount: Math.max(0, data.total - data.paid),
    is_settled: data.total - data.paid <= 0,
  }))
  
  return result
    .filter(r => showSettled || !r.is_settled)
    .sort((a, b) => b.pending_amount - a.pending_amount)
}
