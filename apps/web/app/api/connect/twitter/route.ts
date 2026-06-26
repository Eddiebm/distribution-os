export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { redis } from '@/lib/redis'
import { connKey, stateKey, randomUrlSafe, pkceChallenge } from '@dist-os/platform'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })

  const clientId = process.env.TWITTER_CLIENT_ID
  if (!clientId) throw new Error('TWITTER_CLIENT_ID is required')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const verifier = randomUrlSafe(32)
  const challenge = await pkceChallenge(verifier)
  const state = randomUrlSafe(16)

  await redis().set(stateKey(state), { email, verifier }, { ex: 600 })

  const params = new URLSearchParams({
    response_type: 'code', client_id: clientId,
    redirect_uri: `${appUrl}/api/connect/twitter/callback`,
    scope: 'tweet.write tweet.read users.read offline.access',
    state, code_challenge: challenge, code_challenge_method: 'S256',
  })

  return Response.redirect(`https://twitter.com/i/oauth2/authorize?${params}`)
}

export async function DELETE(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })
  await redis().del(connKey(email, 'twitter'))
  return Response.json({ ok: true })
}
