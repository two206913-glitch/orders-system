'use client'

import { useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Download } from 'lucide-react'
import { formatCurrency, formatDate, getOrderTypeLabel } from '@/lib/locale'
import type { CustomerInvoice, SupplierInvoice } from '@/app/actions/invoices'

interface InvoiceDocumentProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'customer' | 'supplier'
  data: CustomerInvoice | SupplierInvoice
}

export function InvoiceDocument({ open, onOpenChange, type, data }: InvoiceDocumentProps) {
  const printRef = useRef<HTMLDivElement>(null)
  
  const isCustomer = type === 'customer'
  const customerData = isCustomer ? (data as CustomerInvoice) : null
  const supplierData = !isCustomer ? (data as SupplierInvoice) : null
  
  const partyName = isCustomer ? customerData?.customer_name : supplierData?.supplier_name
  const title = isCustomer ? '請款單' : '付款單'
  const subTotal = isCustomer ? customerData?.sale_total : supplierData?.purchase_total
  const shippingTotal = isCustomer ? customerData?.shipping_total : supplierData?.shipping_total
  const returnTotal = isCustomer ? customerData?.return_total : supplierData?.return_total
  const netTotal = isCustomer ? customerData?.net_total : supplierData?.net_total
  const paidAmount = isCustomer ? customerData?.received_amount : supplierData?.paid_amount
  const pendingAmount = isCustomer ? customerData?.pending_amount : supplierData?.pending_amount
  const isSettled = isCustomer ? customerData?.is_settled : supplierData?.is_settled
  
  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${partyName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; padding: 20mm; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { font-size: 24px; margin-bottom: 10px; }
            .header p { color: #666; }
            .info { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
            .info-item { text-align: center; }
            .info-label { font-size: 12px; color: #666; margin-bottom: 4px; }
            .info-value { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f5f5f5; font-weight: 600; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .negative { color: #dc2626; }
            .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
            .summary-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .summary-card h4 { font-size: 14px; margin-bottom: 10px; color: #666; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .summary-total { border-top: 2px solid #333; padding-top: 8px; margin-top: 8px; font-size: 18px; font-weight: bold; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; }
            .signature { width: 150px; text-align: center; }
            .signature-line { border-bottom: 1px solid #333; height: 40px; margin-bottom: 5px; }
            .signature-label { font-size: 12px; color: #666; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
            .status-settled { background: #dcfce7; color: #166534; }
            .status-pending { background: #fef3c7; color: #92400e; }
            @media print {
              body { padding: 10mm; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{title}預覽</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                列印
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div ref={printRef} className="bg-white p-6">
          {/* 標題 */}
          <div className="header text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">{title}</h1>
            <p className="text-muted-foreground">
              {isCustomer ? '客戶' : '供應商'}：{partyName}
            </p>
          </div>
          
          {/* 基本資訊 */}
          <div className="info flex justify-between items-center p-4 bg-muted/30 rounded-lg mb-6">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">期間</div>
              <div className="font-medium">
                {formatDate(data.date_from)} 至 {formatDate(data.date_to)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">製單日期</div>
              <div className="font-medium">{formatDate(new Date().toISOString())}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">狀態</div>
              <div>
                <span className={`inline-block px-3 py-1 rounded text-xs font-semibold ${
                  isSettled 
                    ? 'bg-success/10 text-success' 
                    : 'bg-warning/10 text-warning'
                }`}>
                  {isSettled ? '已結清' : '未結清'}
                </span>
              </div>
            </div>
          </div>
          
          {/* 明細表格 */}
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr className="bg-muted/50">
                <th className="border p-2 text-left">日期</th>
                <th className="border p-2 text-left">類型</th>
                <th className="border p-2 text-left">商品名稱</th>
                <th className="border p-2 text-left">規格</th>
                <th className="border p-2 text-right">數量</th>
                <th className="border p-2 text-right">{isCustomer ? '單價' : '單件成本'}</th>
                <th className="border p-2 text-right">運費</th>
                <th className="border p-2 text-right">金額</th>
                <th className="border p-2 text-left">備註</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="border p-8 text-center text-muted-foreground">
                    此期間無交易紀錄
                  </td>
                </tr>
              ) : (
                data.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border p-2">{formatDate(item.date)}</td>
                    <td className="border p-2">{getOrderTypeLabel(item.type)}</td>
                    <td className="border p-2 font-medium">{item.product_name}</td>
                    <td className="border p-2 text-muted-foreground">{item.spec || '-'}</td>
                    <td className={`border p-2 text-right ${item.quantity < 0 ? 'text-destructive' : ''}`}>
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="border p-2 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className={`border p-2 text-right ${item.shipping_fee < 0 ? 'text-destructive' : ''}`}>
                      {item.shipping_fee !== 0 ? formatCurrency(item.shipping_fee) : '-'}
                    </td>
                    <td className={`border p-2 text-right font-medium ${item.amount < 0 ? 'text-destructive' : ''}`}>
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="border p-2 text-muted-foreground text-sm">{item.note || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* 彙總區塊 */}
          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 border rounded-lg">
              <h4 className="text-sm font-semibold text-muted-foreground mb-4">本期彙總</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isCustomer ? '銷貨小計' : '進貨小計'}</span>
                  <span className="font-medium">{formatCurrency(subTotal ?? 0)}</span>
                </div>
                {(shippingTotal ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">含運費</span>
                    <span className="font-medium text-primary">{formatCurrency(shippingTotal ?? 0)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isCustomer ? '銷退合計' : '進退合計'}</span>
                  <span className="font-medium text-destructive">-{formatCurrency(returnTotal ?? 0)}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="font-semibold">{isCustomer ? '本期應收' : '本期應付'}</span>
                  <span className="font-bold text-lg">{formatCurrency(netTotal ?? 0)}</span>
                </div>
              </div>
            </div>
            
            <div className={`p-4 border rounded-lg ${isSettled ? 'border-success/50 bg-success/5' : 'border-warning/50 bg-warning/5'}`}>
              <h4 className="text-sm font-semibold text-muted-foreground mb-4">{isCustomer ? '收款狀態' : '付款狀態'}</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isCustomer ? '累計已收' : '累計已付'}</span>
                  <span className="font-medium text-success">{formatCurrency(paidAmount ?? 0)}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="font-semibold">{isCustomer ? '未收金額' : '未付金額'}</span>
                  <span className={`font-bold text-lg ${(pendingAmount ?? 0) > 0 ? 'text-warning' : 'text-success'}`}>
                    {formatCurrency(pendingAmount ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 簽章區 */}
          <div className="footer mt-12 pt-6 border-t flex justify-between">
            <div className="text-center w-36">
              <div className="h-12 border-b border-foreground/30 mb-2"></div>
              <div className="text-xs text-muted-foreground">製單人</div>
            </div>
            <div className="text-center w-36">
              <div className="h-12 border-b border-foreground/30 mb-2"></div>
              <div className="text-xs text-muted-foreground">核准人</div>
            </div>
            <div className="text-center w-36">
              <div className="h-12 border-b border-foreground/30 mb-2"></div>
              <div className="text-xs text-muted-foreground">{isCustomer ? '客戶簽收' : '供應商簽收'}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
