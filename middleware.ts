/**
 * Next.js Middleware — bảo vệ các route cần auth
 * Chạy trên Edge runtime → dùng Web Crypto API (không dùng Node.js 'crypto')
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'

const ADMIN_PREFIXES   = ['/admin', '/api/users', '/api/documents']
const AUTHED_PREFIXES  = ['/api/quiz-results']

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  // Page navigation — token stored in cookie 'token'
  return req.cookies.get('token')?.value ?? null
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isAdmin   = ADMIN_PREFIXES.some(p => pathname.startsWith(p))
  const isAuthed  = isAdmin || AUTHED_PREFIXES.some(p => pathname.startsWith(p))

  if (!isAuthed) return NextResponse.next()

  const token = getToken(req)

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const payload = await verifyToken(token)

    if (isAdmin && payload.role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/', req.url))
    }

    const headers = new Headers(req.headers)
    headers.set('x-user-id',   payload.userId)
    headers.set('x-user-role', payload.role)
    return NextResponse.next({ request: { headers } })
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Token không hợp lệ hoặc đã hết hạn' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/users/:path*',
    '/api/documents',
    '/api/documents/:path*',
    '/api/quiz-results/:path*',
  ],
}
