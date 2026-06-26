export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { redis } from '@/lib/redis'

interface HookItem {
  text: string
  platform: 'twitter' | 'linkedin'
}

export async function POST(req: NextRequest) {
  const { email, idea, hooks, bluesky, threads } = await req.json() as {
    email: string
    idea: string
    hooks: { twitter: string[]; linkedin: string[] }
    bluesky?: string[]
    threads?: string[]
  }
  if (!email || !idea || !hooks) return Response.json({ error: 'email, idea, hooks required' }, { status: 400 })

  const r = redis()
  const queueKey = `dist:queue:${email}`
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  const items: { score: number; member: string }[] = []

  // Twitter hooks — days 1-20 at 9 AM UTC
  hooks.twitter?.slice(0, 20).forEach((text, i) => {
    const score = now + (i + 1) * dayMs + 9 * 3600_000
    items.push({ score, member: JSON.stringify({ text, platform: 'twitter', idea, scheduledFor: score }) })
  })

  // LinkedIn hooks — days 1-20 at 11 AM UTC (offset 2h from twitter)
  hooks.linkedin?.slice(0, 20).forEach((text, i) => {
    const score = now + (i + 1) * dayMs + 11 * 3600_000
    items.push({ score, member: JSON.stringify({ text, platform: 'linkedin', idea, scheduledFor: score }) })
  })

  // Bluesky — days 1-5 at 10 AM UTC
  bluesky?.slice(0, 5).forEach((text, i) => {
    const score = now + (i + 1) * dayMs + 10 * 3600_000
    items.push({ score, member: JSON.stringify({ text, platform: 'bluesky', idea, scheduledFor: score }) })
  })

  // Threads — days 1-5 at 12 PM UTC
  threads?.slice(0, 5).forEach((text, i) => {
    const score = now + (i + 1) * dayMs + 12 * 3600_000
    items.push({ score, member: JSON.stringify({ text, platform: 'threads', idea, scheduledFor: score }) })
  })

  if (items.length === 0) return Response.json({ error: 'No content to schedule' }, { status: 400 })

  const scoredItems = items.map(i => ({ score: i.score, member: i.member }))
  await r.zadd(queueKey, scoredItems[0], ...scoredItems.slice(1))

  return Response.json({ ok: true, count: items.length })
}
