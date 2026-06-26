'use client'
export const runtime = 'edge'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const purple = '#7C3AED'
const dim = 'rgba(255,255,255,.4)'
const dimBorder = 'rgba(255,255,255,.08)'

interface QueueItem { text: string; platform: string; scheduledFor: number; autoPosted?: boolean; postedAt?: number }
interface ConnStatus { connected: boolean; handle?: string }
interface AllConnStatus { bluesky: ConnStatus; twitter: ConnStatus; linkedin: ConnStatus; threads: ConnStatus }

function BlueskyForm({ email, onConnected }: { email: string; onConnected: (handle: string) => void }) {
  const [id, setId] = useState(''); const [pw, setPw] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState('')
  return (
    <form onSubmit={async e => {
      e.preventDefault(); setLoading(true); setError('')
      const res = await fetch('/api/connect/bluesky', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, identifier: id, appPassword: pw }) })
      const d = await res.json()
      if (d.ok) onConnected(d.handle)
      else { setError(d.error || 'Connection failed'); setLoading(false) }
    }} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
      <input value={id} onChange={e => setId(e.target.value)} placeholder="handle.bsky.social or email" required style={{ background: 'rgba(255,255,255,.06)', border: `0.5px solid ${dimBorder}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, color: '#fff', fontFamily: 'inherit', outline: 'none' }} />
      <input value={pw} onChange={e => setPw(e.target.value)} placeholder="App password (not your main password)" type="password" required style={{ background: 'rgba(255,255,255,.06)', border: `0.5px solid ${dimBorder}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, color: '#fff', fontFamily: 'inherit', outline: 'none' }} />
      {error && <p style={{ margin: 0, fontSize: 11, color: '#F87171' }}>{error}</p>}
      <button type="submit" disabled={loading} style={{ background: '#0085FF', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' }}>
        {loading ? 'Connecting…' : 'Connect Bluesky'}
      </button>
      <p style={{ margin: 0, fontSize: 10, color: dim }}>Create app passwords at bsky.app → Settings → App Passwords</p>
    </form>
  )
}

