export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { redis } from '@/lib/redis'
import { connKey, stateKey, randomUrlSafe } from '@dist-os/platform'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })

  const appId = process.env.THREADS_APP_ID
  if (!appId) throw new Error('THREADS_APP_ID is required')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const state = randomUrlSafe(16)
  await redis().set(stateKey(state), { email }, { ex: 600 })

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: `${appUrl}/api/connect/threads/callback`,
    scope: 'threads_basic,threads_content_publish',
    response_type: 'code', state,
  })

  return Response.redirect(`https://threads.net/oauth/authorize?${params}`)
}

export async function DELETE(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })
  await redis().del(connKey(email, 'threads'))
  return Response.json({ ok: true })
}
