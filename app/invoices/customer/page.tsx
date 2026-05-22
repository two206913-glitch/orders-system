'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { FileText, Download } from 'lucide-react'
import { formatCurrency, formatDate, getOrderTypeLabel } from '@/lib/locale'
import {
  getCustomerList,
  getCustomerReceivables,
  getCustomerInvoice,
  type CustomerInvoice,
} from '@/app/actions/invoices'
import { InvoiceDocument } from '@/components/invoices/invoice-document'
import { PaymentHistoryDialog } from '@/components/invoices/payment-history-dialog'

export default function CustomerInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [customers, setCustomers] = useState<string[]>([])
  const [receivables, setReceivables] = useState<{
    customer_name: string
    total_amount: number
    received_amount: number
    pending_amount: number
    is_settled: boolean
  }[]>([])
  const [showSettled, setShowSettled] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [invoice, setInvoice] = useState<CustomerInvoice | null>(null)
  const [loading, setLoading] = useState(false)
  const [showInvoiceDoc, setShowInvoiceDoc] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  
  // 初始化日期（預設本月）
  useEffect(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    setDateFrom(firstDay.toISOString().split('T')[0])
    setDateTo(lastDay.toISOString().split('T')[0])
  }, [])
  
  // 載入客戶列表和應收狀態
  useEffect(() => {
    async function loadData() {
      const [customerList, receivableList] = await Promise.all([
        getCustomerList(),
        getCustomerReceivables(showSettled),
      ])
      setCustomers(customerList)
      setReceivables(receivableList)
    }
    loadData()
  }, [showSettled])
  
  // 查詢請款單
  const handleGenerateInvoice = async () => {
    if (!selectedCustomer || !dateFrom || !dateTo) return
    
    setLoading(true)
    try {
      const data = await getCustomerInvoice(selectedCustomer, dateFrom, dateTo)
      setInvoice(data)
    } finally {
      setLoading(false)
    }
  }
  
  // 匯出 Excel
  const handleExportExcel = () => {
    if (!invoice) return
    
    const BOM = '\uFEFF'
    
    // 標題資訊
    const titleRows = [
      ['請款單'],
      [],
      ['客戶名稱', invoice.customer_name],
      ['期間', `${formatDate(invoice.date_from)} 至 ${formatDate(invoice.date_to)}`],
      ['製單日期', formatDate(new Date().toISOString())],
      [],
    ]
    
    const headers = ['日期', '類型', '商品名稱', '規格', '數量', '單價', '運費', '金額', '備註']
    const rows = invoice.items.map(item => [
      formatDate(item.date),
      getOrderTypeLabel(item.type),
      item.product_name,
      item.spec || '',
      item.quantity.toString(),
      item.unit_price.toString(),
      item.shipping_fee.toString(),
      item.amount.toString(),
      item.note || '',
    ])
    
    // 加入彙總行
    const summaryRows = [
      [],
      ['', '', '', '', '', '', '', '銷貨小計', invoice.sale_total.toString()],
      ['', '', '', '', '', '', '', '含運費', invoice.shipping_total.toString()],
      ['', '', '', '', '', '', '', '銷退合計', (-invoice.return_total).toString()],
      ['', '', '', '', '', '', '', '本期應收', invoice.net_total.toString()],
      ['', '', '', '', '', '', '', '本期已收', invoice.period_received.toString()],
      ['', '', '', '', '', '', '', '本期未收', invoice.period_pending.toString()],
    ]
    
    const allRows = [
      ...titleRows.map(row => row.map(cell => `"${cell}"`).join(',')),
      headers.map(cell => `"${cell}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ...summaryRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ]
    
    const csvContent = BOM + allRows.join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `請款單_${invoice.customer_name}_${invoice.date_from}_${invoice.date_to}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }
  
  const handleRefresh = () => {
    // 重新載入資料
    handleGenerateInvoice()
    getCustomerReceivables(showSettled).then(setReceivables)
  }
  
  return (
    <div className="p-6 pt-16 lg:pt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">客戶請款單</h1>
        <p className="text-muted-foreground">依客戶和日期區間產生正式請款單</p>
      </div>
      
      {/* 篩選條件 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">產生請款單</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">客戶名稱</label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="選擇客戶" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">開始日期</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">結束日期</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <Button onClick={handleGenerateInvoice} disabled={!selectedCustomer || loading}>
              <FileText className="h-4 w-4 mr-2" />
              產生請款單
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* 請款單內容 */}
      {invoice && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>請款單 - {invoice.customer_name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                期間：{formatDate(invoice.date_from)} 至 {formatDate(invoice.date_to)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowInvoiceDoc(true)}>
                <FileText className="h-4 w-4 mr-2" />
                列印預覽
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <Download className="h-4 w-4 mr-2" />
                匯出 Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 明細表格 */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>日期</TableHead>
                    <TableHead>類型</TableHead>
                    <TableHead>商品名稱</TableHead>
                    <TableHead>規格</TableHead>
                    <TableHead className="text-right">數量</TableHead>
                    <TableHead className="text-right">單價</TableHead>
                    <TableHead className="text-right">運費</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    <TableHead>備註</TableHead>
                    <TableHead>結清狀態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        此期間無交易紀錄
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{formatDate(item.date)}</TableCell>
                        <TableCell>
                          <Badge variant={item.type === 'sale' ? 'default' : 'destructive'} className="text-xs">
                            {getOrderTypeLabel(item.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.spec || '-'}</TableCell>
                        <TableCell className={`text-right ${item.quantity < 0 ? 'text-destructive' : ''}`}>
                          {item.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className={`text-right ${item.shipping_fee < 0 ? 'text-destructive' : ''}`}>
                          {item.shipping_fee !== 0 ? formatCurrency(item.shipping_fee) : '-'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${item.amount < 0 ? 'text-destructive' : ''}`}>
                          {formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">
                          {item.note || '-'}
                        </TableCell>
                        <TableCell>
                          {item.is_settled ? (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                              已結清
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
                              未結清
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* 彙總區塊 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-4">本期彙總</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">銷貨小計</span>
                      <span className="font-medium">{formatCurrency(invoice.sale_total)}</span>
                    </div>
                    {invoice.shipping_total > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">運費小計</span>
                        <span className="font-medium">{formatCurrency(invoice.shipping_total)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">銷退合計</span>
                      <span className="font-medium text-destructive">-{formatCurrency(invoice.return_total)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">本期應收</span>
                      <span className="font-bold text-lg">{formatCurrency(invoice.net_total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className={invoice.period_pending <= 0 ? 'bg-success/5 border-success/30' : 'bg-warning/5 border-warning/30'}>
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-4">本期收款摘要</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">本期應收</span>
                      <span className="font-medium">{formatCurrency(invoice.net_total)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">本期已收</span>
                      <button
                        onClick={() => setShowHistoryDialog(true)}
                        className="font-medium text-success hover:underline cursor-pointer"
                      >
                        {formatCurrency(invoice.period_received)}
                      </button>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">本期未收</span>
                      <span className={`font-bold text-lg ${invoice.period_pending > 0 ? 'text-warning' : 'text-success'}`}>
                        {formatCurrency(invoice.period_pending)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 客戶應收狀態列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">客戶應收狀態</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                id="showSettled"
                checked={showSettled}
                onCheckedChange={(checked) => setShowSettled(checked as boolean)}
              />
              <label htmlFor="showSettled" className="text-sm">顯示已結清</label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>客戶名稱</TableHead>
                <TableHead className="text-right">應收總額</TableHead>
                <TableHead className="text-right">已收金額</TableHead>
                <TableHead className="text-right">未收金額</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receivables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {showSettled ? '無客戶資料' : '所有客戶皆已結清'}
                  </TableCell>
                </TableRow>
              ) : (
                receivables.map((r) => (
                  <TableRow key={r.customer_name}>
                    <TableCell className="font-medium">{r.customer_name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.total_amount)}</TableCell>
                    <TableCell className="text-right text-success">{formatCurrency(r.received_amount)}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={r.pending_amount > 0 ? 'text-warning' : ''}>
                        {formatCurrency(r.pending_amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {r.is_settled ? (
                        <Badge variant="outline" className="bg-success/10 text-success">已結清</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-warning/10 text-warning">未結清</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          setSelectedCustomer(r.customer_name)
                          // 直接取得請款單資料
                          setLoading(true)
                          try {
                            const data = await getCustomerInvoice(r.customer_name, dateFrom, dateTo)
                            setInvoice(data)
                          } finally {
                            setLoading(false)
                          }
                        }}
                      >
                        查看請款單
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* 列印預覽 */}
      {showInvoiceDoc && invoice && (
        <InvoiceDocument
          open={showInvoiceDoc}
          onOpenChange={setShowInvoiceDoc}
          type="customer"
          data={invoice}
        />
      )}

      {/* 收款紀錄 */}
      {showHistoryDialog && invoice && (
        <PaymentHistoryDialog
          open={showHistoryDialog}
          onOpenChange={setShowHistoryDialog}
          partyName={invoice.customer_name}
          type="receipt"
          onRefresh={handleRefresh}
        />
      )}
    </div>
  )
}
