import { NextRequest, NextResponse } from 'next/server'

function decodeJwt(token: string): { userId?: number } | null {
  try {
    let part = token.split('.')[1]
    part = part.replace(/-/g, '+').replace(/_/g, '/')
    part += '='.repeat((4 - (part.length % 4)) % 4)
    return JSON.parse(atob(part))
  } catch {
    return null
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // El webhook de n8n se autentica con su propio secreto, no con la cookie de sesión.
  if (pathname.startsWith('/api/webhooks/')) return NextResponse.next()
  if (pathname.startsWith('/api/auth/')) return NextResponse.next()

  const token = req.cookies.get('auth_token')?.value
  const payload = token ? decodeJwt(token) : null

  if (pathname.startsWith('/api/')) {
    if (!payload?.userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    return NextResponse.next()
  }

  if (pathname.startsWith('/dashboard') && !payload?.userId) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
