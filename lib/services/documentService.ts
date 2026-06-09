/**
 * Document Service
 * 1. Parse PDF / DOCX → raw text
 * 2. Gửi text lên Gemini Flash API → sinh câu hỏi từng câu một
 * 3. Lưu questions + options vào PostgreSQL
 */

import { documentRepo, questionRepo } from '@/lib/repositories/documentRepository'

// ─── Parse helpers ────────────────────────────────────────────

export async function extractText(
  buffer: Buffer,
  fileType: 'pdf' | 'docx'
): Promise<string> {
  if (fileType === 'pdf') {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text.trim()
  }

  if (fileType === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  }

  throw new Error('Định dạng file không hỗ trợ')
}

// ─── Types ───────────────────────────────────────────────────

export interface GeneratedQuestion {
  content: string
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
  options: { label: string; content: string; isCorrect: boolean }[]
}

// ─── Gemini: sinh MỘT câu hỏi ────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

async function generateOneQuestion(
  rawText: string,
  subject: string,
  index: number,
  total: number,
  existingQuestions: string[] = []
): Promise<GeneratedQuestion | null> {
  const difficulty: 'easy' | 'medium' | 'hard' =
    index % 3 === 0 ? 'easy' : index % 3 === 1 ? 'medium' : 'hard'

  const avoidList = existingQuestions.length > 0
    ? `\nTránh trùng lặp với các câu hỏi đã sinh:\n${existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : ''

  const prompt = `Bạn là chuyên gia ra đề thi môn ${subject}.
Từ nội dung tài liệu dưới đây, hãy sinh ra MỘT câu hỏi trắc nghiệm số ${index + 1}/${total} với độ khó: ${difficulty}.${avoidList}

Yêu cầu:
- Câu hỏi rõ ràng, chính xác, có trong tài liệu
- 4 lựa chọn A/B/C/D, chỉ 1 đáp án đúng
- Có giải thích tại sao đáp án đúng

Trả về JSON THUẦN (không markdown, không backtick):
{
  "content": "Câu hỏi?",
  "explanation": "Giải thích đáp án đúng",
  "difficulty": "${difficulty}",
  "options": [
    { "label": "A", "content": "...", "isCorrect": false },
    { "label": "B", "content": "...", "isCorrect": true },
    { "label": "C", "content": "...", "isCorrect": false },
    { "label": "D", "content": "...", "isCorrect": false }
  ]
}

Nội dung tài liệu:
${rawText.slice(0, 8000)}`

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[Gemini] Câu ${index + 1} lỗi:`, err)
      return null
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const cleaned = text.replace(/```json|```/g, '').trim()

    const q = JSON.parse(cleaned) as GeneratedQuestion
    if (
      !q.content ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      !q.options.some(o => o.isCorrect)
    ) return null

    return q
  } catch (err) {
    console.error(`[Gemini] Parse lỗi câu ${index + 1}:`, err)
    return null
  }
}

// ─── Sinh nhiều câu, từng câu một ────────────────────────────

export async function generateQuestionsOneByOne(
  rawText: string,
  subject: string,
  count = 10,
  onProgress?: (current: number, total: number, question: GeneratedQuestion) => void
): Promise<GeneratedQuestion[]> {
  const results: GeneratedQuestion[] = []
  const existingContents: string[] = []

  for (let i = 0; i < count; i++) {
    const q = await generateOneQuestion(rawText, subject, i, count, existingContents)
    if (q) {
      results.push(q)
      existingContents.push(q.content)
      onProgress?.(results.length, count, q)
    }

    // Delay để tránh rate limit — Gemini Flash free tier: 15 RPM (~1 req/4s)
    if (i < count - 1) {
      await new Promise(r => setTimeout(r, 4500))
    }
  }

  return results
}

// ─── Orchestrator ─────────────────────────────────────────────

export async function processDocument(
  documentId: string,
  buffer: Buffer,
  fileType: 'pdf' | 'docx',
  subject: string,
  uploadedBy: string,
  questionCount = 10,
  onProgress?: (current: number, total: number, question: GeneratedQuestion) => void
): Promise<{ questionsCreated: number }> {
  await documentRepo.updateStatus(documentId, 'processing')

  let rawText: string
  try {
    rawText = await extractText(buffer, fileType)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi parse file'
    await documentRepo.updateStatus(documentId, 'error', undefined, msg)
    throw err
  }

  if (!rawText || rawText.length < 100) {
    const msg = 'Tài liệu không có nội dung đọc được'
    await documentRepo.updateStatus(documentId, 'error', undefined, msg)
    throw new Error(msg)
  }

  await documentRepo.updateStatus(documentId, 'processing', rawText)

  // Sinh từng câu một
  let generated: GeneratedQuestion[]
  try {
    generated = await generateQuestionsOneByOne(rawText, subject, questionCount, onProgress)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi AI'
    await documentRepo.updateStatus(documentId, 'error', rawText, msg)
    throw err
  }

  if (!generated.length) {
    const msg = 'AI không sinh được câu hỏi từ tài liệu này'
    await documentRepo.updateStatus(documentId, 'error', rawText, msg)
    throw new Error(msg)
  }

  // Lưu vào DB
  await questionRepo.bulkCreate(
    generated.map(q => ({
      documentId,
      createdBy: uploadedBy,
      content: q.content,
      explanation: q.explanation,
      subject,
      difficulty: q.difficulty,
      source: 'ai_generated' as const,
      options: q.options,
    }))
  )

  await documentRepo.updateStatus(documentId, 'done', rawText)

  return { questionsCreated: generated.length }
}
