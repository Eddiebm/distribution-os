export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { redis } from '@/lib/redis'
import { connKey, stateKey, randomUrlSafe } from '@dist-os/platform'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })

  const clientId = process.env.LINKEDIN_CLIENT_ID
  if (!clientId) throw new Error('LINKEDIN_CLIENT_ID is required')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const state = randomUrlSafe(16)
  await redis().set(stateKey(state), { email }, { ex: 600 })

  const params = new URLSearchParams({
    response_type: 'code', client_id: clientId,
    redirect_uri: `${appUrl}/api/connect/linkedin/callback`,
    scope: 'openid profile email w_member_social r_liteprofile',
    state,
  })

  return Response.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`)
}

export async function DELETE(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })
  await redis().del(connKey(email, 'linkedin'))
  return Response.json({ ok: true })
}
