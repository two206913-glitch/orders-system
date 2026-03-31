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
import type { Order, OrderInsert } from '@/lib/types/order'
import { PAYMENT_STATUSES, SHIPPING_STATUSES, PAYMENT_METHODS } from '@/lib/types/order'
import { PAYMENT_STATUS_LABELS, SHIPPING_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/locale'
import { createOrder, updateOrder } from '@/app/actions/orders'

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
  supplier: null,
  source: null,
  payment_status: null,
  payment_method: null,
  shipping_status: null,
  note: null,
}

export function OrderFormDialog({ open, onOpenChange, order, mode }: OrderFormDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState<OrderInsert>(emptyForm)

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
        supplier: order.supplier,
        source: order.source,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        shipping_status: order.shipping_status,
        note: order.note,
      })
    } else if (mode === 'create') {
      setFormData(emptyForm)
    }
  }, [order, mode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      if (mode === 'edit' && order) {
        await updateOrder(order.id, formData)
      } else {
        await createOrder(formData)
      }
      router.refresh()
      onOpenChange(false)
    })
  }

  const updateField = <K extends keyof OrderInsert>(field: K, value: OrderInsert[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Auto-calculate total price when quantity or unit price changes
  useEffect(() => {
    if (formData.quantity !== null && formData.unit_price !== null) {
      setFormData((prev) => ({
        ...prev,
        total_price: (prev.quantity ?? 0) * (prev.unit_price ?? 0),
      }))
    }
  }, [formData.quantity, formData.unit_price])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? '新增訂單' : '編輯訂單'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>日期</FieldLabel>
                <Input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => updateField('date', e.target.value || null)}
                />
              </Field>
              <Field>
                <FieldLabel>批次</FieldLabel>
                <Input
                  placeholder="輸入批次編號"
                  value={formData.batch || ''}
                  onChange={(e) => updateField('batch', e.target.value || null)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>客戶名稱</FieldLabel>
                <Input
                  placeholder="輸入客戶名稱"
                  value={formData.customer_name || ''}
                  onChange={(e) => updateField('customer_name', e.target.value || null)}
                />
              </Field>
              <Field>
                <FieldLabel>供應商</FieldLabel>
                <Input
                  placeholder="輸入供應商名稱"
                  value={formData.supplier || ''}
                  onChange={(e) => updateField('supplier', e.target.value || null)}
                />
              </Field>
            </div>

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

            <div className="grid grid-cols-3 gap-4">
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
              <Field>
                <FieldLabel>總價 (NT$)</FieldLabel>
                <Input
                  type="number"
                  placeholder="自動計算"
                  value={formData.total_price ?? ''}
                  onChange={(e) => updateField('total_price', e.target.value ? parseInt(e.target.value) : null)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>來源</FieldLabel>
              <Input
                placeholder="輸入訂單來源"
                value={formData.source || ''}
                onChange={(e) => updateField('source', e.target.value || null)}
              />
            </Field>

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
