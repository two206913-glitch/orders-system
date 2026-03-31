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
import type { Payment } from '@/lib/types/payment'
import { formatDate, getPaymentMethodLabel, getPaymentTypeLabel } from '@/lib/locale'
import * as XLSX from 'xlsx'

interface PaymentExportButtonProps {
  payments: Payment[]
  type: 'receipt' | 'payment'
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function getPaymentData(payments: Payment[]) {
  return payments.map((p) => ({
    日期: formatDate(p.date),
    類型: getPaymentTypeLabel(p.type),
    對象: p.party_name,
    金額: p.amount,
    付款方式: getPaymentMethodLabel(p.payment_method),
    備註: p.note || '',
  }))
}

export function PaymentExportButton({ payments, type }: PaymentExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const typeName = type === 'receipt' ? '收款' : '付款'

  const handleExportCSV = () => {
    setIsExporting(true)
    
    try {
      const headers = ['日期', '類型', '對象', '金額', '付款方式', '備註']

      const rows = payments.map((p) => [
        escapeCSV(formatDate(p.date)),
        escapeCSV(getPaymentTypeLabel(p.type)),
        escapeCSV(p.party_name),
        escapeCSV(p.amount),
        escapeCSV(getPaymentMethodLabel(p.payment_method)),
        escapeCSV(p.note),
      ])

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
      
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${typeName}紀錄_${new Date().toISOString().split('T')[0]}.csv`
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
      const data = getPaymentData(payments)
      const ws = XLSX.utils.json_to_sheet(data)
      
      ws['!cols'] = [
        { wch: 12 },
        { wch: 10 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 20 },
      ]
      
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, typeName)
      XLSX.writeFile(wb, `${typeName}紀錄_${new Date().toISOString().split('T')[0]}.xlsx`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting || payments.length === 0} className="shadow-sm">
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
