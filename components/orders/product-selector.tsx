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
}

export function ProductSelector({
  value,
  onChange,
  orderType = 'sale',
  disabled = false,
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProductsForSelect()
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [])

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
              {products.map((product) => {
                const name = product.variant
                  ? `${product.name} - ${product.variant}`
                  : product.name
                const priceDisplay = isSaleType
                  ? `售價: ${formatCurrency(product.price)}`
                  : `成本: ${formatCurrency(product.cost)}`

                return (
                  <CommandItem
                    key={product.id}
                    value={`${product.name} ${product.variant || ''}`}
                    onSelect={() => {
                      onChange(product.id === value ? null : product)
                      setOpen(false)
                    }}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          'h-4 w-4',
                          value === product.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div>
                        <div className="font-medium">{name}</div>
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
  )
}
