export const PLATFORMS = ['bluesky', 'twitter', 'linkedin', 'threads'] as const
export type Platform = typeof PLATFORMS[number]

export interface BlueskyConn { did: string; handle: string; refreshJwt: string }
export interface TwitterConn { accessToken: string; refreshToken: string; expiresAt: number; userId: string; username: string }
export interface LinkedInConn { accessToken: string; refreshToken?: string; expiresAt: number; personId: string; name: string }
export interface ThreadsConn { accessToken: string; expiresAt: number; userId: string; username: string }

// Redis key helpers — import redis from the app, pass it in
export function connKey(email: string, platform: Platform) {
  return `dist:connect:${email}:${platform}`
}
export function stateKey(state: string) {
  return `oauth:state:${state}`
}

export function randomUrlSafe(byteLen = 32): string {
  const bytes = new Uint8Array(byteLen)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// ─── Bluesky ────────────────────────────────────────────────────────────────

export async function postBluesky(conn: BlueskyConn, text: string): Promise<{ ok: boolean; newConn?: BlueskyConn }> {
  // Refresh session to get fresh access JWT
  const refreshRes = await fetch('https://bsky.social/xrpc/com.atproto.server.refreshSession', {
    method: 'POST',
    headers: { Authorization: `Bearer ${conn.refreshJwt}` },
  })
  if (!refreshRes.ok) return { ok: false }
  const session = await refreshRes.json() as { accessJwt: string; refreshJwt: string }

  const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.accessJwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repo: conn.did,
      collection: 'app.bsky.feed.post',
      record: { $type: 'app.bsky.feed.post', text, createdAt: new Date().toISOString() },
    }),
  })
  if (!postRes.ok) return { ok: false }

  return { ok: true, newConn: { ...conn, refreshJwt: session.refreshJwt } }
}

// ─── Twitter / X ────────────────────────────────────────────────────────────

async function refreshTwitterToken(refreshToken: string, clientId: string, clientSecret: string) {
  const basic = btoa(`${clientId}:${clientSecret}`)
  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })
  if (!res.ok) return null
  const d = await res.json() as { access_token: string; refresh_token: string; expires_in: number }
  return { accessToken: d.access_token, refreshToken: d.refresh_token, expiresAt: Date.now() + d.expires_in * 1000 }
}

export async function postTwitter(conn: TwitterConn, text: string, clientId: string, clientSecret: string): Promise<{ ok: boolean; newConn?: TwitterConn }> {
  let { accessToken, refreshToken, expiresAt } = conn
  let updated: Partial<TwitterConn> = {}

  if (Date.now() > expiresAt - 60_000) {
    const refreshed = await refreshTwitterToken(refreshToken, clientId, clientSecret)
    if (!refreshed) return { ok: false }
    accessToken = refreshed.accessToken
    refreshToken = refreshed.refreshToken
    expiresAt = refreshed.expiresAt
    updated = { accessToken, refreshToken, expiresAt }
  }

  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) return { ok: false }

  return { ok: true, newConn: Object.keys(updated).length ? { ...conn, ...updated } : undefined }
}

// ─── LinkedIn ────────────────────────────────────────────────────────────────

async function refreshLinkedInToken(refreshToken: string, clientId: string, clientSecret: string) {
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret }),
  })
  if (!res.ok) return null
  const d = await res.json() as { access_token: string; refresh_token?: string; expires_in: number }
  return { accessToken: d.access_token, refreshToken: d.refresh_token ?? refreshToken, expiresAt: Date.now() + d.expires_in * 1000 }
}

export async function postLinkedIn(conn: LinkedInConn, text: string, clientId: string, clientSecret: string): Promise<{ ok: boolean; newConn?: LinkedInConn }> {
  let { accessToken, refreshToken, expiresAt } = conn
  let updated: Partial<LinkedInConn> = {}

  if (refreshToken && Date.now() > expiresAt - 7 * 24 * 3600_000) {
    const refreshed = await refreshLinkedInToken(refreshToken, clientId, clientSecret)
    if (refreshed) { accessToken = refreshed.accessToken; refreshToken = refreshed.refreshToken; expiresAt = refreshed.expiresAt; updated = { accessToken, refreshToken, expiresAt } }
  }

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
    body: JSON.stringify({
      author: `urn:li:person:${conn.personId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text }, shareMediaCategory: 'NONE' } },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  })
  if (!res.ok) return { ok: false }

  return { ok: true, newConn: Object.keys(updated).length ? { ...conn, ...updated } : undefined }
}

// ─── Threads ─────────────────────────────────────────────────────────────────

async function refreshThreadsToken(accessToken: string) {
  const url = new URL('https://graph.threads.net/refresh_access_token')
  url.searchParams.set('grant_type', 'th_refresh_token')
  url.searchParams.set('access_token', accessToken)
  const res = await fetch(url.toString())
  if (!res.ok) return null
  const d = await res.json() as { access_token: string; expires_in: number }
  return { accessToken: d.access_token, expiresAt: Date.now() + d.expires_in * 1000 }
}

export async function postThreads(conn: ThreadsConn, text: string): Promise<{ ok: boolean; newConn?: ThreadsConn }> {
  let { accessToken, expiresAt } = conn
  let updated: Partial<ThreadsConn> = {}

  if (Date.now() > expiresAt - 7 * 24 * 3600_000) {
    const refreshed = await refreshThreadsToken(accessToken)
    if (refreshed) { accessToken = refreshed.accessToken; expiresAt = refreshed.expiresAt; updated = { accessToken, expiresAt } }
  }

  // Create container
  const createRes = await fetch(`https://graph.threads.net/v1.0/${conn.userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_type: 'TEXT', text, access_token: accessToken }),
  })
  if (!createRes.ok) return { ok: false }
  const { id: containerId } = await createRes.json() as { id: string }

  // Publish
  const publishRes = await fetch(`https://graph.threads.net/v1.0/${conn.userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
  })
  if (!publishRes.ok) return { ok: false }

  return { ok: true, newConn: Object.keys(updated).length ? { ...conn, ...updated } : undefined }
}
