'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface YearSelectorProps {
  years: number[]
  selectedYear: number
}

export function YearSelector({ years, selectedYear }: YearSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleYearChange = (year: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('year', year)
    router.push(`/stats?${params.toString()}`)
  }

  return (
    <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
      <SelectTrigger className="w-32">
        <SelectValue placeholder="選擇年份" />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={year.toString()}>
            {year} 年
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
