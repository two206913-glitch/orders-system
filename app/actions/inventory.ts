'use server'

import { createClient } from '@/lib/supabase/server'

export interface InventoryItem {
  product_name: string
  spec: string | null
  total_in: number        // 總進貨數量（進貨 - 進退）
  total_out: number       // 總出貨數量（銷貨 - 銷退）
  current_stock: number   // 現有庫存
  avg_cost: number        // 平均成本（只用進貨計算）
  total_value: number     // 庫存總值 = 現有庫存 × 平均成本
}

export async function getInventory(): Promise<InventoryItem[]> {
  const supabase = await createClient()
  
  // 取得所有訂單（只需要 id 和 type）
  const { data: orders } = await supabase
    .from('orders')
    .select('id, type, date, shipping_fee')
    .order('date', { ascending: true })
  
  // 取得所有 order_items（商品明細）
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('order_id, product_name, product_variant, quantity, cost, unit_price')
  
  if (!orders || !orderItems) return []
  
  // 建立 order_id -> order 的對應
  const ordersMap = new Map(orders.map(o => [o.id, o]))
  
  // Group by product_name + variant
  const inventory = new Map<string, {
    product_name: string
    spec: string | null
    purchase_qty: number
    purchase_cost: number
    purchase_return_qty: number
    purchase_return_cost: number
    sale_qty: number
    sale_return_qty: number
  }>()
  
  // 從 order_items 計算庫存
  orderItems.forEach((item) => {
    const order = ordersMap.get(item.order_id)
    if (!order) return
    
    const key = `${item.product_name}||${item.product_variant || ''}`
    const inv = inventory.get(key) || {
      product_name: item.product_name,
      spec: item.product_variant,
      purchase_qty: 0,
      purchase_cost: 0,
      purchase_return_qty: 0,
      purchase_return_cost: 0,
      sale_qty: 0,
      sale_return_qty: 0,
    }
    
    const qty = item.quantity || 0
    // 成本優先用 order_items.cost，沒有則用 unit_price
    const cost = (item.cost ?? item.unit_price ?? 0) * qty
    const type = order.type || 'sale'
    
    switch (type) {
      case 'purchase':
        inv.purchase_qty += qty
        inv.purchase_cost += cost
        break
      case 'purchase_return':
        inv.purchase_return_qty += qty
        inv.purchase_return_cost += cost
        break
      case 'sale':
        inv.sale_qty += qty
        break
      case 'sale_return':
        inv.sale_return_qty += qty
        break
    }
    
    inventory.set(key, inv)
  })
  
  // Convert to InventoryItem with correct calculations
  const result: InventoryItem[] = []
  
  inventory.forEach((item) => {
    // 淨進貨數量 = 進貨 - 進退
    const netPurchaseQty = item.purchase_qty - item.purchase_return_qty
    // 淨進貨成本 = 進貨成本 - 進退成本
    const netPurchaseCost = item.purchase_cost - item.purchase_return_cost
    
    // 平均成本 = 淨進貨成本 / 淨進貨數量（只用進貨計算，銷貨不影響）
    const avgCost = netPurchaseQty > 0 ? netPurchaseCost / netPurchaseQty : 0
    
    // 總進貨 = 進貨 - 進退
    const totalIn = netPurchaseQty
    // 總出貨 = 銷貨 - 銷退
    const totalOut = item.sale_qty - item.sale_return_qty
    // 現有庫存 = 總進貨 - 總出貨
    const currentStock = totalIn - totalOut
    // 庫存總值 = 現有庫存 × 平均成本
    const totalValue = currentStock * avgCost
    
    result.push({
      product_name: item.product_name,
      spec: item.spec,
      total_in: totalIn,
      total_out: totalOut,
      current_stock: currentStock,
      avg_cost: avgCost,
      total_value: totalValue,
    })
  })
  
  return result.sort((a, b) => 
    a.product_name.localeCompare(b.product_name, 'zh-TW')
  )
}

