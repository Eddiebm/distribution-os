export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { redis } from '@/lib/redis'
import { PLATFORMS, type Platform, connKey } from '@dist-os/platform'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })

  const r = redis()
  const entries = await Promise.all(
    PLATFORMS.map(async (p: Platform) => {
      const raw = await r.get<Record<string, unknown>>(connKey(email, p))
      if (!raw) return [p, { connected: false }]
      const handle = (raw as Record<string, unknown>).handle ?? (raw as Record<string, unknown>).username ?? (raw as Record<string, unknown>).name ?? null
      return [p, { connected: true, handle }]
    })
  )

  return Response.json({ status: Object.fromEntries(entries) })
}
