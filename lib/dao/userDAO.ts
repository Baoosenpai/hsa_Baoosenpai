import { User, LoginCredentials, RegisterData, AuthResponse } from '@/lib/types/user'

/**
 * User Data Access Object (DAO)
 * Xử lý tất cả các hoạt động liên quan đến dữ liệu user
 * Hiện tại dùng localStorage tạm, sau sẽ replace bằng API calls
 */
class UserDAO {
  private readonly STORAGE_KEY = 'exam_academy_users'
  private readonly SESSION_KEY = 'exam_academy_session'

  /**
   * Lấy tất cả users (admin)
   */
  async getAllUsers(): Promise<User[]> {
    const data = localStorage.getItem(this.STORAGE_KEY)
    return data ? JSON.parse(data) : []
  }

  /**
   * Lấy user theo ID
   */
  async getUserById(id: string): Promise<User | null> {
    const users = await this.getAllUsers()
    return users.find(u => u.id === id) || null
  }

  /**
   * Lấy user theo email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const users = await this.getAllUsers()
    return users.find(u => u.email === email.toLowerCase()) || null
  }

  /**
   * Tạo user mới
   */
  async createUser(userData: RegisterData): Promise<AuthResponse> {
    // Validation
    if (!userData.name || !userData.email || !userData.password) {
      throw new Error('Vui lòng điền đầy đủ thông tin')
    }

    if (userData.password !== userData.confirmPassword) {
      throw new Error('Mật khẩu không khớp')
    }

    if (userData.password.length < 6) {
      throw new Error('Mật khẩu phải ít nhất 6 ký tự')
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userData.email)) {
      throw new Error('Email không hợp lệ')
    }

    // Check duplicate email
    const existingUser = await this.getUserByEmail(userData.email)
    if (existingUser) {
      throw new Error('Email này đã được sử dụng')
    }

    // Create new user
    const users = await this.getAllUsers()
    const newUser: User = {
      id: this.generateId(),
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: this.hashPassword(userData.password), // In production, use bcrypt
      createdAt: new Date(),
      updatedAt: new Date(),
      role: 'student',
      isActive: true,
    }

    users.push(newUser)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users))

    // Generate token
    const token = this.generateToken(newUser)
    this.saveSession(newUser, token)

    return {
      user: { ...newUser, password: '' }, // Don't return password
      token,
      message: 'Đăng ký thành công!',
    }
  }

  /**
   * Đăng nhập user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (!credentials.email || !credentials.password) {
      throw new Error('Vui lòng nhập email và mật khẩu')
    }

    const user = await this.getUserByEmail(credentials.email)
    if (!user) {
      throw new Error('Email hoặc mật khẩu không đúng')
    }

    if (!user.isActive) {
      throw new Error('Tài khoản đã bị khóa')
    }

    const passwordMatch = this.verifyPassword(credentials.password, user.password)
    if (!passwordMatch) {
      throw new Error('Email hoặc mật khẩu không đúng')
    }

    const token = this.generateToken(user)
    this.saveSession(user, token)

    return {
      user: { ...user, password: '' },
      token,
      message: 'Đăng nhập thành công!',
    }
  }

  /**
   * Cập nhật user
   */
  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const users = await this.getAllUsers()
    const userIndex = users.findIndex(u => u.id === id)

    if (userIndex === -1) {
      throw new Error('Không tìm thấy user')
    }

    const updatedUser = {
      ...users[userIndex],
      ...updates,
      id: users[userIndex].id, // Không thay đổi ID
      createdAt: users[userIndex].createdAt, // Không thay đổi createdAt
      updatedAt: new Date(),
    }

    users[userIndex] = updatedUser
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users))

    return { ...updatedUser, password: '' }
  }

  /**
   * Xóa user
   */
  async deleteUser(id: string): Promise<void> {
    const users = await this.getAllUsers()
    const filtered = users.filter(u => u.id !== id)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
  }

  /**
   * Đổi mật khẩu
   */
  async changePassword(id: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.getUserById(id)
    if (!user) {
      throw new Error('Không tìm thấy user')
    }

    const passwordMatch = this.verifyPassword(oldPassword, user.password)
    if (!passwordMatch) {
      throw new Error('Mật khẩu cũ không đúng')
    }

    await this.updateUser(id, {
      password: this.hashPassword(newPassword),
    })
  }

  /**
   * Đăng xuất
   */
  logout(): void {
    localStorage.removeItem(this.SESSION_KEY)
  }

  /**
   * Lấy session hiện tại
   */
  getCurrentSession() {
    const session = localStorage.getItem(this.SESSION_KEY)
    return session ? JSON.parse(session) : null
  }

  /**
   * Kiểm tra xem user đã đăng nhập chưa
   */
  isAuthenticated(): boolean {
    const session = this.getCurrentSession()
    return !!session?.user && !!session?.token
  }

  // ========== PRIVATE METHODS ==========

  private saveSession(user: User, token: string): void {
    const session = {
      user: { ...user, password: '' },
      token,
      isAuthenticated: true,
      loginAt: new Date(),
    }
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateToken(user: User): string {
    // Simple token generation (in production, use JWT)
    return btoa(JSON.stringify({ userId: user.id, email: user.email, timestamp: Date.now() }))
  }

  private hashPassword(password: string): string {
    // Simple hash (in production, use bcrypt)
    return btoa(password)
  }

  private verifyPassword(password: string, hash: string): boolean {
    // Simple verification (in production, use bcrypt compare)
    return btoa(password) === hash
  }
}

// Export singleton instance
export const userDAO = new UserDAO()
