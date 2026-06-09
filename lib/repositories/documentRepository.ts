import { query, transaction } from '@/lib/db/postgres'

// ─── Types ────────────────────────────────────────────────────

export interface Document {
  id: string
  uploadedBy: string
  title: string
  fileName: string
  fileType: 'pdf' | 'docx'
  fileSize: number
  rawText?: string
  status: 'pending' | 'processing' | 'done' | 'error'
  errorMsg?: string
  subject?: string
  createdAt: Date
  updatedAt: Date
}

export interface Question {
  id: string
  documentId?: string
  createdBy?: string
  content: string
  explanation?: string
  subject?: string
  difficulty: 'easy' | 'medium' | 'hard'
  source: 'ai_generated' | 'parsed' | 'manual'
  isActive: boolean
  options: Option[]
  createdAt: Date
}

export interface Option {
  id: string
  questionId: string
  label: string   // A B C D
  content: string
  isCorrect: boolean
}

// ─── Row mappers ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToDocument(r: any): Document {
  return {
    id: r.id, uploadedBy: r.uploaded_by, title: r.title,
    fileName: r.file_name, fileType: r.file_type, fileSize: r.file_size,
    rawText: r.raw_text, status: r.status, errorMsg: r.error_msg,
    subject: r.subject, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToQuestion(r: any, options: Option[] = []): Question {
  return {
    id: r.id, documentId: r.document_id, createdBy: r.created_by,
    content: r.content, explanation: r.explanation, subject: r.subject,
    difficulty: r.difficulty, source: r.source, isActive: r.is_active,
    options, createdAt: r.created_at,
  }
}

// ─── Document Repository ──────────────────────────────────────

export class DocumentRepository {
  async create(data: {
    uploadedBy: string
    title: string
    fileName: string
    fileType: 'pdf' | 'docx'
    fileSize: number
    subject?: string
  }): Promise<Document> {
    const rows = await query(
      `INSERT INTO documents (uploaded_by, title, file_name, file_type, file_size, subject)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [data.uploadedBy, data.title, data.fileName, data.fileType, data.fileSize, data.subject ?? null]
    )
    return rowToDocument(rows[0])
  }

  async updateStatus(
    id: string,
    status: Document['status'],
    rawText?: string,
    errorMsg?: string
  ): Promise<void> {
    await query(
      `UPDATE documents SET status=$1, raw_text=$2, error_msg=$3 WHERE id=$4`,
      [status, rawText ?? null, errorMsg ?? null, id]
    )
  }

  async findById(id: string): Promise<Document | null> {
    const rows = await query(`SELECT * FROM documents WHERE id=$1`, [id])
    return rows[0] ? rowToDocument(rows[0]) : null
  }

  async findAll(subject?: string): Promise<Document[]> {
    if (subject) {
      const rows = await query(
        `SELECT * FROM documents WHERE subject=$1 ORDER BY created_at DESC`, [subject]
      )
      return rows.map(rowToDocument)
    }
    const rows = await query(`SELECT * FROM documents ORDER BY created_at DESC`)
    return rows.map(rowToDocument)
  }

  async delete(id: string): Promise<void> {
    await query(`DELETE FROM documents WHERE id=$1`, [id])
  }
}

// ─── Question Repository ──────────────────────────────────────

export class QuestionRepository {
  /** Lưu nhiều câu hỏi + options trong 1 transaction */
  async bulkCreate(questions: Array<{
    documentId: string
    createdBy: string
    content: string
    explanation?: string
    subject?: string
    difficulty: 'easy' | 'medium' | 'hard'
    source: 'ai_generated' | 'parsed' | 'manual'
    options: Array<{ label: string; content: string; isCorrect: boolean }>
  }>): Promise<Question[]> {
    return transaction(async (client) => {
      const result: Question[] = []

      for (const q of questions) {
        const qRows = await client.query(
          `INSERT INTO questions (document_id, created_by, content, explanation, subject, difficulty, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [q.documentId, q.createdBy, q.content, q.explanation ?? null,
           q.subject ?? null, q.difficulty, q.source]
        )
        const qRow = qRows.rows[0]

        const opts: Option[] = []
        for (const o of q.options) {
          const oRows = await client.query(
            `INSERT INTO options (question_id, label, content, is_correct)
             VALUES ($1,$2,$3,$4) RETURNING *`,
            [qRow.id, o.label, o.content, o.isCorrect]
          )
          const or = oRows.rows[0]
          opts.push({ id: or.id, questionId: or.question_id, label: or.label, content: or.content, isCorrect: or.is_correct })
        }

        result.push(rowToQuestion(qRow, opts))
      }

      return result
    })
  }

  /** Lấy câu hỏi theo document, kèm options */
  async findByDocumentId(documentId: string): Promise<Question[]> {
    const qRows = await query(
      `SELECT * FROM questions WHERE document_id=$1 AND is_active=TRUE ORDER BY created_at`,
      [documentId]
    )
    if (!qRows.length) return []

    const ids = qRows.map((r: any) => r.id)
    const oRows = await query(
      `SELECT * FROM options WHERE question_id = ANY($1::uuid[])`,
      [ids]
    )

    return qRows.map((r: any) => {
      const opts = oRows
        .filter((o: any) => o.question_id === r.id)
        .map((o: any) => ({ id: o.id, questionId: o.question_id, label: o.label, content: o.content, isCorrect: o.is_correct }))
      return rowToQuestion(r, opts)
    })
  }

  /** Lấy ngẫu nhiên N câu theo subject/difficulty */
  async findRandom(opts: {
    subject?: string
    difficulty?: string
    limit?: number
  }): Promise<Question[]> {
    const conditions: string[] = ['q.is_active = TRUE']
    const params: unknown[] = []

    if (opts.subject) {
      params.push(opts.subject)
      conditions.push(`q.subject = $${params.length}`)
    }
    if (opts.difficulty) {
      params.push(opts.difficulty)
      conditions.push(`q.difficulty = $${params.length}`)
    }

    params.push(opts.limit ?? 50)
    const limitIdx = params.length

    const qRows = await query(
      `SELECT q.* FROM questions q
       WHERE ${conditions.join(' AND ')}
       ORDER BY RANDOM()
       LIMIT $${limitIdx}`,
      params
    )
    if (!qRows.length) return []

    const ids = qRows.map((r: any) => r.id)
    const oRows = await query(
      `SELECT * FROM options WHERE question_id = ANY($1::uuid[])`, [ids]
    )

    return qRows.map((r: any) => {
      const options = oRows
        .filter((o: any) => o.question_id === r.id)
        .map((o: any) => ({ id: o.id, questionId: o.question_id, label: o.label, content: o.content, isCorrect: o.is_correct }))
      return rowToQuestion(r, options)
    })
  }

  async countByDocument(documentId: string): Promise<number> {
    const rows = await query(
      `SELECT COUNT(*) AS cnt FROM questions WHERE document_id=$1 AND is_active=TRUE`,
      [documentId]
    )
    return parseInt((rows[0] as any).cnt)
  }

  async deactivateByDocument(documentId: string): Promise<void> {
    await query(`UPDATE questions SET is_active=FALSE WHERE document_id=$1`, [documentId])
  }
}

export const documentRepo = new DocumentRepository()
export const questionRepo = new QuestionRepository()
