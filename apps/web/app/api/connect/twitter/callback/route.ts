export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { redis } from '@/lib/redis'
import { connKey, stateKey, type TwitterConn } from '@/lib/platform'

const TTL = 60 * 60 * 24 * 100

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  if (!code || !state) return Response.json({ error: 'Missing params' }, { status: 400 })

  const r = redis()
  const saved = await r.getdel<{ email: string; verifier: string }>(stateKey(state))
  if (!saved) return Response.json({ error: 'Invalid or expired state' }, { status: 400 })

  const clientId = process.env.TWITTER_CLIENT_ID
  const clientSecret = process.env.TWITTER_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Twitter OAuth env vars required')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const basic = btoa(`${clientId}:${clientSecret}`)

  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, grant_type: 'authorization_code', redirect_uri: `${appUrl}/api/connect/twitter/callback`, code_verifier: saved.verifier }),
  })
  if (!tokenRes.ok) return Response.json({ error: 'Token exchange failed' }, { status: 502 })

  const tokens = await tokenRes.json() as { access_token: string; refresh_token: string; expires_in: number }

  const meRes = await fetch('https://api.twitter.com/2/users/me', { headers: { Authorization: `Bearer ${tokens.access_token}` } })
  const me = await meRes.json() as { data: { id: string; username: string } }

  const conn: TwitterConn = { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: Date.now() + tokens.expires_in * 1000, userId: me.data.id, username: me.data.username }
  await r.set(connKey(saved.email, 'twitter'), conn, { ex: TTL })

  return Response.redirect(`${appUrl}/queue?email=${encodeURIComponent(saved.email)}&connected=twitter`)
}
