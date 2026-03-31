'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
}

export function Pagination({ currentPage, totalPages, pageSize, totalItems }: PaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`?${params.toString()}`)
  }

  const handlePageSizeChange = (size: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('pageSize', size)
    params.set('page', '1')
    router.push(`?${params.toString()}`)
  }

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4">
      <div className="text-sm text-muted-foreground">
        顯示第 <span className="font-medium">{startItem}</span> 至{' '}
        <span className="font-medium">{endItem}</span> 筆，共{' '}
        <span className="font-medium">{totalItems.toLocaleString('zh-TW')}</span> 筆訂單
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">每頁顯示</span>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">上一頁</span>
          </Button>
          <div className="flex items-center gap-1 px-2">
            <span className="text-sm text-muted-foreground">
              第 {currentPage} / {totalPages || 1} 頁
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">下一頁</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
