'use server'

import { createClient } from '@/lib/supabase/server'

export interface MonthlyStats {
  month: string
  year: number
  monthNum: number
  sales_count: number       // 銷貨筆數
  purchase_count: number    // 進貨筆數
  sales_revenue: number     // 銷售營收（銷貨 - 銷退）
  purchase_cost: number     // 進貨成本（進貨 - 進退，使用 cost 欄位）
  profit: number            // 利潤
  top_products: { name: string; quantity: number; revenue: number }[]
  top_customers: { name: string; orders: number; revenue: number }[]
}

export async function getMonthlyStats(year?: number): Promise<MonthlyStats[]> {
  const supabase = await createClient()
  const targetYear = year || new Date().getFullYear()
  
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .gte('date', `${targetYear}-01-01`)
    .lte('date', `${targetYear}-12-31`)
  
  if (!orders) return []
  
  // Group by month
  const monthlyData = new Map<number, {
    sales: typeof orders       // 銷貨 + 銷退
    purchases: typeof orders   // 進貨 + 進退
  }>()
  
  // Initialize all months
  for (let m = 1; m <= 12; m++) {
    monthlyData.set(m, { sales: [], purchases: [] })
  }
  
  orders.forEach((order) => {
    if (!order.date) return
    const month = new Date(order.date).getMonth() + 1
    const data = monthlyData.get(month)!
    const type = order.type || 'sale'
    
    if (type === 'sale' || type === 'sale_return') {
      data.sales.push(order)
    } else {
      data.purchases.push(order)
    }
  })
  
  const monthNames = ['', '一月', '二月', '三月', '四月', '五月', '六月', 
                      '七月', '八月', '九月', '十月', '十一月', '十二月']
  
  const stats: MonthlyStats[] = []
  
  monthlyData.forEach((data, monthNum) => {
    // 計算銷售營收（銷貨用 total_price，銷退用負數沖銷）
    const salesRevenue = data.sales.reduce((sum, o) => {
      const amount = o.total_price || 0
      return sum + (o.type === 'sale_return' ? -amount : amount)
    }, 0)
    
    // 計算進貨成本（進貨用 cost 欄位，進退用負數沖銷）
    const purchaseCost = data.purchases.reduce((sum, o) => {
      const amount = o.cost || 0  // 使用 cost 欄位，不是 total_price
      return sum + (o.type === 'purchase_return' ? -amount : amount)
    }, 0)
    
    // 計算銷售利潤（銷貨的 profit 欄位，銷退沖銷）
    const profit = data.sales.reduce((sum, o) => {
      const p = o.profit || 0
      return sum + (o.type === 'sale_return' ? -p : p)
    }, 0)
    
    // 熱銷產品統計（只算銷貨）
    const productMap = new Map<string, { quantity: number; revenue: number }>()
    data.sales.forEach((o) => {
      if (!o.product_name) return
      const existing = productMap.get(o.product_name) || { quantity: 0, revenue: 0 }
      const qty = o.quantity || 0
      const rev = o.total_price || 0
      existing.quantity += o.type === 'sale_return' ? -qty : qty
      existing.revenue += o.type === 'sale_return' ? -rev : rev
      productMap.set(o.product_name, existing)
    })
    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .filter((p) => p.quantity > 0)  // 過濾掉淨銷量為負的
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
    
    // 重要客戶統計（只算銷貨）
    const customerMap = new Map<string, { orders: number; revenue: number }>()
    data.sales.forEach((o) => {
      if (!o.customer_name) return
      const existing = customerMap.get(o.customer_name) || { orders: 0, revenue: 0 }
      existing.orders += 1
      const rev = o.total_price || 0
      existing.revenue += o.type === 'sale_return' ? -rev : rev
      customerMap.set(o.customer_name, existing)
    })
    const topCustomers = Array.from(customerMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .filter((c) => c.revenue > 0)  // 過濾掉營收為負的
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
    
    stats.push({
      month: monthNames[monthNum],
      year: targetYear,
      monthNum,
      sales_count: data.sales.filter(o => o.type === 'sale').length,
      purchase_count: data.purchases.filter(o => o.type === 'purchase').length,
      sales_revenue: salesRevenue,
      purchase_cost: purchaseCost,
      profit,
      top_products: topProducts,
      top_customers: topCustomers,
    })
  })
  
  return stats
}

export async function getAvailableYears(): Promise<number[]> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('orders')
    .select('date')
    .not('date', 'is', null)
  
  if (!data) return [new Date().getFullYear()]
  
  const years = new Set<number>()
  data.forEach((o) => {
    if (o.date) {
      years.add(new Date(o.date).getFullYear())
    }
  })
  
  const yearList = Array.from(years).sort((a, b) => b - a)
  if (yearList.length === 0) {
    yearList.push(new Date().getFullYear())
  }
  
  return yearList
}
