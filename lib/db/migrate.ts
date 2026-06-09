/**
 * Migration script — chạy một lần để tạo bảng
 *
 * Cách dùng:
 *   npx ts-node -r tsconfig-paths/register lib/db/migrate.ts
 * Hoặc thêm script trong package.json:
 *   "db:migrate": "npx ts-node -r tsconfig-paths/register lib/db/migrate.ts"
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { pool } from './postgres'

async function migrate() {
  console.log('🔄 Đang chạy migration...')

  const schemaPath = join(__dirname, 'schema.sql')
  const sql = readFileSync(schemaPath, 'utf-8')

  try {
    await pool.query(sql)
    console.log('✅ Migration thành công!')
  } catch (err) {
    console.error('❌ Migration thất bại:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()
