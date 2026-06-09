/**
 * Next.js Instrumentation Hook
 * Chạy MỘT LẦN khi server khởi động (không chạy ở client)
 * Dùng để: kiểm tra DB connection, chạy migration tự động
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Chỉ chạy ở Node.js server, bỏ qua Edge runtime
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // Không có DATABASE_URL → dùng localStorage mode, bỏ qua
  if (!process.env.DATABASE_URL) {
    console.log('[DB] DATABASE_URL chưa cấu hình → dùng in-memory store')
    return
  }

  try {
    // Import động để tránh bundle vào client
    const { pool } = await import('@/lib/db/postgres')

    // Test connection
    const client = await pool.connect()
    const { rows } = await client.query('SELECT NOW() AS now')
    client.release()

    console.log(`[DB] ✅ PostgreSQL kết nối thành công — ${rows[0].now}`)

    // Auto-migrate: tạo bảng nếu chưa có
    const { readFileSync } = await import('fs')
    const { join } = await import('path')

    const schemaPath = join(process.cwd(), 'lib', 'db', 'schema.sql')
    const sql = readFileSync(schemaPath, 'utf-8')
    await pool.query(sql)

    console.log('[DB] ✅ Schema đã được kiểm tra / cập nhật')
  } catch (err) {
    console.error('[DB] ❌ Lỗi khởi tạo database:', err)
    // Không throw — app vẫn chạy, chỉ không có DB
  }
}
