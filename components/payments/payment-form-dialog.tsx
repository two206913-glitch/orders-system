'use client'

import { useState, useEffect } from 'react'
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
import { Field, FieldLabel } from '@/components/ui/field'
import { Checkbox } from '@/components/ui/checkbox'
import { Check } from 'lucide-react'
import { createPayment, updatePayment } from '@/app/actions/payments'
import type { Payment, PaymentInsert } from '@/lib/types/payment'
import { PAYMENT_METHODS } from '@/lib/types/order'
import { PAYMENT_METHOD_LABELS, formatCurrency, formatDate } from '@/lib/locale'
import { toast } from 'sonner'

interface UnsettledOrder {
  id: string
  date: string
  type: string
  total_price: number
  display_amount: number
  note: string | null
  items: {
    product_name: string
    product_variant: string | null
    quantity: number
  }[]
}

interface PaymentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment?: Payment | null
  type?: 'receipt' | 'payment'
  defaultType?: 'receipt' | 'payment'
  defaultParty?: string
  defaultPartyName?: string
  suggestedAmount?: number
  maxAmount?: number // 最大可收/付金額（應收/應付餘額）
  onSuccess?: () => void
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  payment,
  type,
  defaultType = 'receipt',
  defaultParty = '',
  defaultPartyName = '',
  suggestedAmount,
  maxAmount,
  onSuccess,
}: PaymentFormDialogProps) {
  const router = useRouter()
  const isEditing = !!payment

  const effectiveType = type || defaultType
  const effectiveParty = defaultPartyName || defaultParty
  
  const [formData, setFormData] = useState<PaymentInsert>({
    type: effectiveType,
    party_name: effectiveParty,
    amount: suggestedAmount || 0,
    payment_method: null,
    date: new Date().toISOString().split('T')[0],
    note: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 結清訂單相關狀態（僅用於收款單編輯時顯示）
  const [settledOrders, setSettledOrders] = useState<UnsettledOrder[]>([])
  const [settledOrderIds, setSettledOrderIds] = useState<Set<string>>(new Set())

  // 載入當初結清的訂單（僅編輯收款單時）
  useEffect(() => {
    if (open && isEditing && payment && payment.type === 'receipt') {
      loadSettledOrders(payment.id, payment.party_name)
    } else {
      setSettledOrders([])
      setSettledOrderIds(new Set())
    }
  }, [open, isEditing, payment])

  const loadSettledOrders = async (receiptId: string, customerName: string) => {
    try {
      // 1. 取得當初結清的訂單 ID
      const settlementsRes = await fetch(`/api/receipt-settlements?receipt_id=${receiptId}`)
      const settlementsData = await settlementsRes.json()
      const orderIds = settlementsData.order_ids || []
      
      if (orderIds.length === 0) {
        setSettledOrders([])
        setSettledOrderIds(new Set())
        return
      }
      
      // 2. 取得這些訂單的詳細資料（從 unsettled-orders API，但這些訂單已結清）
      // 需要另外查詢，因為 unsettled-orders 只會回傳未結清的
      const ordersRes = await fetch(`/api/settled-orders?ids=${orderIds.join(',')}`)
      const ordersData = await ordersRes.json()
      
      setSettledOrders(ordersData.orders || [])
      setSettledOrderIds(new Set(orderIds))
    } catch (error) {
      console.error('Failed to load settled orders:', error)
      setSettledOrders([])
      setSettledOrderIds(new Set())
    }
  }

  useEffect(() => {
    if (payment) {
      setFormData({
        type: payment.type,
        party_name: payment.party_name,
        amount: payment.amount,
        payment_method: payment.payment_method,
        date: payment.date,
        note: payment.note,
      })
    } else {
      setFormData({
        type: effectiveType,
        party_name: effectiveParty,
        amount: suggestedAmount || 0,
        payment_method: null,
        date: new Date().toISOString().split('T')[0],
        note: null,
      })
    }
  }, [payment, effectiveType, effectiveParty, suggestedAmount, open])

  const updateField = <K extends keyof PaymentInsert>(
    field: K,
    value: PaymentInsert[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 金額驗證：不可超過最大可收/付金額
    if (maxAmount !== undefined && formData.amount > maxAmount) {
      toast.error(`金額不可超過 ${formatCurrency(maxAmount)}`)
      return
    }
    
    // 金額不可為負數
    if (formData.amount <= 0) {
      toast.error('金額必須大於 0')
      return
    }
    
    setIsSubmitting(true)

    try {
      if (isEditing && payment) {
        await updatePayment({ id: payment.id, ...formData })
        toast.success('更新成功')
      } else {
        await createPayment(formData)
        toast.success(isReceipt ? '收款已記錄' : '付款已記錄')
      }
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to save payment:', error)
      toast.error('儲存失敗')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isReceipt = formData.type === 'receipt'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle>
            {isEditing ? '編輯' : '新增'}
            {isReceipt ? '收款單' : '付款單'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 w-full max-w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel>類型</FieldLabel>
                <Select
                  value={formData.type}
                  onValueChange={(value) => updateField('type', value as 'receipt' | 'payment')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receipt">收款（客戶付款）</SelectItem>
                    <SelectItem value="payment">付款（付給供應商）</SelectItem>
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

            <Field>
              <FieldLabel>{isReceipt ? '客戶名稱' : '供應商名稱'}</FieldLabel>
              <Input
                placeholder={isReceipt ? '輸入客戶名稱' : '輸入供應商名稱'}
                value={formData.party_name}
                onChange={(e) => updateField('party_name', e.target.value)}
                required
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel>金額 (NT$)</FieldLabel>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.amount || ''}
                  onChange={(e) => updateField('amount', e.target.value ? parseInt(e.target.value) : 0)}
                  required
                  min={1}
                  max={maxAmount}
                />
                {maxAmount !== undefined && maxAmount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {isReceipt ? '未收餘額' : '未付餘額'}：{formatCurrency(maxAmount)}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel>付款方式</FieldLabel>
                <Select
                  value={formData.payment_method || ''}
                  onValueChange={(value) => updateField('payment_method', value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇付款方式" />
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
            </div>

            <Field>
              <FieldLabel>備註</FieldLabel>
              <Textarea
                placeholder="輸入備註..."
                value={formData.note || ''}
                onChange={(e) => updateField('note', e.target.value || null)}
                rows={2}
              />
            </Field>

            {/* 顯示當初結清的訂單（僅編輯收款單時顯示） */}
            {isEditing && isReceipt && settledOrders.length > 0 && (
              <div className="space-y-2 w-full max-w-full min-w-0 overflow-hidden">
                <FieldLabel>此收款結清的訂單</FieldLabel>
                <div className="border rounded-lg divide-y max-h-52 overflow-y-auto w-full max-w-full min-w-0 overflow-hidden">
                  {settledOrders.map(order => (
                    <div
                      key={order.id}
                      className="flex items-start gap-3 p-3 bg-success/5 w-full max-w-full min-w-0 overflow-hidden"
                    >
                      <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {formatDate(order.date)}
                            </span>
                            {order.type === 'sale_return' && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                                銷退
                              </span>
                            )}
                          </div>
                          <span className={`font-medium flex-shrink-0 ${order.display_amount < 0 ? 'text-destructive' : ''}`}>
                            {formatCurrency(order.display_amount)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground break-words whitespace-normal">
                          {order.items.length > 0 
                            ? order.items.map(item => 
                                `${item.product_name}${item.product_variant ? ` (${item.product_variant})` : ''} x${item.quantity}`
                              ).join('、')
                            : '(無商品明細)'
                          }
                        </div>
                        {order.note && (
                          <div className="text-xs text-muted-foreground mt-1 break-words whitespace-normal">
                            備註：{order.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  共 {settledOrders.length} 筆訂單，合計 {formatCurrency(settledOrders.reduce((sum, o) => sum + o.display_amount, 0))}
                </p>
              </div>
            )}
          </div>

          {/* 底部按鈕區 */}
          <div className="shrink-0 border-t bg-background px-6 py-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '儲存中...' : isEditing ? '儲存變更' : '新增'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
