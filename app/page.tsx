'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/lib/contexts/AuthContext'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: 'easeOut' },
  },
}

export default function Page() {
  const { user, isLoggedIn, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-blue-500/10"
      >
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-blue-500/30">
              Ε
            </div>
            <span className="text-white font-bold text-lg tracking-tight hidden sm:inline">Exam Academy</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex items-center gap-3"
          >
            {/* Chỉ hiển thị nút Admin nếu user có role admin */}
            {isLoggedIn && user?.role === 'admin' && (
              <Link href="/admin">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-sm font-semibold rounded-lg hover:bg-amber-500/20 transition-all"
                >
                  ⚙ Admin
                </motion.button>
              </Link>
            )}

            {isLoggedIn ? (
              <>
                <span className="text-blue-300 text-sm hidden sm:inline">Xin chào, {user?.name}</span>
                <Link href="/history">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 text-blue-300 font-semibold hover:text-blue-200 transition-all duration-200"
                  >
                    Lịch sử
                  </motion.button>
                </Link>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={logout}
                  className="px-5 py-2.5 text-slate-400 font-semibold hover:text-white transition-all duration-200"
                >
                  Đăng xuất
                </motion.button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <motion.button 
                    whileHover={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', x: 5 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    className="px-5 py-2.5 text-blue-300 font-semibold hover:text-blue-200 transition-all duration-200"
                  >
                    Đăng nhập
                  </motion.button>
                </Link>
                <Link href="/register">
                  <motion.button 
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/30"
                  >
                    Đăng ký
                  </motion.button>
                </Link>
              </>
            )}
          </motion.div>
        </nav>
      </motion.header>

      {/* Main Content */}
      <main className="relative min-h-screen pt-24 flex items-center justify-center px-6 overflow-hidden">
        {/* Decorative Elements */}
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

        {/* Content */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-4xl mx-auto text-center space-y-8"
        >
          {/* Academic Badge */}
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-400/30 rounded-full px-5 py-2.5 backdrop-blur-sm"
          >
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm text-blue-200 font-medium tracking-wide">Nền tảng học tập hàng đầu</span>
          </motion.div>

          {/* Main Title */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-tight tracking-tight">
              Chuẩn bị kỳ thi
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-300 bg-clip-text text-transparent">
                một cách chuyên nghiệp
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-blue-200/80 leading-relaxed max-w-3xl mx-auto font-light">
              Truy cập hơn 10,000 câu hỏi được biên soạn bởi các chuyên gia giáo dục. Phân tích chi tiết, lộ trình học tập được cá nhân hóa, và theo dõi tiến độ theo thời gian thực.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6"
          >
            <Link href={isLoggedIn ? '/quiz-hsa.html' : '/register'}>
              <motion.button 
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/40 text-lg hover:shadow-blue-500/60 transition-all duration-300"
              >
                {isLoggedIn ? '🎯 Làm bài ngay' : 'Bắt đầu miễn phí'}
              </motion.button>
            </Link>
            <Link href="/history">
              <motion.button 
                whileHover={{ backgroundColor: 'rgba(30, 58, 138, 0.7)', borderColor: 'rgba(59, 130, 246, 0.5)', x: 5 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-8 py-4 bg-blue-900/40 text-blue-200 font-semibold rounded-xl border border-blue-700/40 text-lg transition-all duration-300"
              >
                📊 Lịch sử thi
              </motion.button>
            </Link>
          </motion.div>

          {/* Features Grid */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid md:grid-cols-3 gap-6 pt-16 border-t border-blue-500/10"
          >
            {[
              { icon: '📚', title: 'Nội dung học tập', desc: 'Hơn 10,000 câu hỏi từ các chuyên gia' },
              { icon: '📊', title: 'Phân tích chi tiết', desc: 'Báo cáo hiệu suất toàn diện' },
              { icon: '🎯', title: 'Lộ trình cá nhân', desc: 'Học tập theo tốc độ của bạn' },
            ].map((feature, i) => (
              <motion.div 
                key={i}
                variants={itemVariants}
                whileHover={{ y: -8 }}
                className="p-6 bg-gradient-to-br from-blue-500/5 to-blue-600/5 border border-blue-500/10 rounded-xl backdrop-blur-sm hover:border-blue-400/30 transition-all duration-300"
              >
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-blue-200/70 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-3 gap-4 sm:gap-8 py-12 border-y border-blue-500/10"
          >
            {[
              { num: '10K+', label: 'Câu hỏi chất lượng' },
              { num: '50K+', label: 'Học sinh sử dụng' },
              { num: '98%', label: 'Tỉ lệ thành công' },
            ].map((stat, i) => (
              <motion.div key={i} whileHover={{ scale: 1.05 }} className="space-y-2">
                <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{stat.num}</p>
                <p className="text-sm text-blue-300 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="relative z-10 bg-slate-900/50 border-t border-blue-500/10 mt-20"
      >
        <div className="max-w-7xl mx-auto px-6 py-8 text-center">
          <p className="text-blue-300/60 text-sm">
            © 2026 Exam Academy. Nền tảng học tập được thiết kế cho thành công học thuật.
          </p>
        </div>
      </motion.footer>
    </div>
  )
}
