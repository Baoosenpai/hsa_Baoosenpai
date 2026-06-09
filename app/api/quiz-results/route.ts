import { NextRequest, NextResponse } from 'next/server'
import { DATABASE_TYPE, DatabaseType } from '@/lib/config/database'

/**
 * POST /api/quiz-results
 * Lưu kết quả bài thi
 */
export async function POST(request: NextRequest) {
  try {
    if (DATABASE_TYPE === DatabaseType.INMEMORY) {
      return NextResponse.json({ ok: true, stored: 'localStorage' })
    }

    const { PostgresQuizRepository } = await import('@/lib/repositories/postgresUserRepository')
    const quizRepo = new PostgresQuizRepository()
    const body = await request.json()

    const result = await quizRepo.save({
      user_id:    body.userId   || null,
      score:      Number(body.score),
      correct:    Number(body.correct),
      total:      Number(body.total),
      percentage: parseFloat(body.percentage),
      time_spent: body.timeSpent || null,
      subjects:   body.subjects  || null,
      flagged:    Number(body.flagged) || 0,
    })

    return NextResponse.json({ ok: true, id: result.id }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Lỗi lưu kết quả' }, { status: 500 })
  }
}

/**
 * GET /api/quiz-results?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    if (DATABASE_TYPE === DatabaseType.INMEMORY) {
      return NextResponse.json({ results: [], source: 'localStorage' })
    }

    const userId = request.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 })
    }

    const { PostgresQuizRepository } = await import('@/lib/repositories/postgresUserRepository')
    const quizRepo = new PostgresQuizRepository()
    const results = await quizRepo.findByUserId(userId)
    const stats   = await quizRepo.getStats(userId)

    return NextResponse.json({ results, stats })
  } catch (err) {
    return NextResponse.json({ error: 'Lỗi lấy lịch sử' }, { status: 500 })
  }
}
