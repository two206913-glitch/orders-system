import { Suspense } from 'react'
import { getPayments } from '@/app/actions/payments'
import { getReceivablesPayables } from '@/app/actions/finance'
import { PaymentsTable } from '@/components/payments/payments-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Building2, DollarSign, ArrowUpRight } from 'lucide-react'
import { formatCurrency } from '@/lib/locale'
import { AddPaymentButtonClient } from '@/components/payments/add-receipt-button'
import { PaymentExportButton } from '@/components/payments/payment-export-button'

export const dynamic = 'force-dynamic'

function PaymentsPageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">付款管理</h1>
        <p className="text-sm text-muted-foreground mt-1">管理供應商付款紀錄</p>
      </div>
    </div>
  )
}

async function PaymentsContent() {
  const [{ payments, total }, { payables, totals }] = await Promise.all([
    getPayments({ type: 'payment', pageSize: 100 }),
    getReceivablesPayables(),
  ])

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">應付帳款</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(totals.totalPayable)}</div>
            <p className="text-xs text-muted-foreground mt-1">{payables.length} 位供應商</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">已付款項</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totals.totalPayments)}</div>
            <p className="text-xs text-muted-foreground mt-1">{total} 筆付款紀錄</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">待付比例</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totals.totalPayments + totals.totalPayable > 0
                ? ((totals.totalPayable / (totals.totalPayments + totals.totalPayable)) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">尚未付清的比例</p>
          </CardContent>
        </Card>
      </div>

      {/* 應付帳款明細 */}
      {payables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">待付帳款明細</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payables.map((p) => (
                <div key={p.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.order_count} 筆訂單</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-destructive">{formatCurrency(p.pending_amount)}</p>
                    <p className="text-xs text-muted-foreground">已付 {formatCurrency(p.received_amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 付款紀錄 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">付款紀錄</h2>
          <div className="flex items-center gap-2">
            <PaymentExportButton payments={payments} type="payment" />
            <AddPaymentButtonClient />
          </div>
        </div>
        <PaymentsTable payments={payments} type="payment" />
      </div>
    </div>
  )
}

export default function PaymentsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 pt-16 lg:pt-8 sm:px-6 lg:px-8">
        <PaymentsPageHeader />
        <div className="mt-6">
          <Suspense fallback={<div className="flex justify-center py-12"><Spinner /></div>}>
            <PaymentsContent />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
