export const runtime = 'nodejs'

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (!process.env.DATABASE_URL) {
    console.log('[DB] DATABASE_URL chua cau hinh -> dung in-memory store')
    return
  }

  try {
    const { pool } = await import('./lib/db/postgres')
    const client = await pool.connect()
    const { rows } = await client.query('SELECT NOW() AS now')
    client.release()
    console.log('[DB] PostgreSQL ket noi thanh cong')
  } catch (err) {
    console.error('[DB] Loi khoi tao database:', err)
  }
}
