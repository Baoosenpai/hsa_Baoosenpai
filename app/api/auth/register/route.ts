import { NextRequest, NextResponse } from 'next/server'
import { createUserRepository } from '@/lib/config/database'
import { serverStore } from '@/lib/store/serverStore'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const repo = createUserRepository()

    // Validation + tạo user qua repository (bcrypt hash bên trong)
    const user = await repo.create({
      name:            body.name?.trim(),
      email:           body.email?.trim().toLowerCase(),
      password:        body.password,
      confirmPassword: body.confirmPassword,
    })

    const token = await serverStore.generateToken(user)

    return NextResponse.json(
      { user: { ...user, password: '' }, token, message: 'Đăng ký thành công!' },
      { status: 201 }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi server'
    const status = msg.includes('đã được sử dụng') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
