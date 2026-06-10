'use client'

import { useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
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
  // 顯示用：純商品小計（不含運費）
  const productSubtotal = isCustomer ? customerData?.sale_product_subtotal : supplierData?.purchase_product_subtotal
  const shippingTotal = isCustomer ? customerData?.shipping_total : supplierData?.shipping_total
  // 顯示用：純退貨小計（不含運費）
  const returnProductSubtotal = isCustomer ? customerData?.return_product_subtotal : supplierData?.return_product_subtotal
  const netTotal = isCustomer ? customerData?.net_total : supplierData?.net_total
  // 請款單和付款單都使用 period_* 欄位
  const paidAmount = isCustomer ? customerData?.period_received : supplierData?.period_paid
  const pendingAmount = isCustomer ? customerData?.period_pending : supplierData?.period_pending
  // 使用 period_pending 判斷是否已結清
  const isPeriodSettled = isCustomer ? (customerData?.period_pending ?? 0) <= 0 : (supplierData?.period_pending ?? 0) <= 0
  
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
            body { font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; padding: 10mm; font-size: 10px; }
            .header { text-align: center; margin-bottom: 15px; }
            .header h1 { font-size: 18px; margin-bottom: 6px; }
            .header p { color: #666; font-size: 11px; }
            .info { display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px; background: #f5f5f5; border-radius: 4px; }
            .info-item { text-align: center; }
            .info-label { font-size: 9px; color: #666; margin-bottom: 2px; }
            .info-value { font-weight: bold; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; table-layout: fixed; }
            th, td { border: 1px solid #ddd; padding: 4px 3px; text-align: left; font-size: 9px; white-space: normal; word-break: normal; overflow-wrap: break-word; line-height: 1.4; }
            th { background: #f5f5f5; font-weight: 600; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .negative { color: #dc2626; }
            .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
            .summary-card { padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 10px; }
            .summary-card h4 { font-size: 10px; margin-bottom: 6px; color: #666; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .summary-total { border-top: 2px solid #333; padding-top: 4px; margin-top: 4px; font-size: 12px; font-weight: bold; }
            .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; }
            .signature { width: 100px; text-align: center; }
            .signature-line { border-bottom: 1px solid #333; height: 25px; margin-bottom: 3px; }
            .signature-label { font-size: 9px; color: #666; }
            .status-settled { color: #166534; }
            .status-pending { color: #92400e; }
            .row-settled { background: #f0fdf4; }
            @media print {
              body { padding: 5mm; }
              .no-print { display: none; }
            }
            @page { size: A4; margin: 8mm; }
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
      <DialogContent className="w-full max-w-[90vw] max-h-[90vh] overflow-y-auto">
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
          </div>
          
          {/* 明細表格 - 請款單和付款單使用不同欄位 */}
          {isCustomer ? (
            /* 請款單表格：不顯示結清欄位（給客戶看） */
            <table className="w-full border-collapse mb-6 text-xs" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '62px' }} />   {/* 日期 */}
                <col style={{ width: '36px' }} />   {/* 類型 */}
                <col style={{ width: '30%' }} />    {/* 商品名稱 - 加寬 */}
                <col style={{ width: '50px' }} />   {/* 規格 */}
                <col style={{ width: '36px' }} />   {/* 數量 */}
                <col style={{ width: '50px' }} />   {/* 單價 */}
                <col style={{ width: '45px' }} />   {/* 運費 */}
                <col style={{ width: '60px' }} />   {/* 金額 */}
                <col />                              {/* 備註 - 填滿剩餘空間 */}
              </colgroup>
              <thead>
                <tr className="bg-muted/50">
                  <th className="border p-1 text-left">日期</th>
                  <th className="border p-1 text-left">類型</th>
                  <th className="border p-1 text-left">商品名稱</th>
                  <th className="border p-1 text-left">規格</th>
                  <th className="border p-1 text-right">數量</th>
                  <th className="border p-1 text-right">單價</th>
                  <th className="border p-1 text-right">運費</th>
                  <th className="border p-1 text-right">金額</th>
                  <th className="border p-1 text-left">備註</th>
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
                      <td className="border p-1">{formatDate(item.date)}</td>
                      <td className="border p-1">{getOrderTypeLabel(item.type)}</td>
                      <td className="border p-1 font-medium" style={{ whiteSpace: 'normal', wordBreak: 'normal', overflowWrap: 'break-word', lineHeight: 1.4 }}>
                        {item.product_name || '-'}
                      </td>
                      <td className="border p-1 text-muted-foreground" style={{ whiteSpace: 'normal', wordBreak: 'normal', overflowWrap: 'break-word', lineHeight: 1.4 }}>
                        {item.spec || '-'}
                      </td>
                      <td className={`border p-1 text-right ${item.quantity < 0 ? 'text-destructive' : ''}`}>
                        {item.quantity.toLocaleString()}
                      </td>
                      <td className="border p-1 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className={`border p-1 text-right ${item.shipping_fee < 0 ? 'text-destructive' : ''}`}>
                        {item.shipping_fee !== 0 ? formatCurrency(item.shipping_fee) : '-'}
                      </td>
                      <td className={`border p-1 text-right font-medium ${item.amount < 0 ? 'text-destructive' : ''}`}>
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="border p-1 text-muted-foreground" style={{ whiteSpace: 'normal', wordBreak: 'normal', overflowWrap: 'break-word', lineHeight: 1.4 }}>
                        {item.note && item.note.trim() ? item.note : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* 付款單表格：顯示結清欄位（內部管理） */
            <div className="overflow-x-auto">
              <table className="w-full border-collapse mb-6 text-sm" style={{ tableLayout: 'fixed', minWidth: '800px' }}>
                <colgroup>
                  <col style={{ width: '80px' }} />  {/* 日期 */}
                  <col style={{ width: '50px' }} />  {/* 類型 */}
                  <col style={{ width: '20%' }} />   {/* 商品名稱 */}
                  <col style={{ width: '70px' }} />  {/* 規格 */}
                  <col style={{ width: '50px' }} />  {/* 數量 */}
                  <col style={{ width: '70px' }} />  {/* 成本 */}
                  <col style={{ width: '60px' }} />  {/* 運費 */}
                  <col style={{ width: '80px' }} />  {/* 金額 */}
                  <col style={{ width: '55px' }} />  {/* 結清 */}
                  <col />                             {/* 備註 - 填滿剩餘空間 */}
                </colgroup>
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border p-2 text-left text-xs">日期</th>
                    <th className="border p-2 text-left text-xs">類型</th>
                    <th className="border p-2 text-left text-xs">商品名稱</th>
                    <th className="border p-2 text-left text-xs">規格</th>
                    <th className="border p-2 text-right text-xs">數量</th>
                    <th className="border p-2 text-right text-xs">成本</th>
                    <th className="border p-2 text-right text-xs">運費</th>
                    <th className="border p-2 text-right text-xs">金額</th>
                    <th className="border p-2 text-center text-xs">結清</th>
                    <th className="border p-2 text-left text-xs">備註</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="border p-8 text-center text-muted-foreground">
                        此期間無交易紀錄
                      </td>
                    </tr>
                  ) : (
                    data.items.map((item, idx) => (
                      <tr key={idx} className={item.is_settled ? 'bg-success/5' : ''}>
                        <td className="border p-1.5 text-xs">{formatDate(item.date)}</td>
                        <td className="border p-1.5 text-xs">{getOrderTypeLabel(item.type)}</td>
                        <td className="border p-1.5 text-xs font-medium" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                          {item.product_name || '-'}
                        </td>
                        <td className="border p-1.5 text-xs text-muted-foreground" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                          {item.spec || '-'}
                        </td>
                        <td className={`border p-1.5 text-xs text-right ${item.quantity < 0 ? 'text-destructive' : ''}`}>
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="border p-1.5 text-xs text-right">{formatCurrency(item.unit_price)}</td>
                        <td className={`border p-1.5 text-xs text-right ${item.shipping_fee < 0 ? 'text-destructive' : ''}`}>
                          {item.shipping_fee !== 0 ? formatCurrency(item.shipping_fee) : '-'}
                        </td>
                        <td className={`border p-1.5 text-xs text-right font-medium ${item.amount < 0 ? 'text-destructive' : ''}`}>
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="border p-1.5 text-xs text-center">
                          {item.is_settled ? (
                            <span className="text-success text-xs">已結清</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">未結清</span>
                          )}
                        </td>
                        <td className="border p-1.5 text-xs text-muted-foreground" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                          {item.note && item.note.trim() ? item.note : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {/* 彙總區塊 */}
          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 border rounded-lg">
              <h4 className="text-sm font-semibold text-muted-foreground mb-4">本期彙總</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isCustomer ? '銷貨小計' : '進貨小計'}</span>
                  <span className="font-medium">{formatCurrency(productSubtotal ?? 0)}</span>
                </div>
                {(shippingTotal ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">運費小計</span>
                    <span className="font-medium">{formatCurrency(shippingTotal ?? 0)}</span>
                  </div>
                )}
                {(returnProductSubtotal ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isCustomer ? '銷退合計' : '進退合計'}</span>
                    <span className="font-medium text-destructive">-{formatCurrency(returnProductSubtotal ?? 0)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="font-semibold">{isCustomer ? '本期應收' : '本期應付'}</span>
                  <span className="font-bold text-lg">{formatCurrency(netTotal ?? 0)}</span>
                </div>
              </div>
            </div>
            
            <div className={`p-4 border rounded-lg ${isPeriodSettled ? 'border-success/50 bg-success/5' : 'border-warning/50 bg-warning/5'}`}>
              <h4 className="text-sm font-semibold text-muted-foreground mb-4">{isCustomer ? '本期收款摘要' : '本期付款摘要'}</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isCustomer ? '本期應收' : '本期應付'}</span>
                  <span className="font-medium">{formatCurrency(netTotal ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isCustomer ? '本期已收' : '本期已付'}</span>
                  <span className="font-medium text-success">{formatCurrency(paidAmount ?? 0)}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="font-semibold">{isCustomer ? '本期未收' : '本期未付'}</span>
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
