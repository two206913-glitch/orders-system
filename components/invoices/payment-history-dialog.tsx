'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { formatCurrency, formatDate, getPaymentMethodLabel } from '@/lib/locale'
import { getPaymentsByParty, deletePayment } from '@/app/actions/payments'
import { PaymentFormDialog } from '@/components/payments/payment-form-dialog'
import type { Payment } from '@/lib/types/payment'

interface PaymentHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partyName: string
  type: 'receipt' | 'payment'
  onRefresh?: () => void
}

export function PaymentHistoryDialog({
  open,
  onOpenChange,
  partyName,
  type,
  onRefresh,
}: PaymentHistoryDialogProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  const isReceipt = type === 'receipt'
  const title = isReceipt ? '收款紀錄' : '付款紀錄'
  const partyLabel = isReceipt ? '客戶' : '供應商'

  const loadPayments = async () => {
    setLoading(true)
    try {
      const data = await getPaymentsByParty(partyName, type)
      setPayments(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadPayments()
    }
  }, [open, partyName, type])

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment)
    setShowEditDialog(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此筆紀錄嗎？刪除後應收/應付金額將自動回復。')) return
    
    try {
      await deletePayment(id, type)
      loadPayments()
      onRefresh?.()
    } catch (error) {
      console.error('Failed to delete payment:', error)
      alert('刪除失敗，請稍後再試')
    }
  }

  const handleEditSuccess = () => {
    setShowEditDialog(false)
    setSelectedPayment(null)
    loadPayments()
    onRefresh?.()
  }

  const handleAddSuccess = () => {
    setShowAddDialog(false)
    loadPayments()
    onRefresh?.()
  }

  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span>{partyLabel}：{partyName} - {title}</span>
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                新增{isReceipt ? '收款' : '付款'}
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            {/* 總計 */}
            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">累計{isReceipt ? '已收' : '已付'}金額</span>
              <span className="text-xl font-bold text-success">{formatCurrency(totalAmount)}</span>
            </div>

            {/* 紀錄列表 */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>日期</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    <TableHead>付款方式</TableHead>
                    <TableHead>備註</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        載入中...
                      </TableCell>
                    </TableRow>
                  ) : payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        無{title}紀錄
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.date)}</TableCell>
                        <TableCell className="text-right font-medium text-success">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          {payment.payment_method ? (
                            <Badge variant="outline">{getPaymentMethodLabel(payment.payment_method)}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-48 truncate">
                          {payment.note || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(payment)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(payment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 編輯對話框 */}
      {showEditDialog && selectedPayment && (
        <PaymentFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          payment={selectedPayment}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* 新增對話框 */}
      {showAddDialog && (
        <PaymentFormDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          type={type}
          defaultPartyName={partyName}
          onSuccess={handleAddSuccess}
        />
      )}
    </>
  )
}
