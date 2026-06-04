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
  // 重要：包含 total_price 作為金額主要來源
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
  // 重要：訂單總金額使用 orders.total_price（已含運費）
  const items: InvoiceItem[] = (orders || []).flatMap(order => {
    const orderItemsForThis = orderItems?.filter(item => item.order_id === order.id) || []
    const shippingFee = order.shipping_fee || 0
    const isSettled = order.is_settled === true
    const settledAt = order.settled_at || null
    
    // 計算訂單總金額：優先使用 orders.total_price（已含運費）
    // 如果 total_price 不存在或為 0，則用 order_items.subtotal 加總 + shipping_fee
    let orderTotalAmount: number
    if (order.total_price && order.total_price > 0) {
      orderTotalAmount = order.total_price
    } else {
      // fallback: order_items.subtotal 加總 + shipping_fee
      const itemsSubtotal = orderItemsForThis.reduce((sum, item) => sum + (item.subtotal || 0), 0)
      orderTotalAmount = itemsSubtotal + shippingFee
    }
    
    // 計算商品小計（不含運費）用於分配
    const itemsProductSubtotal = orderItemsForThis.reduce((sum, item) => sum + (item.subtotal || 0), 0)
    
    if (orderItemsForThis.length > 0) {
      // 有 order_items：每個 item 獨立顯示
      // 重要修正：最後一個 item 的 amount 包含運費，確保總和等於 orderTotalAmount
      return orderItemsForThis.map((item, idx) => {
        const unitPrice = item.unit_price ?? 0
        const qty = item.quantity ?? 0
        const itemSubtotal = item.subtotal ?? (unitPrice * qty)
        
        // 最後一個 item 包含運費
        const isLastItem = idx === orderItemsForThis.length - 1
        const amount = isLastItem ? (itemSubtotal + shippingFee) : itemSubtotal
        
        return {
          id: `${order.id}-${idx}`,
          order_id: order.id,
          date: order.date || '',
          type: order.type || 'sale',
          product_name: item.product_name || '',
          spec: item.product_variant,
          quantity: order.type === 'sale_return' ? -qty : qty,
          unit_price: unitPrice,
          // 運費只在最後一個 item 顯示（參考用）
          shipping_fee: isLastItem ? (order.type === 'sale_return' ? -shippingFee : shippingFee) : 0,
          // 金額：最後一個 item 包含運費
          amount: order.type === 'sale_return' ? -amount : amount,
          note: idx === 0 ? order.note : null,
          is_settled: isSettled,
          settled_at: settledAt,
        }
      })
    } else {
      // 無 order_items：舊訂單使用 total_price 作為總金額（已含運費）
      return [{
        id: order.id,
        order_id: order.id,
        date: order.date || '',
        type: order.type || 'sale',
        product_name: '(舊資料格式)',
        spec: null,
        quantity: 0,  // 不使用 orders.quantity
        unit_price: 0,
        shipping_fee: order.type === 'sale_return' ? -shippingFee : shippingFee,
        // 金額：使用 total_price（已含運費）
        amount: order.type === 'sale_return' ? -orderTotalAmount : orderTotalAmount,
        note: order.note,
        is_settled: isSettled,
        settled_at: settledAt,
      }]
    }
  })
  
  // 計算本期銷貨和銷退（所有訂單，不論結清狀態）
  // sale_product_subtotal = 金額加總（已含運費）- 顯示用
  const sale_product_subtotal = items
    .filter(i => i.type === 'sale')
    .reduce((sum, i) => sum + i.amount, 0)
  
  // sale_total = 金額加總（已含運費）
  // 注意：現在 amount 已包含運費，不需要再加 shipping_fee
  const sale_total = sale_product_subtotal
  
  const shipping_total = items
    .filter(i => i.type === 'sale')
    .reduce((sum, i) => sum + i.shipping_fee, 0)
  
  // return_product_subtotal = 銷退金額加總（已含運費）- 顯示用
  const return_product_subtotal = items
    .filter(i => i.type === 'sale_return')
    .reduce((sum, i) => sum + Math.abs(i.amount), 0)
  
  // return_total = 銷退金額加總（已含運費）
  const return_total = return_product_subtotal
  
  // 本期應收 = 銷貨 - 銷退
  const net_total = sale_total - return_total
  
  // 本期已收 = 已結清訂單的金額加總（使用 order_id 去重複）
  // 重要：使用 orders.total_price 作為訂單金額
  const settledOrderIds = new Set<string>()
  const period_received = (orders || []).reduce((sum, order) => {
    if (order.is_settled && !settledOrderIds.has(order.id)) {
      settledOrderIds.add(order.id)
      
      // 優先使用 orders.total_price
      let orderAmount: number
      if (order.total_price && order.total_price > 0) {
        orderAmount = order.total_price
      } else {
        // fallback: order_items.subtotal 加總 + shipping_fee
        const itemsForOrder = orderItems?.filter(item => item.order_id === order.id) || []
        const itemsSubtotal = itemsForOrder.reduce((s, item) => s + (item.subtotal || 0), 0)
        orderAmount = itemsSubtotal + (order.shipping_fee || 0)
      }
      
      // 銷退訂單扣除
      if (order.type === 'sale_return') {
        return sum - orderAmount
      }
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
  // 重要：訂單總金額使用 orders.cost + shipping_fee
  const items: InvoiceItem[] = (orders || []).flatMap(order => {
    const orderItemsForThis = orderItems?.filter(item => item.order_id === order.id) || []
    const shippingFee = order.shipping_fee || 0
    const isSettled = order.is_settled === true
    const settledAt = order.settled_at || null
    
    // 計算訂單總金額：使用 orders.cost + shipping_fee
    // 如果 cost 不存在或為 0，則用 order_items.subtotal 加總 + shipping_fee
    const orderCost = order.cost || 0
    let orderTotalAmount: number
    if (orderCost > 0) {
      orderTotalAmount = orderCost + shippingFee
    } else {
      // fallback: order_items.subtotal 加總 + shipping_fee
      const itemsSubtotal = orderItemsForThis.reduce((sum, item) => sum + (item.subtotal || 0), 0)
      orderTotalAmount = itemsSubtotal + shippingFee
    }
    
    if (orderItemsForThis.length > 0) {
      // 有 order_items：每個 item 獨立顯示
      // 重要修正：最後一個 item 的 amount 包含運費，確保總和等於 orderTotalAmount
      return orderItemsForThis.map((item, idx) => {
        const qty = item.quantity ?? 0
        // 金額直接使用 subtotal
        const itemSubtotal = item.subtotal ?? 0
        // 單件成本 = subtotal / quantity（作為顯示參考）
        const unitCost = qty > 0 ? itemSubtotal / qty : (item.cost ?? 0)
        
        // 最後一個 item 包含運費
        const isLastItem = idx === orderItemsForThis.length - 1
        const amount = isLastItem ? (itemSubtotal + shippingFee) : itemSubtotal
        
        return {
          id: `${order.id}-${idx}`,
          order_id: order.id,
          date: order.date || '',
          type: order.type || 'purchase',
          product_name: item.product_name || '',
          spec: item.product_variant,
          quantity: order.type === 'purchase_return' ? -qty : qty,
          unit_price: unitCost,  // 單件成本（顯示用）
          // 運費只在最後一個 item 顯示（參考用）
          shipping_fee: isLastItem ? (order.type === 'purchase_return' ? -shippingFee : shippingFee) : 0,
          // 金額：最後一個 item 包含運費
          amount: order.type === 'purchase_return' ? -amount : amount,
          note: idx === 0 ? order.note : null,
          is_settled: isSettled,
          settled_at: settledAt,
        }
      })
    } else {
      // 無 order_items：舊訂單使用 cost + shipping_fee 作為總金額
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
        // 金額：使用 orderTotalAmount（已含運費）
        amount: order.type === 'purchase_return' ? -orderTotalAmount : orderTotalAmount,
        note: order.note,
        is_settled: isSettled,
        settled_at: settledAt,
      }]
    }
  })
  
  // 計算本期進貨和進退（所有訂單，不論結清狀態）
  // purchase_product_subtotal = 金額加總（已含運費）- 顯示用
  const purchase_product_subtotal = items
    .filter(i => i.type === 'purchase')
    .reduce((sum, i) => sum + i.amount, 0)
  
  // purchase_total = 金額加總（已含運費）
  // 注意：現在 amount 已包含運費，不需要再加 shipping_fee
  const purchase_total = purchase_product_subtotal
  
  const shipping_total = items
    .filter(i => i.type === 'purchase')
    .reduce((sum, i) => sum + i.shipping_fee, 0)
  
  // return_product_subtotal = 進退金額加總（已含運費）- 顯示用
  const return_product_subtotal = items
    .filter(i => i.type === 'purchase_return')
    .reduce((sum, i) => sum + Math.abs(i.amount), 0)
  
  // return_total = 進退金額加總（已含運費）
  const return_total = return_product_subtotal
  
  // 本期應付 = 進貨 - 進退
  const net_total = purchase_total - return_total
  
  // 本期已付 = 已結清訂單的金額加總（使用 order_id 去重複）
  // 重要：使用 orders.cost + shipping_fee 作為訂單金額
  const settledOrderIds = new Set<string>()
  const period_paid = (orders || []).reduce((sum, order) => {
    if (order.is_settled && !settledOrderIds.has(order.id)) {
      settledOrderIds.add(order.id)
      
      // 優先使用 orders.cost + shipping_fee
      const orderCost = order.cost || 0
      let orderAmount: number
      if (orderCost > 0) {
        orderAmount = orderCost + (order.shipping_fee || 0)
      } else {
        // fallback: order_items.subtotal 加總 + shipping_fee
        const itemsForOrder = orderItems?.filter(item => item.order_id === order.id) || []
        const itemsSubtotal = itemsForOrder.reduce((s, item) => s + (item.subtotal || 0), 0)
        orderAmount = itemsSubtotal + (order.shipping_fee || 0)
      }
      
      // 進退訂單扣除
      if (order.type === 'purchase_return') {
        return sum - orderAmount
      }
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
