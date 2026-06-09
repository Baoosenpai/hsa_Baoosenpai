/**
 * User Service Layer (Client-side)
 * Gọi API routes thay vì gọi trực tiếp DAO/localStorage
 */

import { User, LoginCredentials, RegisterData, AuthResponse } from '@/lib/types/user'

const SESSION_KEY = 'exam_academy_session'
const COOKIE_NAME = 'token'

class UserService {
  // ─── Cookie helpers ───────────────────────────────────────────────────────

  private setCookie(token: string) {
    if (typeof document === 'undefined') return
    // SameSite=Lax cho phép navigation request gửi kèm cookie
    // Không dùng HttpOnly vì đây là client-side JS — chấp nhận đánh đổi
    const maxAge = 7 * 24 * 60 * 60
    document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`
  }

  private clearCookie() {
    if (typeof document === 'undefined') return
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
  }

  // ─── Session helpers (localStorage, chỉ chạy ở client) ───────────────────

  private saveSession(user: User, token: string) {
    if (typeof window === 'undefined') return
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }))
    this.setCookie(token)          // đồng thời lưu cookie để middleware đọc được
  }

  private clearSession() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(SESSION_KEY)
    this.clearCookie()
  }

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    try { return JSON.parse(raw).user } catch { return null }
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    try { return JSON.parse(raw).token } catch { return null }
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser()
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  async register(data: RegisterData): Promise<AuthResponse> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Đăng ký thất bại')
    this.saveSession(json.user, json.token)
    return json
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Đăng nhập thất bại')
    this.saveSession(json.user, json.token)
    return json
  }

  async logout(): Promise<void> {
    this.clearSession()
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore network error — session đã xoá ở client
    }
  }

  // ─── User CRUD ────────────────────────────────────────────────────────────

  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    const token = this.getToken()
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Cập nhật thất bại')
    this.saveSession(json, this.getToken()!)
    return json
  }

  async getUserById(userId: string): Promise<User | null> {
    const res = await fetch(`/api/users/${userId}`)
    if (res.status === 404) return null
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    return json
  }

  async getAllUsers(): Promise<User[]> {
    const token = this.getToken()
    const res = await fetch('/api/users', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    return json
  }
}

export const userService = new UserService()
