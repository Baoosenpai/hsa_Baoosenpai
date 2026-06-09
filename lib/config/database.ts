/**
 * Database Configuration
 * Đổi DATABASE_TYPE để switch giữa các backend
 */

export enum DatabaseType {
  INMEMORY  = 'inMemory',  // dev không cần DB (thay thế localStorage)
  POSTGRES  = 'postgres',
  NEON      = 'neon',
  SUPABASE  = 'supabase',
}

export const DATABASE_TYPE: DatabaseType =
  process.env.DATABASE_URL
    ? DatabaseType.POSTGRES
    : DatabaseType.INMEMORY

// ─── Postgres / Neon config ───────────────────────────────────
export const postgresConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production',
}

// ─── Repository Factory ───────────────────────────────────────
import type { IUserRepository } from '@/lib/repositories/userRepository'

let _repoCache: IUserRepository | null = null

export function createUserRepository(): IUserRepository {
  if (_repoCache) return _repoCache

  switch (DATABASE_TYPE) {
    case DatabaseType.POSTGRES:
    case DatabaseType.NEON: {
      // Import lazy để tránh pull `pg` pool khi không có DATABASE_URL
      const { PostgresUserRepository } = require('@/lib/repositories/postgresUserRepository')
      _repoCache = new PostgresUserRepository()
      break
    }
    case DatabaseType.INMEMORY:
    default: {
      const { InMemoryUserRepository } = require('@/lib/repositories/inMemoryUserRepository')
      _repoCache = new InMemoryUserRepository()
      break
    }
  }

  return _repoCache!
}
