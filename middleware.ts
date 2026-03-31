import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  
  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/', '/inventory', '/finance', '/stats']
  const isProtectedPath = protectedPaths.some(
    (path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  )
  
  if (isProtectedPath && !request.nextUrl.pathname.startsWith('/login')) {
    const supabaseResponse = response
    const hasSession = supabaseResponse.cookies.get('sb-access-token') || 
                       supabaseResponse.headers.get('x-supabase-auth')
    
    // Check for auth cookie
    const allCookies = request.cookies.getAll()
    const hasAuthCookie = allCookies.some(c => c.name.includes('auth-token') || c.name.includes('sb-'))
    
    if (!hasAuthCookie && request.nextUrl.pathname !== '/login') {
      // Let the page handle auth check - middleware just refreshes session
    }
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
