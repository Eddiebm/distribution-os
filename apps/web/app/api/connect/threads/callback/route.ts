export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { redis } from '@/lib/redis'
import { connKey, stateKey, type ThreadsConn } from '@/lib/platform'

const TTL = 60 * 60 * 24 * 100

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  if (!code || !state) return Response.json({ error: 'Missing params' }, { status: 400 })

  const r = redis()
  const saved = await r.getdel<{ email: string }>(stateKey(state))
  if (!saved) return Response.json({ error: 'Invalid or expired state' }, { status: 400 })

  const appId = process.env.THREADS_APP_ID
  const appSecret = process.env.THREADS_APP_SECRET
  if (!appId || !appSecret) throw new Error('Threads OAuth env vars required')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Short-lived token
  const shortRes = await fetch('https://graph.threads.net/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: appId, client_secret: appSecret, grant_type: 'authorization_code', redirect_uri: `${appUrl}/api/connect/threads/callback`, code }),
  })
  if (!shortRes.ok) return Response.json({ error: 'Token exchange failed' }, { status: 502 })
  const short = await shortRes.json() as { access_token: string; user_id: string }

  // Long-lived token (60 days)
  const longRes = await fetch(`https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${appSecret}&access_token=${short.access_token}`)
  if (!longRes.ok) return Response.json({ error: 'Long-lived token exchange failed' }, { status: 502 })
  const long = await longRes.json() as { access_token: string; expires_in: number }

  const meRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${long.access_token}`)
  const me = await meRes.json() as { id: string; username: string }

  const conn: ThreadsConn = { accessToken: long.access_token, expiresAt: Date.now() + long.expires_in * 1000, userId: me.id, username: me.username }
  await r.set(connKey(saved.email, 'threads'), conn, { ex: TTL })

  return Response.redirect(`${appUrl}/queue?email=${encodeURIComponent(saved.email)}&connected=threads`)
}
