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
import { createPayment, updatePayment } from '@/app/actions/payments'
import type { Payment, PaymentInsert } from '@/lib/types/payment'
import { PAYMENT_METHODS } from '@/lib/types/order'
import { PAYMENT_METHOD_LABELS, formatCurrency } from '@/lib/locale'
import { toast } from 'sonner'

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '編輯' : '新增'}
            {isReceipt ? '收款單' : '付款單'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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
              rows={3}
            />
          </Field>

          <div className="flex justify-end gap-3 pt-4">
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
