'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'

interface DocumentRecord {
  id: string
  title: string
  fileName: string
  fileType: string
  fileSize: number
  subject: string
  status: 'pending' | 'processing' | 'done' | 'error'
  errorMsg?: string
  questionCount: number
  createdAt: string
}

interface LiveQuestion {
  content: string
  difficulty: 'easy' | 'medium' | 'hard'
  options: { label: string; content: string; isCorrect: boolean }[]
  explanation: string
}

const SUBJECTS = ['Toán', 'Lý', 'Hóa', 'Sinh', 'Văn', 'Sử', 'Địa', 'Anh', 'Khác']

const DIFF_MAP = {
  easy:   { label: 'Dễ',    cls: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  medium: { label: 'Trung', cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  hard:   { label: 'Khó',   cls: 'bg-red-500/20 text-red-400 border border-red-500/30' },
}

function StatusBadge({ status }: { status: DocumentRecord['status'] }) {
  const map = {
    pending:    { label: 'Chờ xử lý',  cls: 'bg-slate-100 text-slate-600' },
    processing: { label: 'Đang xử lý', cls: 'bg-blue-100 text-blue-600 animate-pulse' },
    done:       { label: 'Hoàn thành', cls: 'bg-green-100 text-green-700' },
    error:      { label: 'Lỗi',        cls: 'bg-red-100 text-red-700' },
  }
  const { label, cls } = map[status]
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function AdminPage() {
  const [docs, setDocs]               = useState<DocumentRecord[]>([])
  const [loading, setLoading]         = useState(true)
  const [uploading, setUploading]     = useState(false)
  const [error, setError]             = useState('')
  const [form, setForm]               = useState({ title: '', subject: SUBJECTS[0], count: '10' })
  const [file, setFile]               = useState<File | null>(null)
  const [dragOver, setDragOver]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Live generation state
  const [generating, setGenerating]   = useState(false)
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0 })
  const [liveQuestions, setLiveQuestions] = useState<LiveQuestion[]>([])
  const [genDocTitle, setGenDocTitle] = useState('')

  const loadDocs = async () => {
    try {
      const res = await fetch('/api/documents')
      const data = await res.json()
      const enriched = await Promise.all(
        data.map(async (d: DocumentRecord) => {
          const r = await fetch(`/api/documents/${d.id}`)
          return r.ok ? r.json() : d
        })
      )
      setDocs(enriched)
    } catch {
      setError('Không thể tải danh sách tài liệu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDocs() }, [])

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'docx'].includes(ext ?? '')) { setError('Chỉ hỗ trợ file PDF hoặc DOCX'); return }
    if (f.size > 10 * 1024 * 1024) { setError('File quá lớn (tối đa 10 MB)'); return }
    setFile(f)
    setError('')
    if (!form.title) setForm(p => ({ ...p, title: f.name.replace(/\.[^.]+$/, '') }))
  }

  const handleUpload = async () => {
    if (!file || !form.title || !form.subject) { setError('Vui lòng chọn file và điền đầy đủ thông tin'); return }
    const session = JSON.parse(localStorage.getItem('exam_academy_session') || '{}')
    const userId = session?.user?.id
    if (!userId) { setError('Vui lòng đăng nhập lại'); return }

    setUploading(true)
    setGenerating(true)
    setGenProgress({ current: 0, total: parseInt(form.count) })
    setLiveQuestions([])
    setGenDocTitle(form.title)
    setError('')

    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', form.title)
    fd.append('subject', form.subject)
    fd.append('userId', userId)
    fd.append('count', form.count)

    try {
      const res = await fetch('/api/documents/generate', { method: 'POST', body: fd })
      if (!res.ok || !res.body) throw new Error('Kết nối SSE thất bại')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          const dataLine = line.split('\n').find(l => l.startsWith('data: '))
          if (!dataLine) continue
          try {
            const evt = JSON.parse(dataLine.replace('data: ', ''))
            if (evt.type === 'question') {
              setGenProgress({ current: evt.current, total: evt.total })
              setLiveQuestions(prev => [...prev, evt.question])
            } else if (evt.type === 'done') {
              setGenProgress(p => ({ ...p, current: evt.questionsCreated }))
              setFile(null)
              setForm({ title: '', subject: SUBJECTS[0], count: '10' })
              if (fileRef.current) fileRef.current.value = ''
              await loadDocs()
            } else if (evt.type === 'error') {
              setError(evt.message)
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload thất bại')
    } finally {
      setUploading(false)
      setGenerating(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Xoá tài liệu "${title}" và tất cả câu hỏi liên quan?`)) return
    await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    await loadDocs()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <motion.header initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-3 cursor-pointer">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center font-bold text-white text-lg">Ε</div>
              <span className="text-white font-bold">Exam Academy</span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-full border border-amber-500/30">ADMIN</span>
            </motion.div>
          </Link>
          <Link href="/"><motion.button whileHover={{ scale: 1.05 }}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm">← Về trang chủ</motion.button>
          </Link>
        </div>
      </motion.header>

      <main className="pt-24 pb-16 px-6 max-w-6xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white">Quản lý tài liệu</h1>
          <p className="text-slate-400 mt-1">Upload PDF / DOCX — Gemini AI tự động sinh câu hỏi trắc nghiệm từng câu một</p>
        </motion.div>

        {/* Upload Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-slate-800 rounded-2xl border border-slate-700 p-8 space-y-6">
          <h2 className="text-lg font-bold text-white">Upload tài liệu mới</h2>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onClick={() => fileRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              dragOver ? 'border-blue-500 bg-blue-500/10' : file ? 'border-green-500 bg-green-500/10' : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            {file ? (
              <div className="space-y-2">
                <div className="text-3xl">📄</div>
                <p className="text-green-400 font-semibold">{file.name}</p>
                <p className="text-slate-500 text-sm">{fmtSize(file.size)}</p>
                <button onClick={e => { e.stopPropagation(); setFile(null) }}
                  className="text-xs text-red-400 hover:text-red-300 underline">Xoá file</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-4xl">📁</div>
                <p className="text-slate-300 font-medium">Kéo thả file vào đây hoặc click để chọn</p>
                <p className="text-slate-500 text-sm">PDF, DOCX — tối đa 10 MB</p>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-400 mb-2">Tiêu đề</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Tên tài liệu" maxLength={255}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Môn học</label>
              <select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500">
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Số câu cần sinh</label>
              <select value={form.count} onChange={e => setForm(p => ({ ...p, count: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500">
                {[5,10,15,20,25,30].map(n => <option key={n} value={n}>{n} câu</option>)}
              </select>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
                ❌ {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button whileHover={{ scale: uploading ? 1 : 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleUpload} disabled={uploading || !file}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-all shadow-lg hover:shadow-blue-500/30">
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang sinh câu hỏi... ({genProgress.current}/{genProgress.total})
              </span>
            ) : '🚀 Upload & Sinh câu hỏi với Gemini AI'}
          </motion.button>
        </motion.div>

        {/* Live Generation Panel */}
        <AnimatePresence>
          {generating && liveQuestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-slate-800 rounded-2xl border border-blue-500/30 overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-blue-500/10 border-b border-blue-500/20 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold">✨ Đang sinh câu hỏi — "{genDocTitle}"</h2>
                  <p className="text-blue-300 text-sm mt-0.5">Gemini AI đang phân tích tài liệu và tạo từng câu</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{genProgress.current}<span className="text-slate-400 text-base">/{genProgress.total}</span></p>
                  <div className="w-32 bg-slate-700 rounded-full h-2 mt-1">
                    <motion.div
                      className="bg-blue-500 h-2 rounded-full"
                      animate={{ width: `${(genProgress.current / genProgress.total) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              </div>

              {/* Live questions */}
              <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                <AnimatePresence>
                  {liveQuestions.map((q, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      className="bg-slate-700/50 rounded-xl p-4 space-y-3 border border-slate-600/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-white font-medium text-sm flex-1">
                          <span className="text-blue-400 font-bold mr-2">Câu {i + 1}.</span>
                          {q.content}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${DIFF_MAP[q.difficulty].cls}`}>
                          {DIFF_MAP[q.difficulty].label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map(o => (
                          <div key={o.label}
                            className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${
                              o.isCorrect
                                ? 'bg-green-500/20 border border-green-500/40 text-green-300'
                                : 'bg-slate-600/40 text-slate-400'
                            }`}
                          >
                            <span className={`font-bold shrink-0 ${o.isCorrect ? 'text-green-400' : 'text-slate-500'}`}>
                              {o.isCorrect ? '✓' : o.label}.
                            </span>
                            <span>{o.content}</span>
                          </div>
                        ))}
                      </div>

                      {q.explanation && (
                        <p className="text-slate-400 text-xs italic border-t border-slate-600/50 pt-2">
                          💡 {q.explanation}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Typing indicator - next question */}
                {genProgress.current < genProgress.total && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-3 px-4 py-3 bg-slate-700/30 rounded-xl border border-slate-600/30"
                  >
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <motion.div key={i} className="w-2 h-2 bg-blue-400 rounded-full"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                    <span className="text-slate-400 text-sm">Đang sinh câu {genProgress.current + 1}...</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Documents table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Tài liệu đã upload ({docs.length})</h2>
            <motion.button whileHover={{ scale: 1.05 }} onClick={loadDocs}
              className="px-3 py-1.5 text-sm bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all">
              🔄 Làm mới
            </motion.button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">Đang tải...</div>
          ) : docs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="text-4xl">📂</div>
              <p className="text-slate-500">Chưa có tài liệu nào. Upload tài liệu đầu tiên!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-slate-700">
                  <tr>
                    {['Tiêu đề', 'Môn', 'Loại', 'Dung lượng', 'Trạng thái', 'Câu hỏi', 'Hành động'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {docs.map((doc, i) => (
                      <motion.tr key={doc.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                        <td className="px-5 py-4">
                          <p className="text-white font-medium text-sm">{doc.title}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{doc.fileName}</p>
                          {doc.errorMsg && <p className="text-red-400 text-xs mt-1">⚠ {doc.errorMsg}</p>}
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-medium">{doc.subject}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-400 text-sm uppercase">{doc.fileType}</td>
                        <td className="px-5 py-4 text-slate-400 text-sm">{fmtSize(doc.fileSize)}</td>
                        <td className="px-5 py-4"><StatusBadge status={doc.status} /></td>
                        <td className="px-5 py-4">
                          <span className={`font-bold text-sm ${doc.questionCount > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                            {doc.questionCount > 0 ? `${doc.questionCount} câu` : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            {doc.status === 'done' && (
                              <Link href={`/api/documents/${doc.id}/questions`} target="_blank">
                                <motion.button whileHover={{ scale: 1.05 }}
                                  className="px-3 py-1.5 text-xs bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all">
                                  Xem
                                </motion.button>
                              </Link>
                            )}
                            <motion.button whileHover={{ scale: 1.05 }}
                              onClick={() => handleDelete(doc.id, doc.title)}
                              className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all">
                              Xoá
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Info box */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 text-sm text-blue-300 space-y-2">
          <p className="font-semibold text-blue-200">💡 Quy trình hoạt động (dùng Gemini Flash):</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-300/80">
            <li>Admin upload file PDF hoặc DOCX</li>
            <li>Hệ thống extract toàn bộ text từ tài liệu</li>
            <li>Gemini Flash sinh câu hỏi <strong className="text-blue-200">từng câu một</strong> — hiển thị real-time</li>
            <li>Mỗi câu có đáp án đúng, giải thích, và độ khó (dễ/trung/khó)</li>
            <li>Câu hỏi lưu vào PostgreSQL — học sinh làm bài được chấm điểm tự động</li>
          </ol>
          <p className="text-blue-400/60 text-xs pt-1">Cần biến môi trường: <code className="bg-slate-800 px-1 rounded">GEMINI_API_KEY</code></p>
        </motion.div>
      </main>
    </div>
  )
}
