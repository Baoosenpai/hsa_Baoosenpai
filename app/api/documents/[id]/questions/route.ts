import { NextRequest, NextResponse } from 'next/server'
import { DATABASE_TYPE, DatabaseType } from '@/lib/config/database'
import { questionRepo } from '@/lib/repositories/documentRepository'

/** GET /api/documents/:id/questions — lấy tất cả câu hỏi của document */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (DATABASE_TYPE === DatabaseType.INMEMORY) {
    return NextResponse.json([])
  }

  const questions = await questionRepo.findByDocumentId(params.id)
  return NextResponse.json(questions)
}
