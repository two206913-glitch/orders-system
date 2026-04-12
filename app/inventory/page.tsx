'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Package,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  AlertTriangle,
  XCircle,
  CheckCircle,
} from 'lucide-react'
import { getProducts, updateProduct } from '@/app/actions/products'
import { formatCurrency } from '@/lib/locale'
import type { Product } from '@/lib/types/product'

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  
  // 庫存調整對話框
  const [adjustDialog, setAdjustDialog] = useState<{
    open: boolean
    product: Product | null
    type: 'add' | 'subtract'
  }>({ open: false, product: null, type: 'add' })
  const [adjustQuantity, setAdjustQuantity] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [isAdjusting, setIsAdjusting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getProducts({ search, showInactive: false })
      setProducts(data)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const openAdjustDialog = (product: Product, type: 'add' | 'subtract') => {
    setAdjustDialog({ open: true, product, type })
    setAdjustQuantity('')
    setAdjustNote('')
  }

  const handleAdjust = async () => {
    if (!adjustDialog.product || !adjustQuantity) return
    
    const qty = parseInt(adjustQuantity)
    if (isNaN(qty) || qty <= 0) {
      alert('請輸入有效數量')
      return
    }

    const newStock = adjustDialog.type === 'add'
      ? adjustDialog.product.stock + qty
      : adjustDialog.product.stock - qty

    if (newStock < 0) {
      alert('庫存不能為負數')
      return
    }

    setIsAdjusting(true)
    try {
      await updateProduct({
        id: adjustDialog.product.id,
        stock: newStock,
      })
      setAdjustDialog({ open: false, product: null, type: 'add' })
      loadData()
    } catch (error) {
      console.error('Error adjusting stock:', error)
      alert('調整庫存失敗')
    } finally {
      setIsAdjusting(false)
    }
  }

  // 統計
  const totalProducts = products.length
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= p.min_stock).length
  const outOfStockProducts = products.filter((p) => p.stock <= 0).length
  const totalValue = products.reduce((sum, p) => sum + p.stock * p.cost, 0)

  return (
    <div className="p-6 pt-16 lg:pt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">庫存管理</h1>
        <p className="text-muted-foreground">查看商品庫存狀態與調整庫存</p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">商品種類</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-warning/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">庫存不足</p>
                <p className="text-2xl font-bold text-warning">{lowStockProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">缺貨商品</p>
                <p className="text-2xl font-bold text-destructive">{outOfStockProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">庫存總值</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜尋 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋商品..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 庫存列表 */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>商品名稱</TableHead>
              <TableHead>規格</TableHead>
              <TableHead>供應商</TableHead>
              <TableHead className="text-right">成本</TableHead>
              <TableHead className="text-right">現有庫存</TableHead>
              <TableHead className="text-right">安全庫存</TableHead>
              <TableHead className="text-right">庫存價值</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead className="w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  尚無商品資料
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const isExpanded = expandedRows.has(product.id)
                const stockValue = product.stock * product.cost

                return (
                  <Collapsible key={product.id} asChild open={isExpanded}>
                    <>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleRow(product.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.variant || '-'}</TableCell>
                        <TableCell>{product.supplier || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.cost)}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              product.stock <= 0
                                ? 'text-destructive font-bold'
                                : product.stock <= product.min_stock
                                  ? 'text-warning font-bold'
                                  : 'font-medium'
                            }
                          >
                            {product.stock}
                            {product.unit && ` ${product.unit}`}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {product.min_stock}{product.unit && ` ${product.unit}`}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(stockValue)}
                        </TableCell>
                        <TableCell>
                          {product.stock <= 0 ? (
                            <Badge variant="destructive">缺貨</Badge>
                          ) : product.stock <= product.min_stock ? (
                            <Badge variant="outline" className="text-warning border-warning">
                              不足
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-success border-success">
                              正常
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openAdjustDialog(product, 'add')}
                              title="入庫"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openAdjustDialog(product, 'subtract')}
                              title="出庫"
                              disabled={product.stock <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={10} className="py-4">
                            <div className="grid grid-cols-4 gap-6 px-8">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">SKU</p>
                                <p className="font-medium">{product.sku || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">分類</p>
                                <p className="font-medium">{product.category || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">售價</p>
                                <p className="font-medium">{formatCurrency(product.price)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">毛利率</p>
                                <p className="font-medium">
                                  {product.price > 0 && product.cost > 0
                                    ? `${Math.round(((product.price - product.cost) / product.price) * 100)}%`
                                    : '-'}
                                </p>
                              </div>
                              {product.note && (
                                <div className="col-span-4">
                                  <p className="text-xs text-muted-foreground mb-1">備註</p>
                                  <p className="text-sm">{product.note}</p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 庫存調整對話框 */}
      <Dialog open={adjustDialog.open} onOpenChange={(open) => !open && setAdjustDialog({ open: false, product: null, type: 'add' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustDialog.type === 'add' ? '入庫' : '出庫'} - {adjustDialog.product?.name}
              {adjustDialog.product?.variant && ` (${adjustDialog.product.variant})`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">目前庫存</span>
              <span className="font-medium">
                {adjustDialog.product?.stock}
                {adjustDialog.product?.unit && ` ${adjustDialog.product.unit}`}
              </span>
            </div>
            <Field>
              <FieldLabel>
                {adjustDialog.type === 'add' ? '入庫' : '出庫'}數量
              </FieldLabel>
              <Input
                type="number"
                placeholder="輸入數量"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                min={1}
                max={adjustDialog.type === 'subtract' ? adjustDialog.product?.stock : undefined}
              />
            </Field>
            <Field>
              <FieldLabel>備註（選填）</FieldLabel>
              <Input
                placeholder="調整原因"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
              />
            </Field>
            {adjustQuantity && (
              <div className="flex items-center justify-between text-sm border-t pt-4">
                <span className="text-muted-foreground">調整後庫存</span>
                <span className="font-bold">
                  {adjustDialog.type === 'add'
                    ? (adjustDialog.product?.stock || 0) + parseInt(adjustQuantity || '0')
                    : (adjustDialog.product?.stock || 0) - parseInt(adjustQuantity || '0')}
                  {adjustDialog.product?.unit && ` ${adjustDialog.product.unit}`}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdjustDialog({ open: false, product: null, type: 'add' })}
            >
              取消
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={isAdjusting || !adjustQuantity}
              className={adjustDialog.type === 'add' ? 'bg-success hover:bg-success/90' : ''}
            >
              {isAdjusting ? '處理中...' : adjustDialog.type === 'add' ? '確認入庫' : '確認出庫'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
