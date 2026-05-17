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
  selectedSupplier?: string | null  // 進貨時已選擇的供應商
}

export function OrderItemsForm({ items, onChange, orderType, selectedSupplier }: OrderItemsFormProps) {
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
    
    // 進貨單：當修改數量或單件成本時，自動計算小計
    // 銷貨單：當修改數量或售價時，自動計算小計
    if (field === 'quantity' || field === 'unit_price') {
      const qty = field === 'quantity' ? (value as number) : item.quantity
      const price = field === 'unit_price' ? (value as number) : item.unit_price
      // 小計四捨五入為整數
      item.subtotal = Math.round(qty * price)
      
      // 進貨單：同步更新 cost
      if (isPurchase && field === 'unit_price') {
        item.cost = value as number
      }
    }
    
    newItems[index] = item
    onChange(newItems)
  }

  // 進貨單專用：直接輸入總成本，反推單件成本
  const updateSubtotalDirectly = (index: number, subtotalValue: number) => {
    const newItems = [...items]
    const item = { ...newItems[index] }
    
    // 直接設定 subtotal 為使用者輸入的值（整數）
    item.subtotal = Math.round(subtotalValue)
    
    // 反推單件成本 = 總成本 / 數量（可為小數）
    if (item.quantity > 0) {
      item.cost = subtotalValue / item.quantity
      item.unit_price = item.cost  // 進貨單的 unit_price = cost
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
    // 進貨時 unit_price = cost，銷貨時 unit_price = price
    item.unit_price = isPurchase ? product.cost : product.price
    item.cost = product.cost  // 保留成本用於利潤計算
    
    // 計算小計（統一用 unit_price，四捨五入為整數）
    item.subtotal = Math.round(item.quantity * item.unit_price)
    
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
                    selectedSupplier={selectedSupplier}
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

              <div className={`grid ${isPurchase ? 'grid-cols-4' : 'grid-cols-4'} gap-3`}>
                <div>
                  <label className="text-xs text-muted-foreground">數量</label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
                {/* 銷貨顯示售價，進貨顯示單件成本（可輸入小數） */}
                <div>
                  <label className="text-xs text-muted-foreground">
                    {isSale ? '售價' : '單件成本'}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                  />
                  {isPurchase && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.cost > 0 ? `反推: ${item.cost.toFixed(6)}` : ''}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    {isPurchase ? '總成本' : '小計'}
                  </label>
                  {isPurchase ? (
                    // 進貨單：總成本可直接輸入
                    <Input
                      type="number"
                      min={0}
                      value={item.subtotal}
                      onChange={(e) => updateSubtotalDirectly(index, parseInt(e.target.value) || 0)}
                      className="border-primary/50"
                    />
                  ) : (
                    // 銷貨單：小計為唯讀
                    <Input
                      type="number"
                      value={item.subtotal}
                      readOnly
                      className="bg-muted"
                    />
                  )}
                  {isPurchase && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      可直接輸入
                    </p>
                  )}
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
