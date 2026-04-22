'use client'

import React, { useState } from 'react'
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
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import { MoreHorizontal, Pencil, Trash2, Eye, ArrowUpDown, ArrowUp, ArrowDown, Package, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { getOrderItems } from '@/app/actions/orders'
import type { OrderItem } from '@/lib/types/order'
import type { Order } from '@/lib/types/order'
import { formatCurrency, formatDate, getOrderTypeLabel } from '@/lib/locale'
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
  const [expandedOrders, setExpandedOrders] = useState<Record<string, OrderItem[]>>({})
  const [loadingExpand, setLoadingExpand] = useState<string | null>(null)

  // 展開/收合多商品訂單
  const toggleExpand = async (orderId: string) => {
    if (expandedOrders[orderId]) {
      // 已展開，收合
      const newExpanded = { ...expandedOrders }
      delete newExpanded[orderId]
      setExpandedOrders(newExpanded)
    } else {
      // 未展開，載入並展開
      setLoadingExpand(orderId)
      try {
        const items = await getOrderItems(orderId)
        setExpandedOrders(prev => ({ ...prev, [orderId]: items }))
      } finally {
        setLoadingExpand(null)
      }
    }
  }

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
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wide">類型</TableHead>
              <TableHead className="text-muted-foreground">
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center hover:text-foreground transition-colors font-semibold text-xs uppercase tracking-wide"
                >
                  日期
                  <SortIcon column="date" />
                </button>
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wide">客戶/供應商</TableHead>
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
                <TableCell colSpan={10} className="h-64">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Package className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle>尚無訂單資料</EmptyTitle>
                      <EmptyDescription>目前沒有符合條件的訂單，點擊下方按鈕新增第一筆訂單</EmptyDescription>
                    </EmptyHeader>
                    <Button onClick={() => setIsCreateOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      新增訂單
                    </Button>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const type = order.type || 'sale'
                const isSale = type === 'sale' || type === 'sale_return'
                const counterparty = isSale ? order.customer_name : order.supplier
                
                return (
                <React.Fragment key={order.id}>
                <TableRow className="border-border hover:bg-muted/30 transition-colors group">
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      type === 'sale' ? 'bg-success/10 text-success' :
                      type === 'purchase' ? 'bg-primary/10 text-primary' :
                      type === 'sale_return' ? 'bg-warning/10 text-warning' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {getOrderTypeLabel(type)}
                    </span>
                  </TableCell>
                  <TableCell className="text-foreground font-medium">{formatDate(order.date)}</TableCell>
                  <TableCell className="text-foreground font-medium">{counterparty || '-'}</TableCell>
                  <TableCell className="text-foreground">
                    {/* 檢查是否為多商品訂單（product_name 含有逗號） */}
                    {order.product_name?.includes(',') ? (
                      <button
                        onClick={() => toggleExpand(order.id)}
                        className="flex items-center gap-1 text-left hover:text-primary transition-colors"
                        disabled={loadingExpand === order.id}
                      >
                        {loadingExpand === order.id ? (
                          <span className="text-muted-foreground">載入中...</span>
                        ) : (
                          <>
                            <span className="truncate max-w-[150px]" title={order.product_name || ''}>
                              {order.product_name?.split(',')[0]}...
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">
                              ({order.product_name?.split(',').length}項)
                            </span>
                            {expandedOrders[order.id] ? (
                              <ChevronUp className="h-3 w-3 ml-1" />
                            ) : (
                              <ChevronDown className="h-3 w-3 ml-1" />
                            )}
                          </>
                        )}
                      </button>
                    ) : (
                      order.product_name || '-'
                    )}
                  </TableCell>
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
                {/* 展開的多商品明細 */}
                {expandedOrders[order.id] && expandedOrders[order.id].length > 0 && (
                  <TableRow className="bg-muted/20">
                    <TableCell colSpan={9} className="py-2 px-4">
                      <div className="ml-4 border-l-2 border-primary/30 pl-4">
                        <div className="text-xs font-medium text-muted-foreground mb-2">商品明細：</div>
                        <div className="space-y-1">
                          {expandedOrders[order.id].map((item, idx) => (
                            <div key={item.id || idx} className="flex items-center gap-4 text-sm">
                              <span className="font-medium min-w-[120px]">{item.product_name}</span>
                              <span className="text-muted-foreground min-w-[80px]">{item.product_variant || '-'}</span>
                              <span className="tabular-nums min-w-[60px] text-right">{item.quantity} 件</span>
                              <span className="tabular-nums min-w-[80px] text-right">{formatCurrency(item.unit_price)}</span>
                              <span className="tabular-nums min-w-[80px] text-right font-medium">{formatCurrency(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
              )})
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