const PLATFORM_META: Record<string, { label: string; color: string; oauthPath?: string }> = {
  twitter: { label: 'Twitter / X', color: '#1DA1F2', oauthPath: '/api/connect/twitter' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', oauthPath: '/api/connect/linkedin' },
  threads: { label: 'Threads', color: '#101010', oauthPath: '/api/connect/threads' },
  bluesky: { label: 'Bluesky', color: '#0085FF' },
}

export default function QueuePage() {
  const [email, setEmail] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [items, setItems] = useState<QueueItem[]>([])
  const [status, setStatus] = useState<AllConnStatus | null>(null)
  const [blueskyForms, setBlueskyForms] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const em = params.get('email') || ''
    const connected = params.get('connected')
    const error = params.get('error')
    if (em) { setEmail(em); setEmailInput(em); loadQueue(em) }
    if (connected) showToast(`✓ ${connected.charAt(0).toUpperCase() + connected.slice(1)} connected`)
    if (error) showToast(`Connection failed: ${error}`)
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  async function loadQueue(em: string) {
    const [qRes, sRes] = await Promise.all([
      fetch(`/api/queue?email=${encodeURIComponent(em)}`),
      fetch(`/api/connect/status?email=${encodeURIComponent(em)}`),
    ])
    const [qData, sData] = await Promise.all([qRes.json(), sRes.json()])
    if (qData.items) setItems(qData.items)
    if (sData.status) setStatus(sData.status as AllConnStatus)
  }

  async function disconnect(platform: string) {
    await fetch(`/api/connect/${platform}?email=${encodeURIComponent(email)}`, { method: 'DELETE' })
    await loadQueue(email)
  }

  const now = Date.now()
  const pending = items.filter(i => !i.autoPosted && i.scheduledFor > now)
  const sent = items.filter(i => i.autoPosted || i.scheduledFor <= now)

  return (
    <div style={{ minHeight: '100vh', maxWidth: 860, margin: '0 auto', padding: '0 20px 80px' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: purple, color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, zIndex: 100 }}>{toast}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: `0.5px solid ${dimBorder}`, marginBottom: 32 }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: 17, textDecoration: 'none', color: '#fff' }}>
          Distribution<span style={{ color: purple }}>OS</span>
        </Link>
        <Link href="/generate" style={{ fontSize: 12, color: dim, textDecoration: 'none' }}>← Generate new</Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 24px' }}>Distribution Queue</h1>

      {/* Email input */}
      {!email && (
        <div style={{ background: 'rgba(255,255,255,.03)', border: `0.5px solid ${dimBorder}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: dim }}>Enter your email to view your queue</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={emailInput} onChange={e => setEmailInput(e.target.value)} type="email" placeholder="your@email.com"
              style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: `0.5px solid ${dimBorder}`, borderRadius: 7, padding: '8px 12px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none' }} />
            <button onClick={() => { setEmail(emailInput); loadQueue(emailInput) }} disabled={!emailInput.trim()}
              style={{ background: purple, color: '#fff', border: 'none', borderRadius: 7, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Load queue</button>
          </div>
        </div>
      )}

      {email && status && (
        <>
          {/* Platform connections */}
          <div style={{ background: 'rgba(255,255,255,.03)', border: `0.5px solid ${dimBorder}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Connected accounts</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {(Object.keys(PLATFORM_META) as string[]).map(platform => {
                const meta = PLATFORM_META[platform]
                const conn = (status as unknown as Record<string, ConnStatus>)[platform]
                return (
                  <div key={platform} style={{ background: conn?.connected ? `${meta.color}18` : 'rgba(255,255,255,.03)', border: `0.5px solid ${conn?.connected ? meta.color + '40' : dimBorder}`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: conn?.connected ? 4 : 10, color: conn?.connected ? meta.color : '#fff' }}>{meta.label}</div>
                    {conn?.connected ? (
                      <>
                        <div style={{ fontSize: 11, color: dim, marginBottom: 8 }}>@{conn.handle}</div>
                        <button onClick={() => disconnect(platform)} style={{ background: 'rgba(239,68,68,.1)', color: '#F87171', border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Disconnect</button>
                      </>
                    ) : (
                      <>
                        {platform === 'bluesky' ? (
                          <>
                            <button onClick={() => setBlueskyForms(f => ({ ...f, [platform]: !f[platform] }))} style={{ background: meta.color, color: '#fff', border: 'none', borderRadius: 5, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Connect</button>
                            {blueskyForms[platform] && <BlueskyForm email={email} onConnected={() => { setBlueskyForms(f => ({ ...f, [platform]: false })); loadQueue(email); showToast('✓ Bluesky connected') }} />}
                          </>
                        ) : meta.oauthPath ? (
                          <a href={`${meta.oauthPath}?email=${encodeURIComponent(email)}`} style={{ display: 'inline-block', background: meta.color, color: '#fff', textDecoration: 'none', borderRadius: 5, padding: '5px 12px', fontSize: 11, fontWeight: 600 }}>Connect</a>
                        ) : null}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {[{ label: 'Total', n: items.length }, { label: 'Pending', n: pending.length }, { label: 'Auto-posted', n: sent.filter(i => i.autoPosted).length }].map(({ label, n }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,.03)', border: `0.5px solid ${dimBorder}`, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{n}</div>
                <div style={{ fontSize: 11, color: dim, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Queue items */}
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: dim }}>
              <p style={{ margin: '0 0 16px', fontSize: 15 }}>No posts scheduled yet.</p>
              <Link href="/generate" style={{ background: purple, color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600 }}>Generate your distribution system →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...items].sort((a, b) => a.scheduledFor - b.scheduledFor).map((item, i) => {
                const meta = PLATFORM_META[item.platform] || { label: item.platform, color: '#888' }
                const isPast = item.scheduledFor <= now
                return (
                  <div key={i} style={{ background: 'rgba(255,255,255,.03)', border: `0.5px solid ${dimBorder}`, borderRadius: 10, padding: '14px 16px', opacity: isPast ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: `${meta.color}18`, borderRadius: 4, padding: '2px 7px' }}>{meta.label.toUpperCase()}</span>
                          <span style={{ fontSize: 11, color: dim }}>{new Date(item.scheduledFor).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          {item.autoPosted && <span style={{ fontSize: 10, fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,.1)', borderRadius: 4, padding: '2px 7px' }}>🤖 AUTO-POSTED</span>}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,.8)' }}>{item.text}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
