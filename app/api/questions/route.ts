/**
 * GET /api/questions?subject=Toán&difficulty=medium&limit=20
 * Lấy câu hỏi ngẫu nhiên để dùng trong quiz
 */
import { NextRequest, NextResponse } from 'next/server'
import { DATABASE_TYPE, DatabaseType } from '@/lib/config/database'
import { questionRepo } from '@/lib/repositories/documentRepository'

export async function GET(request: NextRequest) {
  // Không có DB → trả về mảng rỗng (quiz sẽ hiển thị empty-state)
  if (DATABASE_TYPE === DatabaseType.INMEMORY) {
    return NextResponse.json([])
  }

  try {
    const { searchParams } = request.nextUrl
    const subject    = searchParams.get('subject')    ?? undefined
    const difficulty = searchParams.get('difficulty') ?? undefined
    const limit      = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

    const questions = await questionRepo.findRandom({ subject, difficulty, limit })
    return NextResponse.json(questions)
  } catch (err) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
