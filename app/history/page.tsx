'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useEffect, useState } from 'react'

interface TestResult {
  id: string
  date: string
  score: number
  correct: number
  total: number
  percentage: string
  timeSpent: string
}

const HISTORY_KEY = 'exam_academy_history'

function loadHistory(): TestResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as TestResult[]
  } catch {
    return []
  }
}

function buildChartData(results: TestResult[]) {
  if (results.length === 0) return []
  const week = 7 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const groups: Record<string, number[]> = {}

  results.forEach(r => {
    // Fix: dùng r.date (ISO string) thay vì r.id (có thể là UUID)
    const ts = r.date ? new Date(r.date).getTime() : NaN
    if (isNaN(ts)) return
    const idx = Math.floor((now - ts) / week)
    const label = idx === 0 ? 'Tuần này' : `${idx} tuần trước`
    if (!groups[label]) groups[label] = []
    groups[label].push(r.score)
  })

  return Object.entries(groups)
    .reverse()
    .map(([week, scores]) => ({
      week,
      avgScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      attempts: scores.length,
    }))
}

export default function HistoryPage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date')
  const [stats, setStats] = useState({ total: 0, avgScore: 0, bestScore: 0 })
  const [chartData, setChartData] = useState<{ week: string; avgScore: number; attempts: number }[]>([])

  useEffect(() => {
    const history = loadHistory()
    setResults(history)
    setChartData(buildChartData(history))
    if (history.length > 0) {
      setStats({
        total: history.length,
        avgScore: Math.round(history.reduce((s, r) => s + r.score, 0) / history.length),
        bestScore: Math.max(...history.map(r => r.score)),
      })
    }
  }, [])

  const sorted = [...results].sort((a, b) => {
    if (sortBy === 'score') return b.score - a.score
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 px-6 py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">← Trang chủ</Link>
          <h1 className="text-3xl font-bold text-white mt-2">Lịch sử thi</h1>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Tổng bài thi', value: stats.total },
            { label: 'Điểm TB', value: `${stats.avgScore}/100` },
            { label: 'Điểm cao nhất', value: `${stats.bestScore}/100` },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-sm text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">Điểm theo tuần</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="week" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="avgScore" name="Điểm TB" stroke="#60a5fa" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-white font-semibold">Chi tiết ({results.length} bài)</h2>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'date' | 'score')}
              className="bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 border border-white/20"
            >
              <option value="date">Mới nhất</option>
              <option value="score">Điểm cao nhất</option>
            </select>
          </div>

          {sorted.length === 0 ? (
            <p className="text-slate-400 text-center py-12">Chưa có bài thi nào. <Link href="/quiz-hsa.html" className="text-blue-400 underline">Thi thử ngay</Link></p>
          ) : (
            sorted.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center"
              >
                <div>
                  <div className="text-white font-medium">{r.correct}/{r.total} câu đúng</div>
                  <div className="text-slate-400 text-sm mt-0.5">
                    {r.date ? new Date(r.date).toLocaleDateString('vi-VN') : '—'} · {r.timeSpent}
                  </div>
                </div>
                <div className={`text-2xl font-bold ${r.score >= 80 ? 'text-green-400' : r.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {r.score}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