// 取得特定產品的平均成本（用於銷貨時計算利潤）
export async function getProductAvgCost(productName: string, spec?: string | null): Promise<number> {
  const inventory = await getInventory()
  const item = inventory.find(
    (i) => i.product_name === productName && (i.spec || '') === (spec || '')
  )
  return item?.avg_cost || 0
}

// 從 order_items 計算庫存（供庫存頁面使用）
export async function getInventoryFromOrders(search?: string): Promise<{
  product_name: string
  spec: string | null
  cost: number
  price: number
  supplier: string | null
  stock: number
  min_stock: number
  unit: string | null
}[]> {
  const supabase = await createClient()

  // 取得所有訂單（只需要 id, type, supplier）
  const { data: orders } = await supabase
    .from('orders')
    .select('id, type, supplier')

  // 取得所有 order_items
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('order_id, product_name, product_variant, quantity, cost, unit_price')

  // 取得商品資料（用於取得價格和安全庫存）
  const { data: products } = await supabase
    .from('products')
    .select('name, variant, cost, price, min_stock, unit, supplier')
    .eq('is_active', true)

  if (!orders || !orderItems) return []

  // 建立 order_id -> order 的對應
  const ordersMap = new Map(orders.map(o => [o.id, o]))

  // 按商品名稱和規格分組計算庫存
  const inventoryMap = new Map<string, {
    product_name: string
    spec: string | null
    quantity: number
    totalCost: number
    orderCount: number
    supplier: string | null
  }>()

  // 從 order_items 計算
  orderItems.forEach((item) => {
    const order = ordersMap.get(item.order_id)
    if (!order || !item.product_name) return
    
    const key = `${item.product_name}|${item.product_variant || ''}`
    const current = inventoryMap.get(key) || {
      product_name: item.product_name,
      spec: item.product_variant,
      quantity: 0,
      totalCost: 0,
      orderCount: 0,
      supplier: order.supplier,
    }

    const qty = item.quantity || 0
    const cost = (item.cost ?? item.unit_price ?? 0) * qty

    switch (order.type) {
      case 'purchase':
        current.quantity += qty
        current.totalCost += cost
        current.orderCount += 1
        break
      case 'sale':
        current.quantity -= qty
        break
      case 'sale_return':
        current.quantity += qty
        break
      case 'purchase_return':
        current.quantity -= qty
        current.totalCost -= cost
        break
    }

    if (!current.supplier && order.supplier) {
      current.supplier = order.supplier
    }

    inventoryMap.set(key, current)
  })

  // 轉換為結果陣列
  const items: {
    product_name: string
    spec: string | null
    cost: number
    price: number
    supplier: string | null
    stock: number
    min_stock: number
    unit: string | null
  }[] = []

  inventoryMap.forEach((item) => {
    const product = products?.find(
      (p) => p.name === item.product_name && (p.variant || null) === (item.spec || null)
    )

    const avgCost = item.orderCount > 0 ? Math.round(item.totalCost / item.orderCount) : 0

    items.push({
      product_name: item.product_name,
      spec: item.spec,
      cost: product?.cost || avgCost,
      price: product?.price || 0,
      supplier: product?.supplier || item.supplier,
      stock: item.quantity,
      min_stock: product?.min_stock || 5,
      unit: product?.unit || '個',
    })
  })

  // 過濾和排序
  let filtered = items
  if (search) {
    const searchLower = search.toLowerCase()
    filtered = items.filter(
      (item) =>
        item.product_name.toLowerCase().includes(searchLower) ||
        (item.spec && item.spec.toLowerCase().includes(searchLower)) ||
        (item.supplier && item.supplier.toLowerCase().includes(searchLower))
    )
  }

  return filtered.sort((a, b) => a.product_name.localeCompare(b.product_name, 'zh-TW'))
}
