'use client'

import { useState, useEffect } from 'react'
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
import { createProduct, updateProduct, getProductSuppliers } from '@/app/actions/products'
import type { Product, ProductInsert } from '@/lib/types/product'
import { PRODUCT_UNITS } from '@/lib/types/product'

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  onSuccess: () => void
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductFormDialogProps) {
  const isEditing = !!product

  const [formData, setFormData] = useState<ProductInsert>({
    name: '',
    variant: null,
    cost: 0,
    price: 0,
    supplier: null,
    stock: 0,
    min_stock: 0,
    sku: null,
    category: null,
    unit: '個',
    note: null,
    is_active: true,
  })
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    getProductSuppliers().then(setSuppliers)
  }, [])

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        variant: product.variant,
        cost: product.cost,
        price: product.price,
        supplier: product.supplier,
        stock: product.stock,
        min_stock: product.min_stock,
        sku: product.sku,
        category: product.category,
        unit: product.unit,
        note: product.note,
        is_active: product.is_active,
      })
    } else {
      setFormData({
        name: '',
        variant: null,
        cost: 0,
        price: 0,
        supplier: null,
        stock: 0,
        min_stock: 0,
        sku: null,
        category: null,
        unit: '個',
        note: null,
        is_active: true,
      })
    }
  }, [product, open])

  const updateField = <K extends keyof ProductInsert>(
    field: K,
    value: ProductInsert[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('請輸入商品名稱')
      return
    }

    setIsSubmitting(true)
    try {
      if (isEditing && product) {
        await updateProduct({ id: product.id, ...formData })
      } else {
        await createProduct(formData)
      }
      onSuccess()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('儲存失敗')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 計算毛利率
  const margin = formData.price > 0 && formData.cost > 0
    ? Math.round(((formData.price - formData.cost) / formData.price) * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle>{isEditing ? '編輯商品' : '新增商品'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
          {/* 基本資訊 */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">基本資訊</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>商品名稱 <span className="text-destructive">*</span></FieldLabel>
                <Input
                  placeholder="輸入商品名稱"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>規格/款式</FieldLabel>
                <Input
                  placeholder="如：紅色、大號"
                  value={formData.variant || ''}
                  onChange={(e) => updateField('variant', e.target.value || null)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field>
                <FieldLabel>SKU</FieldLabel>
                <Input
                  placeholder="商品編號"
                  value={formData.sku || ''}
                  onChange={(e) => updateField('sku', e.target.value || null)}
                />
              </Field>
              <Field>
                <FieldLabel>分類</FieldLabel>
                <Input
                  placeholder="商品分類"
                  value={formData.category || ''}
                  onChange={(e) => updateField('category', e.target.value || null)}
                />
              </Field>
              <Field>
                <FieldLabel>單位</FieldLabel>
                <Select
                  value={formData.unit || '個'}
                  onValueChange={(v) => updateField('unit', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          {/* 價格資訊 */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">價格資訊</h3>
            <div className="grid grid-cols-3 gap-4">
              <Field>
                <FieldLabel>成本 (NT$)</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={formData.cost || ''}
                  onChange={(e) => updateField('cost', e.target.value ? parseFloat(e.target.value) : 0)}
                />
              </Field>
              <Field>
                <FieldLabel>售價 (NT$)</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={formData.price || ''}
                  onChange={(e) => updateField('price', e.target.value ? parseFloat(e.target.value) : 0)}
                />
              </Field>
              <Field>
                <FieldLabel>毛利率</FieldLabel>
                <div className={`h-10 flex items-center px-3 rounded-md border bg-muted text-sm ${
                  margin >= 30 ? 'text-success' : margin >= 15 ? 'text-warning' : 'text-destructive'
                }`}>
                  {margin}%
                </div>
              </Field>
            </div>
          </div>

          {/* 供應商 */}
          <Field>
            <FieldLabel>供應商</FieldLabel>
            <Input
              placeholder="供應商名稱"
              value={formData.supplier || ''}
              onChange={(e) => updateField('supplier', e.target.value || null)}
              list="suppliers"
            />
            <datalist id="suppliers">
              {suppliers.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>

          {/* 備註 */}
          <Field>
            <FieldLabel>備註</FieldLabel>
            <Textarea
              placeholder="商品備註..."
              value={formData.note || ''}
              onChange={(e) => updateField('note', e.target.value || null)}
              rows={2}
            />
          </Field>
          </div>

          {/* 按鈕 */}
          <div className="shrink-0 border-t bg-background px-6 py-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '儲存中...' : isEditing ? '儲存變更' : '新增商品'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
