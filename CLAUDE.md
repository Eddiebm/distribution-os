# DistributionOS — Claude Rules

## Project
Monorepo. Independent product, zero coupling to IdeaByLunch or MedOS.

## Structure
- `apps/web` — Next.js 15 App Router, Cloudflare Pages, edge runtime everywhere
- `packages/platform` — platform posting logic (Bluesky, Twitter, LinkedIn, Threads)
- `packages/tsconfig` — shared TypeScript config

## Rules (inherit from ~/.claude/CLAUDE.md, plus):
- Every `apps/web/app/api/**/route.ts` must have `export const runtime = "edge"` on line 1
- Every `apps/web/app/**/page.tsx` that uses client APIs must have `'use client'` + `export const runtime = "edge"`
- Import platform functions from `@dist-os/platform`, never duplicate posting logic inline
- The `packages/platform` package is the single source of truth for all platform API calls

## Stack
- Next.js 15 App Router
- Cloudflare Pages (primary deploy target)
- Upstash Redis — all queue/session/connect storage
- Resend — email delivery
- OpenRouter → Gemini 2.5 Flash — content generation
- Creatomate — TikTok video rendering
- No database — Redis only for now

## Dev
```bash
pnpm install
pnpm dev          # starts apps/web on :3000
pnpm build        # turborepo build
pnpm type-check   # tsc --noEmit across all packages
```

## Deploy
```bash
# Vercel (auto-deploys on push to main)
# Set root directory = apps/web in Vercel project settings
# OR use wrangler for Cloudflare Pages
cd apps/web && npx wrangler pages deploy .next
```

## Key routes
- `/` — landing page
- `/generate` — main distribution system builder
- `/queue` — 20-day post queue + platform connections
- `/api/generate` — SSE stream (OpenRouter → Gemini 2.5 Flash)
- `/api/generate/tiktok` — Creatomate video render
- `/api/connect/*` — OAuth flows (Twitter, LinkedIn, Threads, Bluesky)
- `/api/schedule` — queue 20+ posts in Redis
- `/api/queue` — fetch queue for email
- `/api/cron/post` — daily auto-poster (Vercel cron, noon UTC)

## Secrets — never commit .env, never hardcode fallbacks
