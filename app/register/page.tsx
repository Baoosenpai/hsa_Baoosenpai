'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'

const containerVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: 'easeOut' } },
}

const inputVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.1 + i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
}

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading } = useAuth()
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', agreeTerms: false,
  })
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!formData.agreeTerms) {
      setError('Vui lòng đồng ý với Điều khoản dịch vụ')
      return
    }
    try {
      await register(formData)
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 overflow-hidden">
      <motion.header initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-blue-200/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-3 cursor-pointer">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-md shadow-blue-200">
                Ε
              </div>
              <span className="text-slate-900 font-bold text-base tracking-tight hidden sm:inline">Exam Academy</span>
            </motion.div>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-slate-600 text-sm">Đã có tài khoản?</span>
            <Link href="/login">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-md">
                Đăng nhập
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="relative min-h-screen pt-20 flex items-center justify-center px-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-blue-300/20 to-cyan-300/20 rounded-full blur-3xl" />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-br from-blue-400/15 to-indigo-300/15 rounded-full blur-3xl" />

        <div className="relative z-10 w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
          {/* Left Side */}
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }} className="hidden md:block space-y-6">
            <div className="space-y-3">
              <h1 className="text-5xl font-bold text-slate-900 leading-tight">
                Bắt đầu
                <span className="block bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  hành trình học tập
                </span>
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed">
                Tham gia hàng nghìn học sinh đạt thành công với nền tảng học tập toàn diện.
              </p>
            </div>
            <div className="space-y-4 pt-8">
              {[
                { icon: '📚', text: '10,000+ câu hỏi chất lượng' },
                { icon: '📊', text: 'Phân tích hiệu suất chi tiết' },
                { icon: '🎯', text: 'Lộ trình học cá nhân hóa' },
              ].map((feature, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }} className="flex items-center gap-3">
                  <span className="text-2xl">{feature.icon}</span>
                  <span className="text-slate-700 font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Side - Form */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            className="bg-white rounded-2xl shadow-2xl p-8 md:p-10">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Tạo tài khoản</h2>
                <p className="text-slate-600 text-sm mt-1">Bước đầu tiên của thành công</p>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { label: 'Họ và tên', name: 'name', type: 'text', placeholder: 'Nguyễn Văn A' },
                  { label: 'Email', name: 'email', type: 'email', placeholder: 'your@email.com' },
                  { label: 'Mật khẩu', name: 'password', type: 'password', placeholder: '••••••••' },
                  { label: 'Xác nhận mật khẩu', name: 'confirmPassword', type: 'password', placeholder: '••••••••' },
                ].map((field, i) => (
                  <motion.div key={field.name} custom={i} variants={inputVariants} initial="hidden" animate="visible">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{field.label}</label>
                    <input type={field.type} name={field.name}
                      value={formData[field.name as keyof typeof formData] as string}
                      onChange={handleChange} placeholder={field.placeholder} required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all" />
                  </motion.div>
                ))}

                <motion.div custom={4} variants={inputVariants} initial="hidden" animate="visible">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms}
                      onChange={handleChange} className="w-4 h-4 rounded border-slate-300" />
                    <span className="text-sm text-slate-600">
                      Tôi đồng ý với{' '}
                      <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">Điều khoản dịch vụ</a>
                    </span>
                  </label>
                </motion.div>

                <motion.button custom={5} variants={inputVariants} initial="hidden" animate="visible"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  type="submit" disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-75 mt-2">
                  {isLoading ? (
                    <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      Đang tạo...
                    </motion.span>
                  ) : 'Tạo tài khoản'}
                </motion.button>
              </form>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">hoặc</span>
                </div>
              </div>

              <motion.div custom={6} variants={inputVariants} initial="hidden" animate="visible">
                <p className="text-center text-slate-600">
                  Đã có tài khoản?{' '}
                  <Link href="/login" className="text-blue-600 font-semibold hover:text-blue-700">Đăng nhập</Link>
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
