'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Package, Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { getProducts, getProductCategories, getProductSuppliers, deleteProduct, toggleProductStatus } from '@/app/actions/products'
import { toast } from 'sonner'
import { ProductFormDialog } from '@/components/products/product-form-dialog'
import { formatCurrency } from '@/lib/locale'
import type { Product } from '@/lib/types/product'

export default function ProductsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const supplier = searchParams.get('supplier') || ''

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [productsData, categoriesData, suppliersData] = await Promise.all([
        getProducts({ search, category, supplier, showInactive }),
        getProductCategories(),
        getProductSuppliers(),
      ])
      setProducts(productsData)
      setCategories(categoriesData)
      setSuppliers(suppliersData)
    } finally {
      setLoading(false)
    }
  }, [search, category, supplier, showInactive])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    router.push(`?${params.toString()}`)
  }

  const handleCategoryFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set('category', value)
    } else {
      params.delete('category')
    }
    router.push(`?${params.toString()}`)
  }

  const handleSupplierFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set('supplier', value)
    } else {
      params.delete('supplier')
    }
    router.push(`?${params.toString()}`)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setShowFormDialog(true)
  }

  const handleDelete = async (product: Product) => {
    if (!confirm(`確定要刪除商品「${product.name}${product.variant ? ` - ${product.variant}` : ''}」嗎？\n\n注意：若商品已有訂單紀錄，將無法刪除。`)) {
      return
    }
    try {
      await deleteProduct(product.id)
      toast.success('商品已刪除')
      loadData()
    } catch (error) {
      console.error('Error deleting product:', error)
      const errorMessage = error instanceof Error ? error.message : '刪除商品失敗'
      toast.error(errorMessage)
    }
  }

  const [togglingId, setTogglingId] = useState<string | null>(null)
  
  const handleToggleStatus = async (product: Product) => {
    setTogglingId(product.id)
    try {
      await toggleProductStatus(product.id, !product.is_active)
      toast.success(product.is_active ? '商品已停用' : '商品已啟用')
      loadData()
    } catch (error) {
      console.error('Error toggling product status:', error)
      toast.error('狀態更新失敗')
    } finally {
      setTogglingId(null)
    }
  }

  const handleFormClose = () => {
    setShowFormDialog(false)
    setEditingProduct(null)
  }

  const handleFormSuccess = () => {
    handleFormClose()
    loadData()
  }

  // 統計
  const totalProducts = products.length
  const activeProducts = products.filter((p) => p.is_active).length

  return (
    <div className="p-6 pt-16 lg:pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">商品管理</h1>
          <p className="text-muted-foreground">管理商品資料、成本與售價</p>
        </div>
        <Button onClick={() => setShowFormDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新增商品
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">商品總數</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-success/10 rounded-lg">
                <Package className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">啟用中</p>
                <p className="text-2xl font-bold text-success">{activeProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 篩選 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋商品..."
            className="pl-9"
            defaultValue={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Select defaultValue={category || 'all'} onValueChange={handleCategoryFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="分類" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分類</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select defaultValue={supplier || 'all'} onValueChange={handleSupplierFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="供應商" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部供應商</SelectItem>
            {suppliers.map((sup) => (
              <SelectItem key={sup} value={sup}>
                {sup}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showInactive ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
          {showInactive ? '顯示全部' : '僅啟用'}
        </Button>
      </div>

      {/* 商品列表 */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>商品名稱</TableHead>
              <TableHead>規格</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>分類</TableHead>
              <TableHead>供應商</TableHead>
              <TableHead className="text-right">成本</TableHead>
              <TableHead className="text-right">售價</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead className="w-[70px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  尚無商品資料
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id} className={!product.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.variant || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{product.sku || '-'}</TableCell>
                  <TableCell>{product.category || '-'}</TableCell>
                  <TableCell>{product.supplier || '-'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(product.cost)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={togglingId === product.id}
                      onClick={() => handleToggleStatus(product)}
                      className={product.is_active 
                        ? 'text-warning border-warning hover:bg-warning/10' 
                        : 'text-success border-success hover:bg-success/10'
                      }
                    >
                      {togglingId === product.id ? (
                        <span className="animate-spin mr-1">...</span>
                      ) : product.is_active ? (
                        <>
                          <EyeOff className="h-3 w-3 mr-1" />
                          停用
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          啟用
                        </>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(product)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          編輯
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(product)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          刪除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 商品表單 */}
      <ProductFormDialog
        open={showFormDialog}
        onOpenChange={handleFormClose}
        product={editingProduct}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}
