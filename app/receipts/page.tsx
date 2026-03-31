import { Suspense } from 'react'
import { getPayments } from '@/app/actions/payments'
import { getReceivablesPayables } from '@/app/actions/finance'
import { PaymentsTable } from '@/components/payments/payments-table'
import { PaymentFormDialog } from '@/components/payments/payment-form-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Plus, Users, DollarSign, ArrowDownRight } from 'lucide-react'
import { formatCurrency } from '@/lib/locale'

export const dynamic = 'force-dynamic'

function ReceiptsPageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">收款管理</h1>
        <p className="text-sm text-muted-foreground mt-1">管理客戶付款紀錄</p>
      </div>
    </div>
  )
}

async function ReceiptsContent() {
  const [{ payments, total }, { receivables, totals }] = await Promise.all([
    getPayments({ type: 'receipt', pageSize: 100 }),
    getReceivablesPayables(),
  ])

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">應收帳款</CardTitle>
            <DollarSign className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(totals.totalReceivable)}</div>
            <p className="text-xs text-muted-foreground mt-1">{receivables.length} 位客戶</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">已收款項</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totals.totalReceipts)}</div>
            <p className="text-xs text-muted-foreground mt-1">{total} 筆收款紀錄</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">待收比例</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totals.totalReceipts + totals.totalReceivable > 0
                ? ((totals.totalReceivable / (totals.totalReceipts + totals.totalReceivable)) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">尚未收回的比例</p>
          </CardContent>
        </Card>
      </div>

      {/* 應收帳款明細 */}
      {receivables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">待收帳款明細</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {receivables.map((r) => (
                <div key={r.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.order_count} 筆訂單</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-warning">{formatCurrency(r.pending_amount)}</p>
                    <p className="text-xs text-muted-foreground">已收 {formatCurrency(r.received_amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 收款紀錄 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">收款紀錄</h2>
          <div className="flex items-center gap-2">
            <PaymentExportButton payments={payments} type="receipt" />
            <AddReceiptButton />
          </div>
        </div>
        <PaymentsTable payments={payments} type="receipt" />
      </div>
    </div>
  )
}

function AddReceiptButton() {
  'use client'
  return <AddReceiptButtonClient />
}

import { AddReceiptButtonClient } from '@/components/payments/add-receipt-button'
import { PaymentExportButton } from '@/components/payments/payment-export-button'

export default function ReceiptsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 pt-16 lg:pt-8 sm:px-6 lg:px-8">
        <ReceiptsPageHeader />
        <div className="mt-6">
          <Suspense fallback={<div className="flex justify-center py-12"><Spinner /></div>}>
            <ReceiptsContent />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
