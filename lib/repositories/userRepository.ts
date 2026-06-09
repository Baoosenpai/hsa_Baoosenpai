import { User, RegisterData } from '@/lib/types/user'

/**
 * User Repository Interface
 * Định nghĩa contract cho tất cả các repository implementations
 * Cho phép dễ dàng switch giữa các database khác nhau
 */
export interface IUserRepository {
  // Create
  create(data: RegisterData): Promise<User>

  // Read
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  findAll(): Promise<User[]>

  // Update
  update(id: string, data: Partial<User>): Promise<User>

  // Delete
  delete(id: string): Promise<void>

  // Authentication
  verifyPassword(email: string, password: string): Promise<boolean>
  changePassword(id: string, oldPassword: string, newPassword: string): Promise<void>
}

/**
 * Abstract Repository Pattern
 * Base class cho tất cả repository implementations
 */
export abstract class BaseUserRepository implements IUserRepository {
  abstract create(data: RegisterData): Promise<User>
  abstract findById(id: string): Promise<User | null>
  abstract findByEmail(email: string): Promise<User | null>
  abstract findAll(): Promise<User[]>
  abstract update(id: string, data: Partial<User>): Promise<User>
  abstract delete(id: string): Promise<void>
  abstract verifyPassword(email: string, password: string): Promise<boolean>
  abstract changePassword(id: string, oldPassword: string, newPassword: string): Promise<void>

  /**
   * Validation helper
   */
  protected validateEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  /**
   * Validation helper
   */
  protected validatePassword(password: string): boolean {
    return password.length >= 6
  }

  /**
   * Generate unique ID
   */
  protected generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * LocalStorage Repository Implementation
 * Hiện tại dùng cho development, sau sẽ replace bằng Firebase/Supabase
 */
export class LocalStorageUserRepository extends BaseUserRepository {
  private readonly STORAGE_KEY = 'exam_academy_users'

  async create(data: RegisterData): Promise<User> {
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
    if (existing) {
      throw new Error('Email đã được sử dụng')
    }

    const users = await this.findAll()
    const newUser: User = {
      id: this.generateId(),
      name: data.name,
      email: data.email.toLowerCase(),
      password: this.hashPassword(data.password),
      createdAt: new Date(),
      updatedAt: new Date(),
      role: 'student',
      isActive: true,
    }

    users.push(newUser)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users))
    return { ...newUser, password: '' }
  }

  async findById(id: string): Promise<User | null> {
    const users = await this.findAll()
    return users.find(u => u.id === id) || null
  }

  async findByEmail(email: string): Promise<User | null> {
    const users = await this.findAll()
    return users.find(u => u.email === email.toLowerCase()) || null
  }

  async findAll(): Promise<User[]> {
    const data = localStorage.getItem(this.STORAGE_KEY)
    return data ? JSON.parse(data) : []
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const users = await this.findAll()
    const index = users.findIndex(u => u.id === id)

    if (index === -1) {
      throw new Error('Không tìm thấy user')
    }

    const updated = {
      ...users[index],
      ...data,
      id: users[index].id,
      createdAt: users[index].createdAt,
      updatedAt: new Date(),
    }

    users[index] = updated
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users))
    return { ...updated, password: '' }
  }

  async delete(id: string): Promise<void> {
    const users = await this.findAll()
    const filtered = users.filter(u => u.id !== id)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
  }

  async verifyPassword(email: string, password: string): Promise<boolean> {
    const user = await this.findByEmail(email)
    if (!user) return false
    return this.hashPassword(password) === user.password
  }

  async changePassword(id: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.findById(id)
    if (!user) {
      throw new Error('Không tìm thấy user')
    }

    if (!(await this.verifyPassword(user.email, oldPassword))) {
      throw new Error('Mật khẩu cũ không đúng')
    }

    await this.update(id, {
      password: this.hashPassword(newPassword),
    })
  }

  private hashPassword(password: string): string {
    return btoa(password)
  }
}
