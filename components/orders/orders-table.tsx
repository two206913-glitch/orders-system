'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty } from '@/components/ui/empty'
import { MoreHorizontal, Pencil, Trash2, Eye, ArrowUpDown, ArrowUp, ArrowDown, Package, Plus } from 'lucide-react'
import type { Order } from '@/lib/types/order'
import { formatCurrency, formatDate } from '@/lib/locale'
import { OrderFormDialog } from './order-form-dialog'
import { DeleteOrderDialog } from './delete-order-dialog'
import { ViewOrderDialog } from './view-order-dialog'
import { StatusSelect } from './status-select'
import { Pagination } from './pagination'

interface OrdersTableProps {
  orders: Order[]
  total: number
  currentPage: number
  pageSize: number
}

export function OrdersTable({ orders, total, currentPage, pageSize }: OrdersTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const currentSort = searchParams.get('sortBy') || 'created_at'
  const currentOrder = searchParams.get('sortOrder') || 'desc'

  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (currentSort === column) {
      params.set('sortOrder', currentOrder === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('sortBy', column)
      params.set('sortOrder', 'desc')
    }
    router.push(`?${params.toString()}`)
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (currentSort !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    }
    return currentOrder === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    )
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border bg-muted/40">
              <TableHead className="text-muted-foreground">
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center hover:text-foreground transition-colors font-semibold text-xs uppercase tracking-wide"
                >
                  日期
                  <SortIcon column="date" />
                </button>
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wide">批次</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wide">客戶</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wide">產品</TableHead>
              <TableHead className="text-muted-foreground text-right font-semibold text-xs uppercase tracking-wide">數量</TableHead>
              <TableHead className="text-muted-foreground text-right">
                <button
                  onClick={() => handleSort('total_price')}
                  className="flex items-center justify-end w-full hover:text-foreground transition-colors font-semibold text-xs uppercase tracking-wide"
                >
                  金額
                  <SortIcon column="total_price" />
                </button>
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wide">付款狀態</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wide">出貨狀態</TableHead>
              <TableHead className="text-muted-foreground w-[70px] font-semibold text-xs uppercase tracking-wide">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-64">
                  <Empty
                    icon={Package}
                    title="尚無訂單資料"
                    description="目前沒有符合條件的訂單，點擊下方按鈕新增第一筆訂單"
                  >
                    <Button onClick={() => setIsCreateOpen(true)} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      新增訂單
                    </Button>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className="border-border hover:bg-muted/30 transition-colors group">
                  <TableCell className="text-foreground font-medium">{formatDate(order.date)}</TableCell>
                  <TableCell className="text-muted-foreground">{order.batch || '-'}</TableCell>
                  <TableCell className="text-foreground font-medium">{order.customer_name || '-'}</TableCell>
                  <TableCell className="text-foreground">{order.product_name || '-'}</TableCell>
                  <TableCell className="text-foreground text-right tabular-nums">{order.quantity?.toLocaleString('zh-TW') ?? '-'}</TableCell>
                  <TableCell className="text-foreground text-right font-semibold tabular-nums">{formatCurrency(order.total_price)}</TableCell>
                  <TableCell>
                    <StatusSelect
                      orderId={order.id}
                      type="payment"
                      value={order.payment_status}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusSelect
                      orderId={order.id}
                      type="shipping"
                      value={order.shipping_status}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">開啟選單</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setViewingOrder(order)}>
                          <Eye className="mr-2 h-4 w-4" />
                          檢視詳情
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingOrder(order)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          編輯訂單
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingOrder(order)}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          刪除訂單
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={total}
        />
      )}

      <ViewOrderDialog
        open={!!viewingOrder}
        onOpenChange={(open) => !open && setViewingOrder(null)}
        order={viewingOrder}
      />

      <OrderFormDialog
        open={!!editingOrder}
        onOpenChange={(open) => !open && setEditingOrder(null)}
        order={editingOrder}
        mode="edit"
      />

      <OrderFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
      />

      <DeleteOrderDialog
        open={!!deletingOrder}
        onOpenChange={(open) => !open && setDeletingOrder(null)}
        order={deletingOrder}
      />
    </>
  )
}
