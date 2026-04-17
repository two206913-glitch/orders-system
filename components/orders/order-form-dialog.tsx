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
import { createOrder, updateOrder } from '@/app/actions/orders'
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

  useEffect(() => {
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
    } else if (mode === 'create') {
      setFormData(emptyForm)
      setIsMultiItem(false)
      setOrderItems([])
    }
  }, [order, mode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      // 多商品模式時計算總金額
      let submitData = { ...formData }
      if (isMultiItem && orderItems.length > 0) {
        const totalItemsAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0)
        const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0)
        const shippingFee = formData.shipping_fee ?? 0
        submitData.total_price = totalItemsAmount + shippingFee
        submitData.quantity = totalQuantity
        // 合併商品名稱顯示
        submitData.product_name = orderItems.map(i => i.product_name).join(', ')
      }
      
      if (mode === 'edit' && order) {
        await updateOrder(order.id, submitData, isMultiItem ? orderItems : undefined)
      } else {
        await createOrder(submitData, isMultiItem ? orderItems : undefined)
      }
      router.refresh()
      onOpenChange(false)
    })
  }

  const updateField = <K extends keyof OrderInsert>(field: K, value: OrderInsert[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // 處理商品選擇
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
      
      setFormData((prev) => ({
        ...prev,
        product_name: product.name,
        spec: product.variant,
        supplier: product.supplier || prev.supplier,
        unit_price: isSale ? product.price : product.cost,
        // 進貨時自動帶入成本
        cost: !isSale ? product.cost : prev.cost,
      }))
    } else {
      setSelectedProductId(null)
    }
  }

  // Auto-calculate total price and profit
  useEffect(() => {
    const quantity = formData.quantity ?? 0
    const unitPrice = formData.unit_price ?? 0
    const unitCost = formData.cost ?? 0 // 進貨時為單件成本
    const shippingFee = formData.shipping_fee ?? 0
    const type = formData.type || 'sale'
    const isPurchase = type === 'purchase' || type === 'purchase_return'
    
    let total: number
    let profit: number | null = null
    
    if (isPurchase) {
      // 進貨單：總成本 = 數量 × 單件成本 + 運費
      total = (quantity * unitCost) + shippingFee
      // 進貨不計算利潤
      profit = null
    } else {
      // 銷貨單：總金額 = 數量 × 單價 + 運費
      const subtotal = quantity * unitPrice
      total = subtotal + shippingFee
      
      // 銷貨利潤計算
      if (type === 'sale') {
        profit = unitCost > 0 ? total - (quantity * unitCost) : null
      } else if (type === 'sale_return') {
        profit = unitCost > 0 ? -((total) - (quantity * unitCost)) : null
      }
    }
    
    setFormData((prev) => ({
      ...prev,
      total_price: total || null,
      profit,
    }))
  }, [formData.quantity, formData.unit_price, formData.cost, formData.shipping_fee, formData.type])
  
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

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>
                  客戶名稱
                  {isSaleType && <span className="text-destructive ml-1">*</span>}
                </FieldLabel>
                <Input
                  placeholder="輸入客戶名稱"
                  value={formData.customer_name || ''}
                  onChange={(e) => updateField('customer_name', e.target.value || null)}
                  className={isSaleType ? 'border-primary/50' : ''}
                />
              </Field>
              <Field>
                <FieldLabel>
                  供應商
                  {isPurchaseType && <span className="text-destructive ml-1">*</span>}
                </FieldLabel>
                <Input
                  placeholder="輸入供應商名稱"
                  value={formData.supplier || ''}
                  onChange={(e) => updateField('supplier', e.target.value || null)}
                  className={isPurchaseType ? 'border-primary/50' : ''}
                />
              </Field>
            </div>

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
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    選擇商品後自動帶入名稱、規格與價格
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
                    <FieldLabel>單價 (NT$)</FieldLabel>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.unit_price ?? ''}
                      onChange={(e) => updateField('unit_price', e.target.value ? parseInt(e.target.value) : null)}
                    />
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
                    placeholder={isPurchaseType ? '輸入單件進貨成本' : '銷貨成本'}
                    value={formData.cost ?? ''}
                    onChange={(e) => updateField('cost', e.target.value ? parseInt(e.target.value) : null)}
                    className={isPurchaseType ? 'border-primary/50' : ''}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isPurchaseType ? '每件商品的進貨成本' : '銷貨成本'}
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
                      總金額 - (數量 × 成本)
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
