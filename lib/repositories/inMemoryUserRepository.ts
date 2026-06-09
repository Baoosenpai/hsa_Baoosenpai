/**
 * In-Memory User Repository
 * Dùng khi không có DATABASE_URL — thay thế LocalStorageUserRepository
 * (localStorage không tồn tại ở Node.js server)
 */

import bcrypt from 'bcryptjs'
import { BaseUserRepository } from '@/lib/repositories/userRepository'
import { User, RegisterData } from '@/lib/types/user'

export class InMemoryUserRepository extends BaseUserRepository {
  private users: Map<string, User> = new Map()

  async create(data: RegisterData): Promise<User> {
    if (!data.name?.trim() || !data.email?.trim() || !data.password) {
      throw new Error('Vui lòng điền đầy đủ thông tin')
    }
    if (data.password !== data.confirmPassword) {
      throw new Error('Mật khẩu không khớp')
    }
    if (!this.validatePassword(data.password)) {
      throw new Error('Mật khẩu phải ít nhất 6 ký tự')
    }
    if (!this.validateEmail(data.email)) {
      throw new Error('Email không hợp lệ')
    }

    const existing = await this.findByEmail(data.email)
    if (existing) throw new Error('Email đã được sử dụng')

    const passwordHash = await bcrypt.hash(data.password, 12)
    const newUser: User = {
      id: this.generateId(),
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: 'student',
      isActive: true,
    }

    this.users.set(newUser.id, newUser)
    return { ...newUser, password: '' }
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null
  }

  async findByEmail(email: string): Promise<User | null> {
    const lc = email.trim().toLowerCase()
    for (const u of this.users.values()) {
      if (u.email === lc) return u
    }
    return null
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = this.users.get(id)
    if (!user) throw new Error('Không tìm thấy user')

    const updated: User = {
      ...user,
      ...data,
      id: user.id,
      createdAt: user.createdAt,
      updatedAt: new Date(),
    }
    this.users.set(id, updated)
    return { ...updated, password: '' }
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id)
  }

  async verifyPassword(email: string, password: string): Promise<boolean> {
    const user = await this.findByEmail(email)
    if (!user) return false
    return bcrypt.compare(password, user.password)
  }

  async changePassword(id: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.findById(id)
    if (!user) throw new Error('Không tìm thấy user')

    const match = await bcrypt.compare(oldPassword, user.password)
    if (!match) throw new Error('Mật khẩu cũ không đúng')

    if (!this.validatePassword(newPassword)) {
      throw new Error('Mật khẩu mới phải ít nhất 6 ký tự')
    }

    const newHash = await bcrypt.hash(newPassword, 12)
    await this.update(id, { password: newHash })
  }
}
