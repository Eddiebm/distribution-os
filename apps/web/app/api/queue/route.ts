export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { redis } from '@/lib/redis'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })

  const r = redis()
  const queueKey = `dist:queue:${email}`
  const raw = await r.zrange<string[]>(queueKey, 0, -1, { withScores: false })

  const items = raw.map(m => {
    try { return typeof m === 'string' ? JSON.parse(m) : m } catch { return null }
  }).filter(Boolean)

  return Response.json({ items })
}
