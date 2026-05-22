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
  getSupplierList,
  getSupplierPayables,
  getSupplierInvoice,
  type SupplierInvoice,
} from '@/app/actions/invoices'
import { InvoiceDocument } from '@/components/invoices/invoice-document'
import { PaymentHistoryDialog } from '@/components/invoices/payment-history-dialog'

export default function SupplierInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [payables, setPayables] = useState<{
    supplier_name: string
    total_amount: number
    paid_amount: number
    pending_amount: number
    is_settled: boolean
  }[]>([])
  const [showSettled, setShowSettled] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [invoice, setInvoice] = useState<SupplierInvoice | null>(null)
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
  
  // 載入供應商列表和應付狀態
  useEffect(() => {
    async function loadData() {
      const [supplierList, payableList] = await Promise.all([
        getSupplierList(),
        getSupplierPayables(showSettled),
      ])
      setSuppliers(supplierList)
      setPayables(payableList)
    }
    loadData()
  }, [showSettled])
  
  // 查詢付款單
  const handleGenerateInvoice = async () => {
    if (!selectedSupplier || !dateFrom || !dateTo) return
    
    setLoading(true)
    try {
      const data = await getSupplierInvoice(selectedSupplier, dateFrom, dateTo)
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
      ['付款單'],
      [],
      ['供應商名稱', invoice.supplier_name],
      ['期間', `${formatDate(invoice.date_from)} 至 ${formatDate(invoice.date_to)}`],
      ['製單日期', formatDate(new Date().toISOString())],
      [],
    ]
    
    const headers = ['日期', '類型', '商品名稱', '規格', '數量', '單件成本', '金額', '結清狀態']
    const rows = invoice.items.map(item => [
      formatDate(item.date),
      getOrderTypeLabel(item.type),
      item.product_name,
      item.spec || '',
      item.quantity.toString(),
      item.unit_price.toString(),
      item.amount.toString(),
      item.is_settled ? '已結清' : '未結清',
    ])
    
    // 加入彙總行
    const summaryRows = [
      [],
      ['', '', '', '', '', '', '進貨小計', invoice.purchase_total.toString()],
      ['', '', '', '', '', '', '進退合計', (-invoice.return_total).toString()],
      ['', '', '', '', '', '', '本期應付', invoice.net_total.toString()],
      ['', '', '', '', '', '', '本期已付', invoice.period_paid.toString()],
      ['', '', '', '', '', '', '本期未付', invoice.period_pending.toString()],
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
    link.download = `付款單_${invoice.supplier_name}_${invoice.date_from}_${invoice.date_to}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }
  
  const handleRefresh = () => {
    // 重新載入資料
    handleGenerateInvoice()
    getSupplierPayables(showSettled).then(setPayables)
  }
  
  return (
    <div className="p-6 pt-16 lg:pt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">廠商付款單</h1>
        <p className="text-muted-foreground">依供應商和日期區間產生正式付款單</p>
      </div>
      
      {/* 篩選條件 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">產生付款單</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">供應商名稱</label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="選擇供應商" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(name => (
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
            <Button onClick={handleGenerateInvoice} disabled={!selectedSupplier || loading}>
              <FileText className="h-4 w-4 mr-2" />
              產生付款單
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* 付款單內容 */}
      {invoice && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>付款單 - {invoice.supplier_name}</CardTitle>
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
                    <TableHead className="text-right">單件成本</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    <TableHead>結清狀態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        此期間無交易紀錄
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{formatDate(item.date)}</TableCell>
                        <TableCell>
                          <Badge variant={item.type === 'purchase' ? 'default' : 'destructive'} className="text-xs">
                            {getOrderTypeLabel(item.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.spec || '-'}</TableCell>
                        <TableCell className={`text-right ${item.quantity < 0 ? 'text-destructive' : ''}`}>
                          {item.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className={`text-right font-medium ${item.amount < 0 ? 'text-destructive' : ''}`}>
                          {formatCurrency(item.amount)}
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
                      <span className="text-muted-foreground">進貨小計</span>
                      <span className="font-medium">{formatCurrency(invoice.purchase_total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">進退合計</span>
                      <span className="font-medium text-destructive">-{formatCurrency(invoice.return_total)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">本期應付</span>
                      <span className="font-bold text-lg">{formatCurrency(invoice.net_total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className={invoice.period_pending <= 0 ? 'bg-success/5 border-success/30' : 'bg-warning/5 border-warning/30'}>
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-4">本期付款摘要</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">本期應付</span>
                      <span className="font-medium">{formatCurrency(invoice.net_total)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">本期已付</span>
                      <button
                        onClick={() => setShowHistoryDialog(true)}
                        className="font-medium text-success hover:underline cursor-pointer"
                      >
                        {formatCurrency(invoice.period_paid)}
                      </button>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">本期未付</span>
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
      
      {/* 供應商應付狀態列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">供應商應付狀態</CardTitle>
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
                <TableHead>供應商名稱</TableHead>
                <TableHead className="text-right">應付總額</TableHead>
                <TableHead className="text-right">已付金額</TableHead>
                <TableHead className="text-right">未付金額</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {showSettled ? '無供應商資料' : '所有供應商皆已結清'}
                  </TableCell>
                </TableRow>
              ) : (
                payables.map((p) => (
                  <TableRow key={p.supplier_name}>
                    <TableCell className="font-medium">{p.supplier_name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.total_amount)}</TableCell>
                    <TableCell className="text-right text-success">{formatCurrency(p.paid_amount)}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={p.pending_amount > 0 ? 'text-warning' : ''}>
                        {formatCurrency(p.pending_amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {p.is_settled ? (
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
                          setSelectedSupplier(p.supplier_name)
                          // 直接取得付款單資料
                          setLoading(true)
                          try {
                            const data = await getSupplierInvoice(p.supplier_name, dateFrom, dateTo)
                            setInvoice(data)
                          } finally {
                            setLoading(false)
                          }
                        }}
                      >
                        查看付款單
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
          type="supplier"
          data={invoice}
        />
      )}

      {/* 付款紀錄 */}
      {showHistoryDialog && invoice && (
        <PaymentHistoryDialog
          open={showHistoryDialog}
          onOpenChange={setShowHistoryDialog}
          partyName={invoice.supplier_name}
          type="payment"
          onRefresh={handleRefresh}
        />
      )}
    </div>
  )
}
