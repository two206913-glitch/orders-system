import { getReceivablesPayables } from '@/app/actions/finance'
import { formatCurrency } from '@/lib/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, TrendingDown, Users } from 'lucide-react'

export default async function FinancePage() {
  const { receivables, payables, totals } = await getReceivablesPayables()

  return (
    <div className="p-6 pt-16 lg:pt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">應收應付</h1>
        <p className="text-muted-foreground">管理客戶應收帳款與供應商應付帳款</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-success/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">應收帳款</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(totals.totalReceivable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">應付帳款</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(totals.totalPayable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">淨部位</p>
                <p className={`text-2xl font-bold ${totals.netPosition >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(totals.netPosition)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receivables */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              客戶應收帳款
            </CardTitle>
          </CardHeader>
          <CardContent>
            {receivables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>目前無未收款項</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>客戶名稱</TableHead>
                    <TableHead className="text-right">訂單數</TableHead>
                    <TableHead className="text-right">待收金額</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.order_count}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-mono">
                          {formatCurrency(item.pending_amount)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payables */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              供應商應付帳款
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>目前無待付款項</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>供應商名稱</TableHead>
                    <TableHead className="text-right">訂單數</TableHead>
                    <TableHead className="text-right">待付金額</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payables.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.order_count}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-mono text-destructive">
                          {formatCurrency(item.pending_amount)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
