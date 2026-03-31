'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search } from 'lucide-react'
import { OrderFormDialog } from './order-form-dialog'
import { ExportButton } from './export-button'
import { PAYMENT_STATUSES, SHIPPING_STATUSES, type Order } from '@/lib/types/order'
import { PAYMENT_STATUS_LABELS, SHIPPING_STATUS_LABELS } from '@/lib/locale'
import { useRouter, useSearchParams } from 'next/navigation'

interface OrdersHeaderProps {
  orders: Order[]
}

export function OrdersHeader({ orders }: OrdersHeaderProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    params.set('page', '1')
    router.push(`?${params.toString()}`)
  }

  const handlePaymentFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set('payment', value)
    } else {
      params.delete('payment')
    }
    params.set('page', '1')
    router.push(`?${params.toString()}`)
  }

  const handleShippingFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set('shipping', value)
    } else {
      params.delete('shipping')
    }
    params.set('page', '1')
    router.push(`?${params.toString()}`)
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">訂單管理</h1>
          <p className="text-muted-foreground text-sm mt-1">
            在此管理與追蹤所有訂單
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton orders={orders} />
          <Button onClick={() => setIsCreateOpen(true)} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            新增訂單
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mt-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋訂單..."
            className="pl-9 shadow-sm"
            defaultValue={searchParams.get('search') || ''}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Select
          defaultValue={searchParams.get('payment') || 'all'}
          onValueChange={handlePaymentFilter}
        >
          <SelectTrigger className="w-[140px] shadow-sm">
            <SelectValue placeholder="付款狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部付款</SelectItem>
            {PAYMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {PAYMENT_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          defaultValue={searchParams.get('shipping') || 'all'}
          onValueChange={handleShippingFilter}
        >
          <SelectTrigger className="w-[140px] shadow-sm">
            <SelectValue placeholder="出貨狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部出貨</SelectItem>
            {SHIPPING_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {SHIPPING_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <OrderFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
      />
    </>
  )
}
