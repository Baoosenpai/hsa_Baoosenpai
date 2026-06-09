/**
 * PostgreSQL connection pool (singleton, lazy init)
 * Chỉ tạo pool khi thực sự có DATABASE_URL — tránh crash ở localStorage mode
 */

import { Pool, PoolClient } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined
}

function getPool(): Pool {
  if (globalThis.__pgPool) return globalThis.__pgPool

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL chưa được cấu hình. ' +
      'Thêm vào .env.local hoặc dùng INMEMORY mode (bỏ DATABASE_URL).'
    )
  }

  globalThis.__pgPool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })

  return globalThis.__pgPool
}

// Lazy getter — pool chỉ được tạo khi query() được gọi lần đầu
export function getPoolInstance(): Pool {
  return getPool()
}

// Giữ export `pool` để tương thích với instrumentation.ts
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop]
  },
})

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query(sql, params)
  return result.rows as T[]
}

export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
