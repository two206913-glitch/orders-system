'use client'

import { useState, useEffect } from 'react'
import { getInventoryFromOrders } from '@/app/actions/inventory'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Package, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react'

type InventoryItem = {
  product_name: string
  spec: string | null
  cost: number
  price: number
  supplier: string | null
  stock: number
  min_stock: number
  unit: string | null
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadInventory()
  }, [search])

  const loadInventory = async () => {
    setIsLoading(true)
    try {
      const data = await getInventoryFromOrders(search)
      setInventory(data)
    } catch (error) {
      console.error('[v0] Failed to load inventory:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 計算統計數據
  const stats = {
    totalProducts: inventory.length,
    lowStockCount: inventory.filter(item => item.stock > 0 && item.stock <= item.min_stock).length,
    outOfStockCount: inventory.filter(item => item.stock <= 0).length,
    totalValue: inventory.reduce((sum, item) => sum + (item.cost * item.stock), 0),
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.stock <= 0) return { label: '缺貨', variant: 'destructive' as const }
    if (item.stock <= item.min_stock) return { label: '庫存低', variant: 'warning' as const }
    return { label: '正常', variant: 'success' as const }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">庫存管理</h1>
        <p className="text-muted-foreground">即時庫存監控，根據進銷貨紀錄自動計算</p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              商品總數
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              庫存偏低
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.lowStockCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              缺貨商品
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.outOfStockCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              庫存總成本
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* 搜尋和篩選 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="搜尋商品名稱、規格或供應商..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 庫存列表 */}
      <Card>
        <CardHeader>
          <CardTitle>庫存列表</CardTitle>
          <CardDescription>共 {inventory.length} 項商品</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>商品名稱</TableHead>
                  <TableHead>規格</TableHead>
                  <TableHead>供應商</TableHead>
                  <TableHead className="text-right">成本</TableHead>
                  <TableHead className="text-right">售價</TableHead>
                  <TableHead className="text-right">毛利率</TableHead>
                  <TableHead className="text-center">庫存</TableHead>
                  <TableHead className="text-center">狀態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      載入中...
                    </TableCell>
                  </TableRow>
                ) : inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {search ? '找不到符合條件的商品' : '目前沒有庫存資料'}
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map((item, index) => {
                    const status = getStockStatus(item)
                    const margin = item.price > 0 && item.cost > 0 
                      ? Math.round(((item.price - item.cost) / item.price) * 100) 
                      : 0

                    return (
                      <TableRow key={`${item.product_name}-${item.spec}-${index}`}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.spec || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{item.supplier || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.cost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right">
                          {margin > 0 ? (
                            <span className={margin >= 20 ? 'text-success' : margin >= 10 ? 'text-warning' : 'text-destructive'}>
                              {margin}%
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={item.stock <= 0 ? 'text-destructive' : item.stock <= item.min_stock ? 'text-warning' : ''}>
                            {item.stock} {item.unit}
                          </span>
                          {item.min_stock > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              / {item.min_stock}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={status.variant === 'success' ? 'default' : status.variant === 'warning' ? 'outline' : 'destructive'}>
                            {status.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
