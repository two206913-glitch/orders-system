import { getMonthlyStats, getAvailableYears } from '@/app/actions/stats'
import { formatCurrency } from '@/lib/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BarChart3, TrendingUp, ShoppingCart, Package } from 'lucide-react'
import { YearSelector } from '@/components/stats/year-selector'

interface StatsPageProps {
  searchParams: Promise<{ year?: string }>
}

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const params = await searchParams
  const years = await getAvailableYears()
  const selectedYear = params.year ? parseInt(params.year) : years[0]
  const stats = await getMonthlyStats(selectedYear)
  
  // Calculate yearly totals
  const yearlyTotals = stats.reduce(
    (acc, month) => ({
      sales_count: acc.sales_count + month.sales_count,
      purchase_count: acc.purchase_count + month.purchase_count,
      sales_revenue: acc.sales_revenue + month.sales_revenue,
      sales_shipping: acc.sales_shipping + month.sales_shipping,
      purchase_cost: acc.purchase_cost + month.purchase_cost,
      purchase_shipping: acc.purchase_shipping + month.purchase_shipping,
      profit: acc.profit + month.profit,
    }),
    { sales_count: 0, purchase_count: 0, sales_revenue: 0, sales_shipping: 0, purchase_cost: 0, purchase_shipping: 0, profit: 0 }
  )

  // Find best month
  const bestMonth = stats.reduce((best, month) => 
    month.sales_revenue > best.sales_revenue ? month : best
  , stats[0])

  return (
    <div className="p-6 pt-16 lg:pt-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">月份統計</h1>
          <p className="text-muted-foreground">查看各月份的銷售與進貨統計</p>
        </div>
        <YearSelector years={years} selectedYear={selectedYear} />
      </div>

      {/* Yearly Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">年度銷售筆數</p>
                <p className="text-2xl font-bold">{yearlyTotals.sales_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-success/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">年度營收</p>
                <p className="text-2xl font-bold">{formatCurrency(yearlyTotals.sales_revenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Package className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">年度進貨成本</p>
                <p className="text-2xl font-bold">{formatCurrency(yearlyTotals.purchase_cost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">年度利潤</p>
                <p className={`text-2xl font-bold ${yearlyTotals.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(yearlyTotals.profit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Table */}
      <Card>
        <CardHeader>
          <CardTitle>{selectedYear} 年度月份統計</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>月份</TableHead>
                <TableHead className="text-right">銷售筆數</TableHead>
                <TableHead className="text-right">進貨筆數</TableHead>
                <TableHead className="text-right">銷售營收</TableHead>
                <TableHead className="text-right">銷售運費</TableHead>
                <TableHead className="text-right">進貨成本</TableHead>
                <TableHead className="text-right">進貨運費</TableHead>
                <TableHead className="text-right">利潤</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((month) => (
                <TableRow key={month.monthNum} className={month.monthNum === bestMonth?.monthNum ? 'bg-success/5' : ''}>
                  <TableCell className="font-medium">
                    {month.month}
                    {month.monthNum === bestMonth?.monthNum && month.sales_revenue > 0 && (
                      <span className="ml-2 text-xs text-success">最佳</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{month.sales_count}</TableCell>
                  <TableCell className="text-right">{month.purchase_count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(month.sales_revenue)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(month.sales_shipping)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(month.purchase_cost)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(month.purchase_shipping)}</TableCell>
                  <TableCell className={`text-right font-medium ${month.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(month.profit)}
                  </TableCell>
                </TableRow>
              ))}
              {/* Yearly Total Row */}
              <TableRow className="border-t-2 font-bold">
                <TableCell>年度合計</TableCell>
                <TableCell className="text-right">{yearlyTotals.sales_count}</TableCell>
                <TableCell className="text-right">{yearlyTotals.purchase_count}</TableCell>
                <TableCell className="text-right">{formatCurrency(yearlyTotals.sales_revenue)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrency(yearlyTotals.sales_shipping)}</TableCell>
                <TableCell className="text-right">{formatCurrency(yearlyTotals.purchase_cost)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrency(yearlyTotals.purchase_shipping)}</TableCell>
                <TableCell className={`text-right ${yearlyTotals.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(yearlyTotals.profit)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Products & Customers for the year */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>年度熱銷產品 Top 5</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Aggregate top products across all months
              const productMap = new Map<string, { quantity: number; revenue: number }>()
              stats.forEach((month) => {
                month.top_products.forEach((p) => {
                  const existing = productMap.get(p.name) || { quantity: 0, revenue: 0 }
                  existing.quantity += p.quantity
                  existing.revenue += p.revenue
                  productMap.set(p.name, existing)
                })
              })
              const topProducts = Array.from(productMap.entries())
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5)
              
              if (topProducts.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>尚無銷售資料</p>
                  </div>
                )
              }
              
              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>產品名稱</TableHead>
                      <TableHead className="text-right">銷售數量</TableHead>
                      <TableHead className="text-right">營收</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-right">{p.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>年度重要客戶 Top 5</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Aggregate top customers across all months
              const customerMap = new Map<string, { orders: number; revenue: number }>()
              stats.forEach((month) => {
                month.top_customers.forEach((c) => {
                  const existing = customerMap.get(c.name) || { orders: 0, revenue: 0 }
                  existing.orders += c.orders
                  existing.revenue += c.revenue
                  customerMap.set(c.name, existing)
                })
              })
              const topCustomers = Array.from(customerMap.entries())
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5)
              
              if (topCustomers.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>尚無客戶資料</p>
                  </div>
                )
              }
              
              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>客戶名稱</TableHead>
                      <TableHead className="text-right">訂單數</TableHead>
                      <TableHead className="text-right">營收貢獻</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-right">{c.orders}</TableCell>
                        <TableCell className="text-right">{formatCurrency(c.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
