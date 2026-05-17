'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import type { Order, OrderInsert, OrderItem } from '@/lib/types/order'
import { PAYMENT_STATUSES, SHIPPING_STATUSES, PAYMENT_METHODS, ORDER_TYPES } from '@/lib/types/order'
import { 
  PAYMENT_STATUS_LABELS, 
  SHIPPING_STATUS_LABELS, 
  PAYMENT_METHOD_LABELS,
  ORDER_TYPE_LABELS 
} from '@/lib/locale'
import { createOrder, updateOrder, getOrderItems } from '@/app/actions/orders'
import { ProductSelector } from './product-selector'
import { OrderItemsForm } from './order-items-form'

interface OrderFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: Order | null
  mode: 'create' | 'edit'
}

const emptyForm: OrderInsert = {
  date: null,
  batch: null,
  customer_name: null,
  product_name: null,
  spec: null,
  quantity: null,
  unit_price: null,
  total_price: null,
  cost: null,
  profit: null,
  supplier: null,
  source: null,
  payment_status: null,
  payment_method: null,
  shipping_status: null,
  shipping_fee: null,
  note: null,
  type: 'sale',
}

export function OrderFormDialog({ open, onOpenChange, order, mode }: OrderFormDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState<OrderInsert>(emptyForm)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  // 多商品模式
  const [isMultiItem, setIsMultiItem] = useState(false)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])

  // 表單重置：當 open 狀態改變或 mode 改變時執行
  useEffect(() => {
    if (!open) return // modal 關閉時不處理
    
    if (order && mode === 'edit') {
      setFormData({
        date: order.date,
        batch: order.batch,
        customer_name: order.customer_name,
        product_name: order.product_name,
        spec: order.spec,
        quantity: order.quantity,
        unit_price: order.unit_price,
        total_price: order.total_price,
        cost: order.cost,
        profit: order.profit,
        supplier: order.supplier,
        source: order.source,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        shipping_status: order.shipping_status,
        shipping_fee: order.shipping_fee,
        note: order.note,
        type: order.type || 'sale',
      })
      
      // 編輯模式：載入 order_items
      getOrderItems(order.id).then((items) => {
        if (items.length > 0) {
          setIsMultiItem(true)
          setOrderItems(items)
        } else {
          setIsMultiItem(false)
          setOrderItems([])
        }
      })
    } else if (mode === 'create') {
      // 新增模式：完全重置所有 state
      setFormData({ ...emptyForm })
      setSelectedProductId(null)
      setIsMultiItem(false)
      setOrderItems([])
    }
  }, [open, order, mode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        console.log('[v0] handleSubmit - starting')
        console.log('[v0] handleSubmit - formData:', JSON.stringify(formData, null, 2))
        console.log('[v0] handleSubmit - isMultiItem:', isMultiItem)
        console.log('[v0] handleSubmit - orderItems:', JSON.stringify(orderItems, null, 2))
        
        // 準備訂單資料（不再寫入 product_name, quantity, unit_price 到 orders 表）
        let submitData = { ...formData }
        
        // 清除舊欄位，這些欄位不再寫入 orders 表
        delete submitData.product_name
        delete submitData.quantity
        delete submitData.unit_price
        delete submitData.spec
        
        if (isMultiItem && orderItems.length > 0) {
          // 商品總額 = 所有商品小計加總（subtotal 是使用者輸入的最終值）
          const totalItemsAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0)
          // 總成本 = 商品總額（直接用 subtotal 加總，不再用 cost × quantity）
          const totalCost = totalItemsAmount
          const shippingFee = formData.shipping_fee ?? 0
          
          // 總金額 = 商品總額 + 運費
          submitData.total_price = totalItemsAmount + shippingFee
          submitData.cost = totalCost  // 保存總成本（= subtotal 加總）
          
          // 利潤計算（四捨五入為整數）- 只有銷貨才計算
          const orderType = formData.type || 'sale'
          const isSale = orderType === 'sale' || orderType === 'sale_return'
          if (isSale) {
            // 銷貨利潤 = (商品總額 + 運費) - 商品成本
            // 這裡的成本需要從 order_items.cost × quantity 計算
            const itemsCost = Math.round(orderItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0))
            submitData.profit = Math.round((totalItemsAmount + shippingFee) - itemsCost)
          } else {
            // 進貨不計算利潤
            submitData.profit = null
          }
        }
        
        // 一律傳入 orderItems（即使單商品模式也轉為 order_items）
        // 單商品小計也要四捨五入
        const itemsToSave = isMultiItem ? orderItems : (formData.product_name ? [{
          product_id: selectedProductId,
          product_name: formData.product_name,
          product_variant: formData.spec,
          quantity: formData.quantity || 0,
          unit_price: formData.unit_price || 0,
          cost: formData.cost || 0,
          subtotal: Math.round((formData.quantity || 0) * (formData.unit_price || 0)),
        }] : [])
        
        console.log('[v0] handleSubmit - submitData:', JSON.stringify(submitData, null, 2))
        console.log('[v0] handleSubmit - itemsToSave:', JSON.stringify(itemsToSave, null, 2))
        
        if (mode === 'edit' && order) {
          console.log('[v0] handleSubmit - calling updateOrder')
          await updateOrder(order.id, submitData, itemsToSave.length > 0 ? itemsToSave : undefined)
        } else {
          console.log('[v0] handleSubmit - calling createOrder')
          await createOrder(submitData, itemsToSave.length > 0 ? itemsToSave : undefined)
        }
        console.log('[v0] handleSubmit - order saved successfully')
        router.refresh()
        onOpenChange(false)
      } catch (err) {
        console.error('[v0] handleSubmit - error:', err)
        throw err
      }
    })
  }

  const updateField = <K extends keyof OrderInsert>(field: K, value: OrderInsert[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // 處理商品選擇（必須使用 product_id 對應，確保所有欄位來自同一商品）
  const handleProductSelect = (product: {
    id: string
    name: string
    variant: string | null
    cost: number
    price: number
    supplier: string | null
    unit: string | null
    stock: number
  } | null) => {
    if (product) {
      setSelectedProductId(product.id)
      const type = formData.type || 'sale'
      const isSale = type === 'sale' || type === 'sale_return'
      
      // 所有欄位必須來自同一個 product（依 product.id 取得）
      setFormData((prev) => ({
        ...prev,
        product_name: product.name,
        spec: product.variant,
        supplier: product.supplier || prev.supplier,
        unit_price: isSale ? product.price : product.cost,
        // 銷貨和進貨都必須帶入成本（用於利潤計算）
        cost: product.cost,
      }))
    } else {
      setSelectedProductId(null)
    }
  }

  // Auto-calculate total price and profit（單商品模式）
  useEffect(() => {
    // 多商品模式不使用此計算
    if (isMultiItem) return
    
    const quantity = formData.quantity ?? 0
    const unitPrice = formData.unit_price ?? 0
    const unitCost = formData.cost ?? 0
    const shippingFee = formData.shipping_fee ?? 0
    const type = formData.type || 'sale'
    const isPurchase = type === 'purchase' || type === 'purchase_return'
    
    let total: number
    let profit: number | null = null
    
// 商品總額 = 數量 × 單價（四捨五入為整數）
    const itemsAmount = Math.round(isPurchase ? (quantity * unitCost) : (quantity * unitPrice))
    
    if (isPurchase) {
      // 進貨單：總成本 = 商品總額 + 進貨運費
      total = itemsAmount + shippingFee
      profit = null
    } else {
      // 銷貨單：總金額 = 商品總額 + 銷售運費
      total = itemsAmount + shippingFee
      
      // 利潤 = (商品銷售總額 + 銷售運費) - 商品進貨成本
      const totalCost = Math.round(quantity * unitCost)
      if (type === 'sale') {
        profit = unitCost > 0 ? (itemsAmount + shippingFee) - totalCost : null
      } else if (type === 'sale_return') {
        profit = unitCost > 0 ? -((itemsAmount + shippingFee) - totalCost) : null
      }
    }
    
    setFormData((prev) => ({
      ...prev,
      total_price: total || null,
      profit: profit !== null ? Math.round(profit) : null,
    }))
  }, [formData.quantity, formData.unit_price, formData.cost, formData.shipping_fee, formData.type, isMultiItem])
  
  // 根據交易類型決定顯示的欄位提示
  const orderType = formData.type || 'sale'
  const isSaleType = orderType === 'sale' || orderType === 'sale_return'
  const isPurchaseType = orderType === 'purchase' || orderType === 'purchase_return'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? '新增訂單' : '編輯訂單'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="space-y-4">
            {/* Type and Date Row */}
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>交易類型</FieldLabel>
                <Select
                  value={formData.type || 'sale'}
                  onValueChange={(value) => updateField('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇類型" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {ORDER_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>日期</FieldLabel>
                <Input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => updateField('date', e.target.value || null)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>批次</FieldLabel>
                <Input
                  placeholder="輸入批次編號"
                  value={formData.batch || ''}
                  onChange={(e) => updateField('batch', e.target.value || null)}
                />
              </Field>
              <Field>
                <FieldLabel>來源</FieldLabel>
                <Input
                  placeholder="輸入訂單來源"
                  value={formData.source || ''}
                  onChange={(e) => updateField('source', e.target.value || null)}
                />
              </Field>
            </div>

            {/* 根據交易類型顯示客戶或供應商（完全切換，不可同時顯示） */}
            {isSaleType ? (
              <Field>
                <FieldLabel>
                  客戶名稱
                  <span className="text-destructive ml-1">*</span>
                </FieldLabel>
                <Input
                  placeholder="輸入客戶名稱"
                  value={formData.customer_name || ''}
                  onChange={(e) => updateField('customer_name', e.target.value || null)}
                  className="border-primary/50"
                />
              </Field>
            ) : (
              <Field>
                <FieldLabel>
                  供應商
                  <span className="text-destructive ml-1">*</span>
                </FieldLabel>
                <Input
                  placeholder="輸入供應商名稱"
                  value={formData.supplier || ''}
                  onChange={(e) => updateField('supplier', e.target.value || null)}
                  className="border-primary/50"
                />
                {!formData.supplier && (
                  <p className="text-xs text-warning mt-1">請先選擇供應商</p>
                )}
              </Field>
            )}

            {/* 多商品切換 */}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium">商品模式</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={!isMultiItem ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsMultiItem(false)}
                >
                  單一商品
                </Button>
                <Button
                  type="button"
                  variant={isMultiItem ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsMultiItem(true)}
                >
                  多商品
                </Button>
              </div>
            </div>

            {isMultiItem ? (
              /* 多商品模式 */
              <OrderItemsForm
                items={orderItems}
                onChange={setOrderItems}
                orderType={formData.type || 'sale'}
                selectedSupplier={formData.supplier}
              />
            ) : (
              /* 單商品模式 - 原有 UI */
              <>
                <Field>
                  <FieldLabel>選擇商品</FieldLabel>
                  <ProductSelector
                    value={selectedProductId}
                    onChange={handleProductSelect}
                    orderType={formData.type || 'sale'}
                    selectedSupplier={formData.supplier}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    選擇商品後自動帶入名稱、規格與{isSaleType ? '售價' : '成本'}
                  </p>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>產品名稱</FieldLabel>
                    <Input
                      placeholder="輸入產品名稱"
                      value={formData.product_name || ''}
                      onChange={(e) => updateField('product_name', e.target.value || null)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>規格</FieldLabel>
                    <Input
                      placeholder="輸入規格"
                      value={formData.spec || ''}
                      onChange={(e) => updateField('spec', e.target.value || null)}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>數量</FieldLabel>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.quantity ?? ''}
                      onChange={(e) => updateField('quantity', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>{isSaleType ? '售價 (NT$)' : '成本 (NT$)'}</FieldLabel>
                    <Input
                      type="number"
                      step={isPurchaseType ? "0.000001" : "0.01"}
                      inputMode="decimal"
                      min="0"
                      placeholder="0"
                      value={formData.unit_price ?? ''}
                      onChange={(e) => updateField('unit_price', e.target.value ? parseFloat(e.target.value) : null)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {isSaleType ? '每件商品的售價（可含小數）' : '每件商品的進貨成本（可含6位小數）'}
                    </p>
                  </Field>
                </div>
              </>
            )}

            {/* 單商品模式的成本欄位 */}
            {!isMultiItem && (
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>
                    {isPurchaseType ? '單件成本 (NT$)' : '成本 (NT$)'}
                    {isPurchaseType && <span className="text-destructive ml-1">*</span>}
                  </FieldLabel>
                  <Input
                    type="number"
                    step={isPurchaseType ? "0.000001" : "0.01"}
                    inputMode="decimal"
                    min="0"
                    placeholder={isPurchaseType ? '輸入單件進貨成本' : '銷貨成本'}
                    value={formData.cost ?? ''}
                    onChange={(e) => updateField('cost', e.target.value ? parseFloat(e.target.value) : null)}
                    className={isPurchaseType ? 'border-primary/50' : ''}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isPurchaseType ? '每件商品的進貨成本（可含6位小數）' : '銷貨成本（可含小數）'}
                  </p>
                </Field>
                <Field>
                  <FieldLabel>運費 (NT$)</FieldLabel>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.shipping_fee ?? ''}
                    onChange={(e) => updateField('shipping_fee', e.target.value ? parseInt(e.target.value) : null)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    運費會加入總金額
                  </p>
                </Field>
              </div>
            )}

            {/* 多商品模式只顯示運費 */}
            {isMultiItem && (
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>運費 (NT$)</FieldLabel>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.shipping_fee ?? ''}
                    onChange={(e) => updateField('shipping_fee', e.target.value ? parseInt(e.target.value) : null)}
                  />
                </Field>
                <Field>
                  <FieldLabel>總金額 (NT$)</FieldLabel>
                  <Input
                    type="number"
                    placeholder="自動計算"
                    value={(orderItems.reduce((sum, item) => sum + item.subtotal, 0) + (formData.shipping_fee ?? 0)) || ''}
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    商品金額 + 運費
                  </p>
                </Field>
              </div>
            )}

            {/* 單商品模式的總金額和利潤 */}
            {!isMultiItem && (
              <div className={isPurchaseType ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-2 gap-4'}>
                <Field>
                  <FieldLabel>{isPurchaseType ? '總成本 (NT$)' : '總金額 (NT$)'}</FieldLabel>
                  <Input
                    type="number"
                    placeholder="自動計算"
                    value={formData.total_price ?? ''}
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isPurchaseType ? '(數量 × 單件成本) + 運費' : '(數量 × 單價) + 運費'}
                  </p>
                </Field>
                {isSaleType && (
                  <Field>
                    <FieldLabel>利潤 (NT$)</FieldLabel>
                    <Input
                      type="number"
                      placeholder="自動計算"
                      value={formData.profit ?? ''}
                      readOnly
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      (商品金額 + 運費) - 成本
                    </p>
                  </Field>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <Field>
                <FieldLabel>付款狀態</FieldLabel>
                <Select
                  value={formData.payment_status || ''}
                  onValueChange={(value) => updateField('payment_status', value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇狀態" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {PAYMENT_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>付款方式</FieldLabel>
                <Select
                  value={formData.payment_method || ''}
                  onValueChange={(value) => updateField('payment_method', value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇方式" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {PAYMENT_METHOD_LABELS[method]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>出貨狀態</FieldLabel>
                <Select
                  value={formData.shipping_status || ''}
                  onValueChange={(value) => updateField('shipping_status', value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇狀態" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPPING_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {SHIPPING_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel>備註</FieldLabel>
              <Textarea
                placeholder="輸入備註內容"
                value={formData.note || ''}
                onChange={(e) => updateField('note', e.target.value || null)}
                rows={3}
              />
            </Field>
          </FieldGroup>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner className="mr-2" />}
              {mode === 'create' ? '建立訂單' : '儲存變更'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
