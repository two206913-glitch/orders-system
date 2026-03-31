'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'
import type { Order } from '@/lib/types/order'
import { formatDate, getPaymentStatusLabel, getShippingStatusLabel, getPaymentMethodLabel } from '@/lib/locale'
import * as XLSX from 'xlsx'

interface ExportButtonProps {
  orders: Order[]
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function getOrderData(orders: Order[]) {
  return orders.map((order) => ({
    日期: formatDate(order.date),
    批次: order.batch || '',
    客戶名稱: order.customer_name || '',
    產品名稱: order.product_name || '',
    規格: order.spec || '',
    數量: order.quantity ?? '',
    單價: order.unit_price ?? '',
    總價: order.total_price ?? '',
    供應商: order.supplier || '',
    來源: order.source || '',
    付款狀態: getPaymentStatusLabel(order.payment_status),
    付款方式: getPaymentMethodLabel(order.payment_method),
    出貨狀態: getShippingStatusLabel(order.shipping_status),
    備註: order.note || '',
  }))
}

export function ExportButton({ orders }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExportCSV = () => {
    setIsExporting(true)
    
    try {
      const headers = [
        '日期',
        '批次',
        '客戶名稱',
        '產品名稱',
        '規格',
        '數量',
        '單價',
        '總價',
        '供應商',
        '來源',
        '付款狀態',
        '付款方式',
        '出貨狀態',
        '備註',
      ]

      const rows = orders.map((order) => [
        escapeCSV(formatDate(order.date)),
        escapeCSV(order.batch),
        escapeCSV(order.customer_name),
        escapeCSV(order.product_name),
        escapeCSV(order.spec),
        escapeCSV(order.quantity),
        escapeCSV(order.unit_price),
        escapeCSV(order.total_price),
        escapeCSV(order.supplier),
        escapeCSV(order.source),
        escapeCSV(getPaymentStatusLabel(order.payment_status)),
        escapeCSV(getPaymentMethodLabel(order.payment_method)),
        escapeCSV(getShippingStatusLabel(order.shipping_status)),
        escapeCSV(order.note),
      ])

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
      
      // Add BOM for Excel compatibility with Chinese characters
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `訂單_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportExcel = () => {
    setIsExporting(true)
    
    try {
      const data = getOrderData(orders)
      const ws = XLSX.utils.json_to_sheet(data)
      
      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, // 日期
        { wch: 12 }, // 批次
        { wch: 15 }, // 客戶名稱
        { wch: 15 }, // 產品名稱
        { wch: 12 }, // 規格
        { wch: 8 },  // 數量
        { wch: 10 }, // 單價
        { wch: 12 }, // 總價
        { wch: 15 }, // 供應商
        { wch: 12 }, // 來源
        { wch: 10 }, // 付款狀態
        { wch: 10 }, // 付款方式
        { wch: 10 }, // 出貨狀態
        { wch: 20 }, // 備註
      ]
      
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '訂單')
      XLSX.writeFile(wb, `訂單_${new Date().toISOString().split('T')[0]}.xlsx`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting || orders.length === 0} className="shadow-sm">
          {isExporting ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          匯出
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileText className="mr-2 h-4 w-4" />
          匯出 CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          匯出 Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
