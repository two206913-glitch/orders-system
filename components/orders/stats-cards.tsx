import { Card, CardContent } from '@/components/ui/card'
import { Package, ShoppingCart, Banknote, Truck } from 'lucide-react'
import { formatCurrency } from '@/lib/locale'

interface StatsCardsProps {
  stats: {
    totalOrders: number
    todayOrders: number
    todayRevenue: number
    pendingShipments: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: '訂單總數',
      value: stats.totalOrders.toLocaleString('zh-TW'),
      icon: Package,
      color: 'text-chart-3',
      bgColor: 'bg-chart-3/10',
    },
    {
      title: '今日訂單',
      value: stats.todayOrders.toLocaleString('zh-TW'),
      icon: ShoppingCart,
      color: 'text-chart-1',
      bgColor: 'bg-chart-1/10',
    },
    {
      title: '今日營收',
      value: formatCurrency(stats.todayRevenue),
      icon: Banknote,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: '待出貨',
      value: stats.pendingShipments.toLocaleString('zh-TW'),
      icon: Truck,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="shadow-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
