'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { useAuth } from '@/components/providers/auth-provider'
import { Loader2 } from 'lucide-react'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { loading, user } = useAuth()
  const isLoginPage = pathname === '/login'

  // Show loading spinner while checking auth
  if (loading && !isLoginPage) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Login page - no sidebar
  if (isLoginPage) {
    return <>{children}</>
  }

  // Not logged in - children will handle redirect
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Logged in - show sidebar + content
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  )
}
