'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface QuizResult {
  correct: number
  total: number
  score: number
  percentage: string
  timestamp: string
  flagged: number
}

export default function ResultPage() {
  const [result, setResult] = useState<QuizResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const data = localStorage.getItem('quizResult')
    if (data) {
      setResult(JSON.parse(data))
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-white text-lg"
        >
          Đang tải kết quả...
        </motion.div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 flex flex-col items-center justify-center">
        <div className="text-white text-center">
          <p className="text-lg mb-4">Không tìm thấy kết quả bài thi</p>
          <Link href="/">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Quay về trang chủ
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const isPass = result.score >= 70
  const emoji = isPass ? '🎉' : '📚'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 overflow-hidden">
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-blue-500/10"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-lg">
                Ε
              </div>
              <span className="text-white font-bold text-lg hidden sm:inline">Exam Academy</span>
            </div>
          </Link>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative min-h-screen pt-24 flex items-center justify-center px-6 overflow-hidden">
        {/* Decorative */}
        <motion.div
          animate={{ y: [0, 30, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-32 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity, delay: 1 }}
          className="absolute bottom-32 right-10 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl"
        />

        {/* Result Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-2xl"
        >
          <div className="bg-gradient-to-b from-slate-800/50 to-blue-900/30 border border-blue-500/20 rounded-2xl p-12 backdrop-blur-xl shadow-2xl text-center">
            {/* Emoji & Title */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="text-6xl mb-6"
            >
              {emoji}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold text-white mb-4"
            >
              {isPass ? 'Tuyệt vời!' : 'Tiếp tục cố gắng'}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-blue-200/70 text-lg mb-8"
            >
              {isPass
                ? 'Bạn đã vượt qua bài thi với điểm số xuất sắc!'
                : 'Bạn cần chuẩn bị thêm để đạt kết quả tốt hơn.'}
            </motion.p>

            {/* Score Display */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-8"
            >
              <div className="inline-block">
                <div className="text-7xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text">
                  {result.score}%
                </div>
                <div className="text-blue-200 text-sm mt-2">
                  {result.correct} / {result.total} câu đúng
                </div>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-2 gap-4 mb-8 p-6 bg-blue-500/10 rounded-xl"
            >
              <div className="space-y-1">
                <p className="text-blue-300 text-sm font-medium">Câu trả lời</p>
                <p className="text-white text-2xl font-bold">{result.correct}</p>
              </div>
              <div className="space-y-1">
                <p className="text-blue-300 text-sm font-medium">Câu đánh dấu</p>
                <p className="text-white text-2xl font-bold">{result.flagged}</p>
              </div>
              <div className="space-y-1">
                <p className="text-blue-300 text-sm font-medium">Tổng câu hỏi</p>
                <p className="text-white text-2xl font-bold">{result.total}</p>
              </div>
              <div className="space-y-1">
                <p className="text-blue-300 text-sm font-medium">Tỉ lệ</p>
                <p className="text-white text-2xl font-bold">{result.percentage}%</p>
              </div>
            </motion.div>

            {/* Timestamp */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-blue-300/50 text-xs mb-8"
            >
              Hoàn thành: {result.timestamp}
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <Link href="/">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-blue-500/50 transition-all"
              >
                Quay về trang chủ
              </motion.button>
            </Link>
            <Link href="/history">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-800 transition-all"
              >
                Xem lịch sử thi
              </motion.button>
            </Link>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  localStorage.removeItem('quizResult')
                  window.location.href = '/quiz-hsa.html'
                }}
                className="px-8 py-3 bg-blue-900/50 text-blue-200 font-semibold rounded-lg border border-blue-700/50 hover:bg-blue-900/70 transition-all"
              >
                Làm lại bài thi
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
