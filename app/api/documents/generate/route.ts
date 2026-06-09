/**
 * POST /api/documents/generate
 * Upload file → extract text → sinh câu hỏi từng câu, stream progress qua SSE
 * Response: text/event-stream
 * Events:
 *   data: { type: 'start', total, documentId }
 *   data: { type: 'question', current, total, question: {...} }
 *   data: { type: 'done', questionsCreated }
 *   data: { type: 'error', message }
 */
import { NextRequest } from 'next/server'
import { DATABASE_TYPE, DatabaseType } from '@/lib/config/database'
import { documentRepo } from '@/lib/repositories/documentRepository'
import { processDocument } from '@/lib/services/documentService'

const MAX_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      if (DATABASE_TYPE === DatabaseType.INMEMORY) {
        send({ type: 'error', message: 'Tính năng này cần cấu hình DATABASE_URL' })
        controller.close()
        return
      }

      try {
        const formData = await request.formData()
        const file       = formData.get('file')    as File | null
        const title      = formData.get('title')   as string | null
        const subject    = formData.get('subject') as string | null
        const countStr   = formData.get('count')   as string | null

        // Lấy userId từ header do middleware inject (an toàn hơn formData)
        const uploadedBy = request.headers.get('x-user-id')

        if (!file || !title || !subject || !uploadedBy) {
          send({ type: 'error', message: 'Thiếu file, title, subject hoặc thông tin xác thực' })
          controller.close()
          return
        }

        const ext = file.name.split('.').pop()?.toLowerCase()
        if (!['pdf', 'docx'].includes(ext ?? '')) {
          send({ type: 'error', message: 'Chỉ hỗ trợ PDF và DOCX' })
          controller.close()
          return
        }

        if (file.size > MAX_SIZE) {
          send({ type: 'error', message: 'File quá lớn (tối đa 10 MB)' })
          controller.close()
          return
        }

        const doc = await documentRepo.create({
          uploadedBy,
          title: title.trim(),
          fileName: file.name,
          fileType: ext as 'pdf' | 'docx',
          fileSize: file.size,
          subject: subject.trim(),
        })

        const count = Math.min(Math.max(parseInt(countStr ?? '10'), 5), 30)

        send({ type: 'start', total: count, documentId: doc.id })

        const buffer = Buffer.from(await file.arrayBuffer())

        const { questionsCreated } = await processDocument(
          doc.id,
          buffer,
          ext as 'pdf' | 'docx',
          subject,
          uploadedBy,
          count,
          (current, total, question) => {
            send({ type: 'question', current, total, question })
          }
        )

        send({ type: 'done', questionsCreated, documentId: doc.id })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lỗi server'
        send({ type: 'error', message: msg })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
