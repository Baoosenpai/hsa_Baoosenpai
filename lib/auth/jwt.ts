/**
 * JWT helpers — HS256 dùng Web Crypto API
 * Tương thích cả Node.js (server) lẫn Edge runtime (middleware)
 */

import { User } from '@/lib/types/user'

const EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60 // 7 ngày

export interface JwtPayload {
  userId: string
  email: string
  role: string
  iat: number
  exp: number
}

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf
  let str = ''
  bytes.forEach(b => (str += String.fromCharCode(b)))
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function encodeJSON(obj: unknown): string {
  return b64url(new TextEncoder().encode(JSON.stringify(obj)))
}

async function getKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(secret)
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, usage)
}

function getSecret(): string {
  // Works in both Node (process.env) and Edge (env vars injected by Next.js)
  return (typeof process !== 'undefined' && process.env?.JWT_SECRET) || 'CHANGE_THIS_IN_PRODUCTION'
}

export async function signToken(user: User): Promise<string> {
  const header  = encodeJSON({ alg: 'HS256', typ: 'JWT' })
  const now     = Math.floor(Date.now() / 1000)
  const payload = encodeJSON({
    userId: user.id,
    email:  user.email,
    role:   user.role,
    iat:    now,
    exp:    now + EXPIRES_IN_SECONDS,
  })

  const key = await getKey(getSecret(), ['sign'])
  const sig  = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${payload}`))

  return `${header}.${payload}.${b64url(sig)}`
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Token không hợp lệ')

  const [header, payload, sig] = parts

  const key = await getKey(getSecret(), ['verify'])
  const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  const valid = await crypto.subtle.verify(
    'HMAC', key, sigBytes,
    new TextEncoder().encode(`${header}.${payload}`)
  )
  if (!valid) throw new Error('Token không hợp lệ hoặc đã bị giả mạo')

  const data = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as JwtPayload
  if (data.exp < Math.floor(Date.now() / 1000)) throw new Error('Token đã hết hạn')

  return data
}

export async function getTokenFromRequest(authHeader: string | null): Promise<JwtPayload | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    return await verifyToken(authHeader.slice(7))
  } catch {
    return null
  }
}
