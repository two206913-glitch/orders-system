'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { PaymentFormDialog } from './payment-form-dialog'
import type { Payment } from '@/lib/types/payment'
import { formatCurrency, formatDate, getPaymentMethodLabel } from '@/lib/locale'
import { deletePayment } from '@/app/actions/payments'

interface PaymentsTableProps {
  payments: Payment[]
  type: 'receipt' | 'payment'
}

export function PaymentsTable({ payments, type }: PaymentsTableProps) {
  const router = useRouter()
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deletingPayment) return
    setIsDeleting(true)

    try {
      await deletePayment(deletingPayment.id, type)
      router.refresh()
    } catch (error) {
      console.error('Failed to delete payment:', error)
      alert('刪除失敗，請稍後再試')
    } finally {
      setIsDeleting(false)
      setDeletingPayment(null)
    }
  }

  const isReceipt = type === 'receipt'

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border bg-muted/40">
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wide">日期</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wide">
                {isReceipt ? '客戶' : '供應商'}
              </TableHead>
              <TableHead className="text-muted-foreground text-right font-semibold text-xs uppercase tracking-wide">金額</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wide">付款方式</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs uppercase tracking-wide">備註</TableHead>
              <TableHead className="text-muted-foreground w-[70px] font-semibold text-xs uppercase tracking-wide">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  尚無{isReceipt ? '收款' : '付款'}紀錄
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id} className="border-border hover:bg-muted/30 transition-colors">
                  <TableCell className="text-foreground font-medium">{formatDate(payment.date)}</TableCell>
                  <TableCell className="text-foreground font-medium">{payment.party_name}</TableCell>
                  <TableCell className="text-right font-medium text-foreground">{formatCurrency(payment.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{getPaymentMethodLabel(payment.payment_method)}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">{payment.note || '-'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingPayment(payment)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          編輯
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingPayment(payment)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          刪除
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

      <PaymentFormDialog
        open={!!editingPayment}
        onOpenChange={(open) => !open && setEditingPayment(null)}
        payment={editingPayment}
        defaultType={type}
      />

      <AlertDialog open={!!deletingPayment} onOpenChange={(open) => !open && setDeletingPayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除這筆{isReceipt ? '收款' : '付款'}紀錄嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '刪除中...' : '刪除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
