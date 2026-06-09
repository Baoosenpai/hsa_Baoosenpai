import { NextRequest, NextResponse } from 'next/server'
import { DATABASE_TYPE, DatabaseType } from '@/lib/config/database'
import { documentRepo, questionRepo } from '@/lib/repositories/documentRepository'

const INMEMORY_RESPONSE = NextResponse.json(
  { error: 'Tính năng này cần cấu hình DATABASE_URL' },
  { status: 503 }
)

/** GET /api/documents/:id — poll trạng thái xử lý */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (DATABASE_TYPE === DatabaseType.INMEMORY) return INMEMORY_RESPONSE

  const doc = await documentRepo.findById(params.id)
  if (!doc) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })

  const questionCount = doc.status === 'done'
    ? await questionRepo.countByDocument(params.id)
    : 0

  return NextResponse.json({ ...doc, questionCount })
}

/** DELETE /api/documents/:id */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (DATABASE_TYPE === DatabaseType.INMEMORY) return INMEMORY_RESPONSE

  await questionRepo.deactivateByDocument(params.id)
  await documentRepo.delete(params.id)
  return NextResponse.json({ message: 'Đã xoá tài liệu và câu hỏi liên quan' })
}
