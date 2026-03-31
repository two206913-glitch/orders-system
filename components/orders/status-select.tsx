'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { PAYMENT_STATUSES, SHIPPING_STATUSES } from '@/lib/types/order'
import { PAYMENT_STATUS_LABELS, SHIPPING_STATUS_LABELS } from '@/lib/locale'
import { updateOrderStatus } from '@/app/actions/orders'

interface StatusSelectProps {
  orderId: string
  type: 'payment' | 'shipping'
  value: string | null
}

function getPaymentStatusColor(status: string | null) {
  switch (status?.toLowerCase()) {
    case 'paid':
      return 'bg-success/15 text-success border-success/30 hover:bg-success/25'
    case 'pending':
      return 'bg-warning/15 text-warning border-warning/30 hover:bg-warning/25'
    case 'cancelled':
      return 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25'
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/30'
  }
}

function getShippingStatusColor(status: string | null) {
  switch (status?.toLowerCase()) {
    case 'delivered':
      return 'bg-success/15 text-success border-success/30 hover:bg-success/25'
    case 'shipped':
      return 'bg-chart-3/15 text-chart-3 border-chart-3/30 hover:bg-chart-3/25'
    case 'pending':
      return 'bg-warning/15 text-warning border-warning/30 hover:bg-warning/25'
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/30'
  }
}

export function StatusSelect({ orderId, type, value }: StatusSelectProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentValue, setCurrentValue] = useState(value || '')

  const statuses = type === 'payment' ? PAYMENT_STATUSES : SHIPPING_STATUSES
  const labels = type === 'payment' ? PAYMENT_STATUS_LABELS : SHIPPING_STATUS_LABELS
  const getColor = type === 'payment' ? getPaymentStatusColor : getShippingStatusColor
  const field = type === 'payment' ? 'payment_status' : 'shipping_status'

  const handleChange = (newValue: string) => {
    setCurrentValue(newValue)
    startTransition(async () => {
      await updateOrderStatus(orderId, field, newValue)
      router.refresh()
    })
  }

  if (isPending) {
    return (
      <Badge variant="outline" className="bg-muted/50 border-muted-foreground/20">
        <Spinner className="h-3 w-3" />
      </Badge>
    )
  }

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className="h-auto p-0 border-0 bg-transparent focus:ring-0 focus:ring-offset-0 w-auto">
        <Badge
          variant="outline"
          className={`${getColor(currentValue)} cursor-pointer transition-colors`}
        >
          {labels[currentValue] || '-'}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem key={status} value={status}>
            <Badge variant="outline" className={getColor(status)}>
              {labels[status]}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
