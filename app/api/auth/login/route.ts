import { NextRequest, NextResponse } from 'next/server'
import { createUserRepository } from '@/lib/config/database'
import { serverStore } from '@/lib/store/serverStore'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email    = body.email?.trim().toLowerCase()
    const password = body.password

    if (!email || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập email và mật khẩu' }, { status: 400 })
    }

    const repo = createUserRepository()
    const user = await repo.findByEmail(email)

    if (!user) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
    }
    if (!user.isActive) {
      return NextResponse.json({ error: 'Tài khoản đã bị khóa' }, { status: 403 })
    }

    const valid = await repo.verifyPassword(email, password)
    if (!valid) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
    }

    const token = await serverStore.generateToken(user)

    return NextResponse.json(
      { user: { ...user, password: '' }, token, message: 'Đăng nhập thành công!' },
      { status: 200 }
    )
  } catch (err) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
