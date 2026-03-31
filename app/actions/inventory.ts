'use server'

import { createClient } from '@/lib/supabase/server'

export interface InventoryItem {
  product_name: string
  spec: string | null
  total_in: number
  total_out: number
  current_stock: number
  avg_cost: number
}

export async function getInventory(): Promise<InventoryItem[]> {
  const supabase = await createClient()
  
  // Get all orders grouped by product
  const { data: orders } = await supabase
    .from('orders')
    .select('product_name, spec, quantity, cost, type')
    .not('product_name', 'is', null)
  
  if (!orders) return []
  
  // Group by product_name + spec
  const inventory = new Map<string, InventoryItem>()
  
  orders.forEach((order) => {
    const key = `${order.product_name}||${order.spec || ''}`
    const item = inventory.get(key) || {
      product_name: order.product_name!,
      spec: order.spec,
      total_in: 0,
      total_out: 0,
      current_stock: 0,
      avg_cost: 0,
    }
    
    const qty = order.quantity || 0
    const type = order.type || 'sale'
    
    // Purchase and purchase_return affect incoming
    // Sale and sale_return affect outgoing
    if (type === 'purchase') {
      item.total_in += qty
      item.current_stock += qty
    } else if (type === 'purchase_return') {
      item.total_in -= qty
      item.current_stock -= qty
    } else if (type === 'sale') {
      item.total_out += qty
      item.current_stock -= qty
    } else if (type === 'sale_return') {
      item.total_out -= qty
      item.current_stock += qty
    }
    
    // Calculate average cost (simplified)
    if (order.cost && type === 'purchase' && qty > 0) {
      const totalCost = item.avg_cost * (item.total_in - qty) + order.cost
      item.avg_cost = totalCost / item.total_in
    }
    
    inventory.set(key, item)
  })
  
  return Array.from(inventory.values()).sort((a, b) => 
    a.product_name.localeCompare(b.product_name, 'zh-TW')
  )
}
