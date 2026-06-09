'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, LoginCredentials, RegisterData, AuthResponse } from '@/lib/types/user'
import { userService } from '@/lib/services/userService'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoggedIn: boolean
  isLoading: boolean
  error: string | null

  // Methods
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const currentUser = userService.getCurrentUser()
    const currentToken = userService.getToken()

    if (currentUser && currentToken) {
      setUser(currentUser)
      setToken(currentToken)
    }

    setIsLoading(false)
  }, [])

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await userService.login(credentials)
      setUser(response.user)
      setToken(response.token)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi đăng nhập'
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await userService.register(data)
      setUser(response.user)
      setToken(response.token)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi đăng ký'
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    userService.logout()
    setUser(null)
    setToken(null)
    setError(null)
  }

  const clearError = () => {
    setError(null)
  }

  const value: AuthContextType = {
    user,
    token,
    isLoggedIn: !!user && !!token,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
