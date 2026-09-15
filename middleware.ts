import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Rutas públicas que no necesitan auth
  const publicPaths = ['/login', '/register', '/preview']
  if (publicPaths.some((p) => path.startsWith(p))) {
    return NextResponse.next()
  }

  // Verificar sesión solo con la cookie (sin llamada a Supabase)
  const hasSession = request.cookies.getAll().some((c) =>
    c.name.includes('auth-token') || c.name.includes('sb-')
  )

  if (!hasSession && (path.startsWith('/dashboard') || path.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
