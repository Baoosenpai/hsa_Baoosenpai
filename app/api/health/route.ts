/**
 * GET /api/health
 * Kiểm tra trạng thái server và database
 * Dùng cho Docker healthcheck, monitoring, hoặc debug
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const status: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  }

  // Kiểm tra DB nếu có cấu hình
  if (process.env.DATABASE_URL) {
    try {
      const { pool } = await import('@/lib/db/postgres')
      const { rows } = await pool.query('SELECT 1 AS ping')
      status.database = rows[0].ping === 1 ? 'connected' : 'error'
    } catch (err) {
      status.database = 'error'
      status.dbError  = err instanceof Error ? err.message : 'unknown'
      status.status   = 'degraded'
    }
  } else {
    status.database = 'localStorage (no DATABASE_URL)'
  }

  const httpStatus = status.status === 'ok' ? 200 : 503
  return NextResponse.json(status, { status: httpStatus })
}
