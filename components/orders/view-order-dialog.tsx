'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Order } from '@/lib/types/order'
import {
  formatCurrency,
  formatDateLong,
  getPaymentStatusLabel,
  getShippingStatusLabel,
  getPaymentMethodLabel,
} from '@/lib/locale'
import { Calendar, Package, User, Truck, CreditCard, FileText, Clock } from 'lucide-react'

interface ViewOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
}

function getPaymentStatusColor(status: string | null) {
  switch (status?.toLowerCase()) {
    case 'paid':
      return 'bg-success/15 text-success border-success/30'
    case 'pending':
      return 'bg-warning/15 text-warning border-warning/30'
    case 'cancelled':
      return 'bg-destructive/15 text-destructive border-destructive/30'
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/30'
  }
}

function getShippingStatusColor(status: string | null) {
  switch (status?.toLowerCase()) {
    case 'delivered':
      return 'bg-success/15 text-success border-success/30'
    case 'shipped':
      return 'bg-chart-3/15 text-chart-3 border-chart-3/30'
    case 'pending':
      return 'bg-warning/15 text-warning border-warning/30'
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/30'
  }
}

interface DetailItemProps {
  icon?: React.ElementType
  label: string
  value: string | React.ReactNode
  className?: string
}

function DetailItem({ icon: Icon, label, value, className = '' }: DetailItemProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  )
}

export function ViewOrderDialog({ open, onOpenChange, order }: ViewOrderDialogProps) {
  if (!order) return null

  const createdAt = order.created_at
    ? new Date(order.created_at).toLocaleString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold">訂單詳情</DialogTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">付款</span>
              <Badge variant="outline" className={getPaymentStatusColor(order.payment_status)}>
                {getPaymentStatusLabel(order.payment_status)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">出貨</span>
              <Badge variant="outline" className={getShippingStatusColor(order.shipping_status)}>
                {getShippingStatusLabel(order.shipping_status)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* 基本資訊 */}
          <div className="grid grid-cols-2 gap-4">
            <DetailItem icon={Calendar} label="日期" value={formatDateLong(order.date)} />
            <DetailItem label="批次" value={order.batch || '-'} />
            <DetailItem icon={User} label="客戶" value={order.customer_name || '-'} />
            <DetailItem label="供應商" value={order.supplier || '-'} />
          </div>

          <Separator />

          {/* 產品資訊 */}
          <div className="grid grid-cols-2 gap-4">
            <DetailItem icon={Package} label="產品" value={order.product_name || '-'} />
            <DetailItem label="規格" value={order.spec || '-'} />
            <DetailItem label="數量" value={order.quantity?.toLocaleString('zh-TW') || '-'} />
            <DetailItem label="單價" value={formatCurrency(order.unit_price)} />
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">總金額</span>
              <span className="text-2xl font-bold text-foreground">{formatCurrency(order.total_price)}</span>
            </div>
          </div>

          <Separator />

          {/* 付款與出貨資訊 */}
          <div className="grid grid-cols-2 gap-4">
            <DetailItem icon={CreditCard} label="付款方式" value={getPaymentMethodLabel(order.payment_method)} />
            <DetailItem icon={Truck} label="來源" value={order.source || '-'} />
          </div>

          {/* 備註 */}
          {order.note && (
            <DetailItem
              icon={FileText}
              label="備註"
              value={order.note}
              className="col-span-2"
            />
          )}

          <Separator />

          {/* 建立時間 */}
          <DetailItem
            icon={Clock}
            label="建立時間"
            value={createdAt}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
