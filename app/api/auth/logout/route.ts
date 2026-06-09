import { NextResponse } from 'next/server'

// Logout được xử lý hoàn toàn ở client (xoá localStorage session)
// Server chỉ trả về 200 để confirm
export async function POST() {
  return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 })
}
