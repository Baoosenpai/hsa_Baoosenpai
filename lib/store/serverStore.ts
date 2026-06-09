/**
 * Server Store — facade cho API Routes
 * Tự động dùng Postgres nếu có DATABASE_URL, fallback in-memory
 */

import { createUserRepository } from '@/lib/config/database'
import { User } from '@/lib/types/user'
import { signToken } from '@/lib/auth/jwt'

const repo = createUserRepository()

export const serverStore = {
  getAllUsers:    ()                 => repo.findAll(),
  getUserById:   (id: string)       => repo.findById(id),
  getUserByEmail:(email: string)    => repo.findByEmail(email),
  saveUser:      (user: User)       => repo.update(user.id, user),
  deleteUser:    (id: string)       => repo.delete(id),
  createUser:    (data: import('@/lib/types/user').RegisterData) => repo.create(data),

  generateToken: (user: User) => signToken(user),   // async — callers must await
}
