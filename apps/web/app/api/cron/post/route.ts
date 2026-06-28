export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { Resend } from 'resend'
import { redis } from '@/lib/redis'
import { connKey, type Platform, type BlueskyConn, type TwitterConn, type LinkedInConn, type ThreadsConn, postBluesky, postTwitter, postLinkedIn, postThreads } from '@/lib/platform'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const r = redis()
  const fromEmail = process.env.RESEND_FROM ?? 'noreply@distributionos.com'
  const now = Date.now()

  // Find all queue keys
  const keys = await r.keys('dist:queue:*')
  const results: Array<{ email: string; posted: number; emailed: number }> = []

  for (const key of keys) {
    const email = key.replace('dist:queue:', '')
    if (!email.includes('@')) continue // skip non-email keys
    let due: string[]
    try { due = await r.zrange<string[]>(key, 0, now, { byScore: true }) }
    catch { continue } // skip keys with wrong type
    if (!due.length) continue

    let posted = 0, emailed = 0

    for (const raw of due) {
      let item: { text: string; platform: string; idea: string; scheduledFor: number; autoPosted?: boolean }
      try { item = typeof raw === 'string' ? JSON.parse(raw) : raw } catch { continue }

      const platform = item.platform as Platform
      let autoPosted = false

      if (platform === 'bluesky') {
        const conn = await r.get<BlueskyConn>(connKey(email, 'bluesky'))
        if (conn) {
          const result = await postBluesky(conn, item.text)
          if (result.ok) {
            autoPosted = true
            if (result.newConn) await r.set(connKey(email, 'bluesky'), result.newConn, { ex: 60 * 60 * 24 * 100 })
          }
        }
      } else if (platform === 'twitter') {
        const conn = await r.get<TwitterConn>(connKey(email, 'twitter'))
        const clientId = process.env.TWITTER_CLIENT_ID
        const clientSecret = process.env.TWITTER_CLIENT_SECRET
        if (conn && clientId && clientSecret) {
          const result = await postTwitter(conn, item.text, clientId, clientSecret)
          if (result.ok) {
            autoPosted = true
            if (result.newConn) await r.set(connKey(email, 'twitter'), result.newConn, { ex: 60 * 60 * 24 * 100 })
          }
        }
      } else if (platform === 'linkedin') {
        const conn = await r.get<LinkedInConn>(connKey(email, 'linkedin'))
        const clientId = process.env.LINKEDIN_CLIENT_ID
        const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
        if (conn && clientId && clientSecret) {
          const result = await postLinkedIn(conn, item.text, clientId, clientSecret)
          if (result.ok) {
            autoPosted = true
            if (result.newConn) await r.set(connKey(email, 'linkedin'), result.newConn, { ex: 60 * 60 * 24 * 100 })
          }
        }
      } else if (platform === 'threads') {
        const conn = await r.get<ThreadsConn>(connKey(email, 'threads'))
        if (conn) {
          const result = await postThreads(conn, item.text)
          if (result.ok) {
            autoPosted = true
            if (result.newConn) await r.set(connKey(email, 'threads'), result.newConn, { ex: 60 * 60 * 24 * 100 })
          }
        }
      }

      // Update item with autoPosted flag and remove from scheduled score
      const updated = { ...item, autoPosted, postedAt: now }
      await r.zrem(key, raw)
      await r.zadd(key, { score: item.scheduledFor, member: JSON.stringify(updated) })

      if (autoPosted) {
        posted++
      } else {
        // Send manual CTA email
        const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1)
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `Your ${platformLabel} post is ready`,
          html: `<p style="font-family:sans-serif;max-width:560px">Today's post for <strong>${platformLabel}</strong>:</p>
<blockquote style="border-left:3px solid #7C3AED;padding:12px 16px;font-family:sans-serif;background:#f5f5f5">${item.text}</blockquote>
<p style="font-family:sans-serif"><a href="${process.env.NEXT_PUBLIC_APP_URL}/queue?email=${encodeURIComponent(email)}">Connect your ${platformLabel} account</a> to auto-post next time.</p>`,
        })
        emailed++
      }
    }

    results.push({ email, posted, emailed })
  }

  return Response.json({ ok: true, results })
}
