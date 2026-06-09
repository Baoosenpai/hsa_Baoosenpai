import { useAuth } from '@/lib/contexts/AuthContext'
import { User } from '@/lib/types/user'

/**
 * Custom hook để truy cập user data
 * Cung cấp tiện ích khi làm việc với user
 */
export function useUser() {
  const { user, isLoggedIn } = useAuth()

  return {
    user,
    isLoggedIn,
    userId: user?.id,
    userName: user?.name,
    userEmail: user?.email,
    userRole: user?.role,
    isStudent: user?.role === 'student',
    isTeacher: user?.role === 'teacher',
    isAdmin: user?.role === 'admin',
  }
}

/**
 * Hook để kiểm tra quyền access
 */
export function useUserPermission() {
  const { user, isLoggedIn } = useAuth()

  const canEditUser = (userId: string) => {
    return isLoggedIn && (user?.id === userId || user?.role === 'admin')
  }

  const canDeleteUser = () => {
    return user?.role === 'admin'
  }

  const canAccessAdminPanel = () => {
    return user?.role === 'admin' || user?.role === 'teacher'
  }

  const requireAuth = (callback: () => void) => {
    if (isLoggedIn) {
      callback()
    } else {
      throw new Error('Vui lòng đăng nhập')
    }
  }

  return {
    canEditUser,
    canDeleteUser,
    canAccessAdminPanel,
    requireAuth,
  }
}

/**
 * Hook để quản lý user profile
 */
export function useUserProfile() {
  const { user } = useAuth()

  const getProfileCompletion = (): number => {
    let completed = 0
    const total = 4

    if (user?.name) completed++
    if (user?.email) completed++
    if (user?.avatar) completed++
    if (user?.role) completed++

    return Math.round((completed / total) * 100)
  }

  const isProfileComplete = (): boolean => {
    return !!(user?.name && user?.email)
  }

  return {
    getProfileCompletion,
    isProfileComplete,
    user,
  }
}
