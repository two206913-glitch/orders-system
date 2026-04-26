'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Check, ChevronsUpDown, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getProductsForSelect } from '@/app/actions/products'
import { formatCurrency } from '@/lib/locale'

interface ProductOption {
  id: string
  name: string
  variant: string | null
  cost: number
  price: number
  supplier: string | null
  unit: string | null
  stock: number
}

interface ProductSelectorProps {
  value: string | null
  onChange: (product: ProductOption | null) => void
  orderType?: string
  disabled?: boolean
  selectedSupplier?: string | null  // 已選擇的供應商（進貨時用）
}

export function ProductSelector({
  value,
  onChange,
  orderType = 'sale',
  disabled = false,
  selectedSupplier = null,
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(false)
  const [showWarning, setShowWarning] = useState(false)

  const isPurchase = orderType === 'purchase' || orderType === 'purchase_return'

  // 每次打開下拉選單時重新 fetch 最新商品資料
  // 直接從 products 表讀取 stock，確保與商品管理頁顯示一致
  useEffect(() => {
    if (open) {
      setLoading(true)
      getProductsForSelect()
        .then(setProducts)
        .finally(() => setLoading(false))
    }
  }, [open])
  
  // 初始載入（用於顯示已選擇的商品名稱）
  useEffect(() => {
    if (value && products.length === 0) {
      getProductsForSelect().then(setProducts)
    }
  }, [value, products.length])

  // 進貨時依供應商排序：優先顯示該供應商商品
  const sortedProducts = useMemo(() => {
    if (!isPurchase || !selectedSupplier) return products
    
    return [...products].sort((a, b) => {
      const aMatch = a.supplier === selectedSupplier
      const bMatch = b.supplier === selectedSupplier
      if (aMatch && !bMatch) return -1
      if (!aMatch && bMatch) return 1
      return 0
    })
  }, [products, selectedSupplier, isPurchase])

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === value) || null
  }, [products, value])

  const displayName = useMemo(() => {
    if (!selectedProduct) return '選擇商品...'
    return selectedProduct.variant
      ? `${selectedProduct.name} - ${selectedProduct.variant}`
      : selectedProduct.name
  }, [selectedProduct])

  const isSaleType = orderType === 'sale' || orderType === 'sale_return'

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{displayName}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜尋商品..." />
          <CommandList>
            <CommandEmpty>找不到商品</CommandEmpty>
            <CommandGroup>
              {sortedProducts.map((product) => {
                const name = product.variant
                  ? `${product.name} - ${product.variant}`
                  : product.name
                const priceDisplay = isSaleType
                  ? `售價: ${formatCurrency(product.price)}`
                  : `成本: ${formatCurrency(product.cost)}`
                
                // 進貨時檢查是否為該供應商商品
                const isSupplierMatch = !isPurchase || !selectedSupplier || product.supplier === selectedSupplier

                return (
                  <CommandItem
                    key={product.id}
                    value={`${product.name} ${product.variant || ''}`}
                    onSelect={() => {
                      // 如果選擇非該供應商商品，顯示提示
                      if (isPurchase && selectedSupplier && product.supplier !== selectedSupplier) {
                        setShowWarning(true)
                      } else {
                        setShowWarning(false)
                      }
                      onChange(product.id === value ? null : product)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex items-center justify-between py-3",
                      !isSupplierMatch && "opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          'h-4 w-4',
                          value === product.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div>
                        <div className="font-medium">
                          {name}
                          {isPurchase && selectedSupplier && product.supplier === selectedSupplier && (
                            <span className="ml-2 text-xs text-success">(預設供應商)</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {priceDisplay} · 庫存: {product.stock}{product.unit || ''}
                          {product.supplier && ` · ${product.supplier}`}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
      {showWarning && (
        <p className="text-xs text-warning mt-1">
          此商品預設供應商不是目前選擇，請確認是否仍要使用
        </p>
      )}
    </>
  )
}
