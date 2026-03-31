import { Suspense } from 'react'
import { OrdersHeader } from '@/components/orders/orders-header'
import { OrdersTable } from '@/components/orders/orders-table'
import { StatsCards } from '@/components/orders/stats-cards'
import { getOrders, getOrderStats } from '@/app/actions/orders'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

interface PageProps {
  searchParams: Promise<{
    search?: string
    payment?: string
    shipping?: string
    type?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    page?: string
    pageSize?: string
  }>
}

async function StatsContent() {
  const stats = await getOrderStats()
  return <StatsCards stats={stats} />
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function OrdersContent({
  searchParams,
}: {
  searchParams: {
    search?: string
    payment?: string
    shipping?: string
    type?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    page?: string
    pageSize?: string
  }
}) {
  const page = parseInt(searchParams.page || '1', 10)
  const pageSize = parseInt(searchParams.pageSize || '10', 10)
  
  const { orders, total } = await getOrders({
    ...searchParams,
    page,
    pageSize,
  })
  
  return (
    <>
      <Suspense fallback={null}>
        <OrdersHeader orders={orders} />
      </Suspense>
      <div className="mt-6">
        <OrdersTable 
          orders={orders} 
          total={total} 
          currentPage={page} 
          pageSize={pageSize}
        />
      </div>
    </>
  )
}

function OrdersTableSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const params = await searchParams
  
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 pt-16 lg:pt-8 sm:px-6 lg:px-8">
        <Suspense fallback={<StatsSkeleton />}>
          <StatsContent />
        </Suspense>
        <div className="mt-8">
          <Suspense fallback={<OrdersTableSkeleton />}>
            <OrdersContent searchParams={params} />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
