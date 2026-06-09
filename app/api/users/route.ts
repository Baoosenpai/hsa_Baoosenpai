import { NextResponse } from 'next/server'
import { serverStore } from '@/lib/store/serverStore'

export async function GET() {
  try {
    const users = (await serverStore.getAllUsers()).map(u => ({ ...u, password: '' }))
    return NextResponse.json(users, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
