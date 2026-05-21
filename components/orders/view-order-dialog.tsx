'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Order, OrderItem } from '@/lib/types/order'
import { getOrderItems } from '@/app/actions/orders'
import {
  formatCurrency,
  formatDateLong,
  getPaymentStatusLabel,
  getShippingStatusLabel,
  getPaymentMethodLabel,
  getOrderTypeLabel,
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
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  // 載入 order_items
  useEffect(() => {
    if (open && order) {
      setLoadingItems(true)
      getOrderItems(order.id)
        .then(setOrderItems)
        .finally(() => setLoadingItems(false))
    } else {
      setOrderItems([])
    }
  }, [open, order])

  if (!order) return null

  const orderType = order.type || 'sale'
  const isSaleType = orderType === 'sale' || orderType === 'sale_return'
  const isPurchaseType = orderType === 'purchase' || orderType === 'purchase_return'
  
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b space-y-3">
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

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
          {/* 基本資訊 */}
          <div className="grid grid-cols-2 gap-4">
            <DetailItem label="交易類型" value={
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                order.type === 'sale' ? 'bg-success/10 text-success' :
                order.type === 'purchase' ? 'bg-primary/10 text-primary' :
                order.type === 'sale_return' ? 'bg-warning/10 text-warning' :
                'bg-destructive/10 text-destructive'
              }`}>
                {getOrderTypeLabel(order.type)}
              </span>
            } />
            <DetailItem icon={Calendar} label="日期" value={formatDateLong(order.date)} />
            <DetailItem label="批次" value={order.batch || '-'} />
            <DetailItem label="來源" value={order.source || '-'} />
            <DetailItem icon={User} label="客戶" value={order.customer_name || '-'} />
            <DetailItem label="供應商" value={order.supplier || '-'} />
          </div>

          <Separator />

          {/* 產品資訊 - 一律從 order_items 顯示 */}
          {loadingItems ? (
            <div className="text-center py-4 text-muted-foreground">載入商品明細...</div>
          ) : orderItems.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Package className="h-3.5 w-3.5" />
                商品明細 ({orderItems.length} 項)
              </div>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">商品名稱</TableHead>
                      <TableHead className="text-xs">規格</TableHead>
                      <TableHead className="text-xs text-right">數量</TableHead>
                      <TableHead className="text-xs text-right">{isSaleType ? '售價' : '成本'}</TableHead>
                      <TableHead className="text-xs text-right">小計</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item, idx) => (
                      <TableRow key={item.id || idx}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.product_variant || '-'}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.quantity.toLocaleString('zh-TW')}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(isSaleType ? item.unit_price : item.cost)}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{formatCurrency(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            /* 無 order_items（舊訂單）- 顯示提示 */
            <div className="text-center py-4 text-muted-foreground">
              此訂單無商品明細紀錄（舊資料格式）
            </div>
          )}

          {/* 金額資訊 - 從 order_items 計算 */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div className={`grid ${isSaleType ? 'grid-cols-3' : 'grid-cols-2'} gap-4 text-sm`}>
              <div>
                <span className="text-muted-foreground">運費</span>
                <p className="font-medium">{formatCurrency(order.shipping_fee)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{isPurchaseType ? '總成本' : '總金額'}</span>
                <p className="font-medium">{formatCurrency(order.total_price)}</p>
              </div>
              {isSaleType && (
                <div>
                  <span className="text-muted-foreground">利潤</span>
                  <p className={`font-medium ${(order.profit ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(order.profit)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* 付款與出貨資訊 */}
          <div className="grid grid-cols-2 gap-4">
            <DetailItem icon={CreditCard} label="付款方式" value={getPaymentMethodLabel(order.payment_method)} />
            <DetailItem icon={Truck} label="出貨狀態" value={getShippingStatusLabel(order.shipping_status)} />
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
