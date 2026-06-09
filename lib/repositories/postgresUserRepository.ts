import bcrypt from 'bcryptjs'
import { query, transaction } from '@/lib/db/postgres'
import { BaseUserRepository } from '@/lib/repositories/userRepository'
import { User, RegisterData } from '@/lib/types/user'

// ─── Row shape từ PostgreSQL ──────────────────────────────────
interface UserRow {
  id: string
  name: string
  email: string
  password_hash: string
  avatar: string | null
  role: 'student' | 'teacher' | 'admin'
  is_active: boolean
  created_at: Date
  updated_at: Date
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password_hash,
    avatar: row.avatar ?? undefined,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── Repository ───────────────────────────────────────────────

export class PostgresUserRepository extends BaseUserRepository {
  async create(data: RegisterData): Promise<User> {
    // Validation
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
    if (existing) throw new Error('Email này đã được sử dụng')

    const passwordHash = await bcrypt.hash(data.password, 12)

    const rows = await query<UserRow>(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'student', TRUE)
       RETURNING *`,
      [data.name.trim(), data.email.trim().toLowerCase(), passwordHash]
    )

    return rowToUser(rows[0])
  }

  async findById(id: string): Promise<User | null> {
    const rows = await query<UserRow>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    )
    return rows[0] ? rowToUser(rows[0]) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await query<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    )
    return rows[0] ? rowToUser(rows[0]) : null
  }

  async findAll(): Promise<User[]> {
    const rows = await query<UserRow>(
      'SELECT * FROM users ORDER BY created_at DESC'
    )
    return rows.map(rowToUser)
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    // Chỉ cho phép cập nhật các field an toàn
    const allowed: Partial<Record<string, unknown>> = {}
    if (data.name)   allowed['name']      = data.name.trim()
    if (data.avatar) allowed['avatar']    = data.avatar
    if (data.role)   allowed['role']      = data.role
    if (typeof data.isActive === 'boolean') allowed['is_active'] = data.isActive

    if (Object.keys(allowed).length === 0) {
      const existing = await this.findById(id)
      if (!existing) throw new Error('Không tìm thấy user')
      return existing
    }

    const keys = Object.keys(allowed)
    const values = Object.values(allowed)
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ')

    const rows = await query<UserRow>(
      `UPDATE users SET ${setClauses} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    )

    if (!rows[0]) throw new Error('Không tìm thấy user')
    return rowToUser(rows[0])
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM users WHERE id = $1', [id])
  }

  async verifyPassword(email: string, password: string): Promise<boolean> {
    const user = await this.findByEmail(email)
    if (!user) return false
    return bcrypt.compare(password, user.password)
  }

  async changePassword(
    id: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.findById(id)
    if (!user) throw new Error('Không tìm thấy user')

    const match = await bcrypt.compare(oldPassword, user.password)
    if (!match) throw new Error('Mật khẩu cũ không đúng')

    if (!this.validatePassword(newPassword)) {
      throw new Error('Mật khẩu mới phải ít nhất 6 ký tự')
    }

    const newHash = await bcrypt.hash(newPassword, 12)
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHash, id]
    )
  }
}

// ─── Quiz Results ─────────────────────────────────────────────

export interface QuizResultRow {
  id: string
  user_id: string | null
  score: number
  correct: number
  total: number
  percentage: number
  time_spent: string | null
  subjects: string | null
  flagged: number
  taken_at: Date
}

export class PostgresQuizRepository {
  async save(result: Omit<QuizResultRow, 'id' | 'taken_at'>): Promise<QuizResultRow> {
    const rows = await query<QuizResultRow>(
      `INSERT INTO quiz_results
         (user_id, score, correct, total, percentage, time_spent, subjects, flagged)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        result.user_id,
        result.score,
        result.correct,
        result.total,
        result.percentage,
        result.time_spent,
        result.subjects,
        result.flagged ?? 0,
      ]
    )
    return rows[0]
  }

  async findByUserId(userId: string): Promise<QuizResultRow[]> {
    return query<QuizResultRow>(
      'SELECT * FROM quiz_results WHERE user_id = $1 ORDER BY taken_at DESC',
      [userId]
    )
  }

  async getStats(userId: string) {
    const rows = await query<{
      total: string
      avg_score: string
      best_score: string
    }>(
      `SELECT COUNT(*) AS total,
              ROUND(AVG(score)) AS avg_score,
              MAX(score) AS best_score
       FROM quiz_results
       WHERE user_id = $1`,
      [userId]
    )
    const r = rows[0]
    return {
      total: parseInt(r.total),
      avgScore: parseInt(r.avg_score) || 0,
      bestScore: parseInt(r.best_score) || 0,
    }
  }
}
