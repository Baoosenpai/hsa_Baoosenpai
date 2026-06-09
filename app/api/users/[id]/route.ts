import { NextRequest, NextResponse } from 'next/server'
import { serverStore } from '@/lib/store/serverStore'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await serverStore.getUserById(params.id)
  if (!user) return NextResponse.json({ error: 'Không tìm thấy user' }, { status: 404 })
  return NextResponse.json({ ...user, password: '' })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await serverStore.getUserById(params.id)
    if (!user) return NextResponse.json({ error: 'Không tìm thấy user' }, { status: 404 })

    const body = await request.json()
    const updated = { ...user, ...body, id: user.id, createdAt: user.createdAt, updatedAt: new Date() }
    await serverStore.saveUser(updated)
    return NextResponse.json({ ...updated, password: '' })
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await serverStore.deleteUser(params.id)
  return NextResponse.json({ message: 'Đã xoá user' })
}
