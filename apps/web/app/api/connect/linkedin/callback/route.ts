export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { redis } from '@/lib/redis'
import { connKey, stateKey, type LinkedInConn } from '@/lib/platform'

const TTL = 60 * 60 * 24 * 100

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  if (!code || !state) return Response.json({ error: 'Missing params' }, { status: 400 })

  const r = redis()
  const saved = await r.getdel<{ email: string }>(stateKey(state))
  if (!saved) return Response.json({ error: 'Invalid or expired state' }, { status: 400 })

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('LinkedIn OAuth env vars required')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: `${appUrl}/api/connect/linkedin/callback`, client_id: clientId, client_secret: clientSecret }),
  })
  if (!tokenRes.ok) return Response.json({ error: 'Token exchange failed' }, { status: 502 })

  const tokens = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in: number }

  const meRes = await fetch('https://api.linkedin.com/v2/me', { headers: { Authorization: `Bearer ${tokens.access_token}` } })
  const me = await meRes.json() as { id: string; localizedFirstName: string; localizedLastName: string }

  const conn: LinkedInConn = { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: Date.now() + tokens.expires_in * 1000, personId: me.id, name: `${me.localizedFirstName} ${me.localizedLastName}` }
  await r.set(connKey(saved.email, 'linkedin'), conn, { ex: TTL })

  return Response.redirect(`${appUrl}/queue?email=${encodeURIComponent(saved.email)}&connected=linkedin`)
}
