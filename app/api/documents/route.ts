/**
 * POST /api/documents  — Upload tài liệu (admin only)
 * GET  /api/documents  — Danh sách tài liệu
 */
import { NextRequest, NextResponse } from 'next/server'
import { DATABASE_TYPE, DatabaseType } from '@/lib/config/database'
import { documentRepo } from '@/lib/repositories/documentRepository'
import { processDocument } from '@/lib/services/documentService'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(request: NextRequest) {
  if (DATABASE_TYPE === DatabaseType.INMEMORY) {
    return NextResponse.json(
      { error: 'Tính năng upload tài liệu cần cấu hình DATABASE_URL' },
      { status: 503 }
    )
  }

  try {
    const formData = await request.formData()
    const file        = formData.get('file')      as File | null
    const title       = formData.get('title')     as string | null
    const subject     = formData.get('subject')   as string | null
    const countStr    = formData.get('count')     as string | null

    // Lấy userId từ header do middleware inject (an toàn hơn formData)
    const uploadedBy  = request.headers.get('x-user-id')

    if (!file || !title || !subject || !uploadedBy) {
      return NextResponse.json(
        { error: 'Thiếu file, title, subject hoặc thông tin xác thực' },
        { status: 400 }
      )
    }

    // Kiểm tra loại file
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'docx'].includes(ext ?? '')) {
      return NextResponse.json(
        { error: 'Chỉ hỗ trợ PDF và DOCX' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File quá lớn (tối đa 10 MB)' },
        { status: 400 }
      )
    }

    // Tạo document record
    const doc = await documentRepo.create({
      uploadedBy,
      title: title.trim(),
      fileName: file.name,
      fileType: ext as 'pdf' | 'docx',
      fileSize: file.size,
      subject: subject.trim(),
    })

    // Xử lý bất đồng bộ (không block response)
    const buffer = Buffer.from(await file.arrayBuffer())
    const count  = Math.min(Math.max(parseInt(countStr ?? '10'), 5), 30)

    // Fire-and-forget — client poll GET /api/documents/:id để lấy trạng thái
    processDocument(doc.id, buffer, ext as 'pdf' | 'docx', subject, uploadedBy, count)
      .catch(err => console.error(`[Doc ${doc.id}] Lỗi xử lý:`, err))

    return NextResponse.json(
      { document: doc, message: 'Upload thành công, đang xử lý...' },
      { status: 201 }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  if (DATABASE_TYPE === DatabaseType.INMEMORY) {
    return NextResponse.json([])
  }

  try {
    const subject = request.nextUrl.searchParams.get('subject') ?? undefined
    const docs = await documentRepo.findAll(subject)
    return NextResponse.json(docs)
  } catch (err) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
