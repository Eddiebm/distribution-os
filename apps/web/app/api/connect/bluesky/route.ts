export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { redis } from '@/lib/redis'
import { connKey, type BlueskyConn } from '@/lib/platform'

const TTL = 60 * 60 * 24 * 100 // 100 days

export async function POST(req: NextRequest) {
  const { email, identifier, appPassword } = await req.json()
  if (!email || !identifier || !appPassword) return Response.json({ error: 'email, identifier, appPassword required' }, { status: 400 })

  const res = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: appPassword }),
  })
  if (!res.ok) return Response.json({ error: 'Invalid credentials' }, { status: 401 })

  const session = await res.json() as { did: string; handle: string; refreshJwt: string }
  const conn: BlueskyConn = { did: session.did, handle: session.handle, refreshJwt: session.refreshJwt }
  await redis().set(connKey(email, 'bluesky'), conn, { ex: TTL })

  return Response.json({ ok: true, handle: session.handle })
}

export async function DELETE(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })
  await redis().del(connKey(email, 'bluesky'))
  return Response.json({ ok: true })
}
