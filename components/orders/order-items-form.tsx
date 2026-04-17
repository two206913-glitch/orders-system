'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import { ProductSelector } from './product-selector'
import type { OrderItem } from '@/lib/types/order'
import { formatCurrency } from '@/lib/locale'

interface OrderItemsFormProps {
  items: OrderItem[]
  onChange: (items: OrderItem[]) => void
  orderType: string
}

export function OrderItemsForm({ items, onChange, orderType }: OrderItemsFormProps) {
  const isPurchase = orderType === 'purchase' || orderType === 'purchase_return'
  const isSale = orderType === 'sale' || orderType === 'sale_return'

  const addItem = () => {
    onChange([
      ...items,
      {
        product_id: null,
        product_name: '',
        product_variant: null,
        quantity: 1,
        unit_price: 0,
        cost: 0,
        subtotal: 0,
      },
    ])
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof OrderItem, value: string | number | null) => {
    const newItems = [...items]
    const item = { ...newItems[index], [field]: value }
    
    // 自動計算小計
    if (field === 'quantity' || field === 'unit_price' || field === 'cost') {
      const qty = field === 'quantity' ? (value as number) : item.quantity
      if (isPurchase) {
        // 進貨：小計 = 數量 × 成本
        const cost = field === 'cost' ? (value as number) : item.cost
        item.subtotal = qty * cost
      } else {
        // 銷貨：小計 = 數量 × 單價
        const price = field === 'unit_price' ? (value as number) : item.unit_price
        item.subtotal = qty * price
      }
    }
    
    newItems[index] = item
    onChange(newItems)
  }

  const handleProductSelect = (
    index: number,
    product: {
      id: string
      name: string
      variant: string | null
      cost: number
      price: number
      supplier: string | null
      unit: string | null
      stock: number
    } | null
  ) => {
    if (!product) return

    const newItems = [...items]
    const item = newItems[index]
    
    item.product_id = product.id
    item.product_name = product.name
    item.product_variant = product.variant
    item.cost = product.cost
    item.unit_price = isPurchase ? product.cost : product.price
    
    // 計算小計
    if (isPurchase) {
      item.subtotal = item.quantity * item.cost
    } else {
      item.subtotal = item.quantity * item.unit_price
    }
    
    onChange(newItems)
  }

  // 計算總計
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0)
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">商品項目</h4>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4 mr-1" />
          新增商品
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <p className="text-muted-foreground text-sm">尚未添加商品</p>
          <Button type="button" variant="link" onClick={addItem}>
            點擊新增第一個商品
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <ProductSelector
                    value={item.product_id}
                    onChange={(product) => handleProductSelect(index, product)}
                    orderType={orderType}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {item.product_name && (
                <div className="text-sm text-muted-foreground">
                  {item.product_name}
                  {item.product_variant && ` - ${item.product_variant}`}
                </div>
              )}

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">數量</label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
                {isSale && (
                  <div>
                    <label className="text-xs text-muted-foreground">單價</label>
                    <Input
                      type="number"
                      min={0}
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseInt(e.target.value) || 0)}
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground">{isPurchase ? '單件成本' : '成本'}</label>
                  <Input
                    type="number"
                    min={0}
                    value={item.cost}
                    onChange={(e) => updateItem(index, 'cost', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">小計</label>
                  <Input
                    type="number"
                    value={item.subtotal}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="flex justify-end gap-6 pt-2 border-t">
          <div className="text-sm">
            <span className="text-muted-foreground">總數量：</span>
            <span className="font-medium ml-1">{totalQuantity}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">{isPurchase ? '總成本' : '商品金額'}：</span>
            <span className="font-medium ml-1">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
