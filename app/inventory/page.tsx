import { getInventory } from '@/app/actions/inventory'
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
import { Badge } from '@/components/ui/badge'
import { Warehouse, Package, TrendingUp, TrendingDown } from 'lucide-react'

export default async function InventoryPage() {
  const inventory = await getInventory()
  
  const totalProducts = inventory.length
  const lowStock = inventory.filter((i) => i.current_stock > 0 && i.current_stock < 10)
  const outOfStock = inventory.filter((i) => i.current_stock <= 0)
  const totalValue = inventory.reduce((sum, i) => sum + i.current_stock * i.avg_cost, 0)

  return (
    <div className="p-6 pt-16 lg:pt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">庫存管理</h1>
        <p className="text-muted-foreground">查看產品庫存狀態與進出貨紀錄</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">產品種類</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-warning/10 rounded-lg">
                <TrendingDown className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">庫存不足</p>
                <p className="text-2xl font-bold">{lowStock.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Warehouse className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">缺貨產品</p>
                <p className="text-2xl font-bold">{outOfStock.length}</p>
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
                <p className="text-sm text-muted-foreground">庫存總值</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>庫存明細</CardTitle>
        </CardHeader>
        <CardContent>
          {inventory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Warehouse className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>尚無庫存資料</p>
              <p className="text-sm">新增進貨訂單後將自動顯示庫存</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>產品名稱</TableHead>
                  <TableHead>規格</TableHead>
                  <TableHead className="text-right">進貨數量</TableHead>
                  <TableHead className="text-right">出貨數量</TableHead>
                  <TableHead className="text-right">現有庫存</TableHead>
                  <TableHead className="text-right">平均成本</TableHead>
                  <TableHead>狀態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>{item.spec || '-'}</TableCell>
                    <TableCell className="text-right">{item.total_in}</TableCell>
                    <TableCell className="text-right">{item.total_out}</TableCell>
                    <TableCell className="text-right font-medium">{item.current_stock}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.avg_cost)}</TableCell>
                    <TableCell>
                      {item.current_stock <= 0 ? (
                        <Badge variant="destructive">缺貨</Badge>
                      ) : item.current_stock < 10 ? (
                        <Badge className="bg-warning text-warning-foreground">庫存不足</Badge>
                      ) : (
                        <Badge className="bg-success text-success-foreground">正常</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
