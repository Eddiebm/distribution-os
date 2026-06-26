'use client'
export const runtime = 'edge'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'

type CopyButtonProps = { text: string; size?: 'sm' | 'md' }
function CopyButton({ text, size = 'sm' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
      style={{ background: copied ? 'rgba(124,58,237,.15)' : 'rgba(255,255,255,.06)', border: `0.5px solid ${copied ? 'rgba(124,58,237,.4)' : 'rgba(255,255,255,.12)'}`, color: copied ? '#A78BFA' : 'rgba(255,255,255,.6)', borderRadius: 6, padding: size === 'md' ? '5px 12px' : '3px 9px', fontSize: size === 'md' ? 12 : 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
    >{copied ? '✓ Copied' : 'Copy'}</button>
  )
}

interface VideoScript { hook: string; body: string; cta: string; caption: string; title: string }
interface InstagramPost { carouselSlides: string[]; caption: string; reelIdea: string }
interface RedditPost { subreddits: string[]; title: string; body: string; commentHook: string }
interface NewsletterPost { subjects: string[]; previewText: string; body: string }
interface IHPost { title: string; body: string }
interface ParsedSection {
  channelMap: string
  twitterHooks: string[]
  linkedinHooks: string[]
  tiktokScripts: VideoScript[]
  instagram: InstagramPost
  threadsPost: string[]
  bluesky: string[]
  reddit: RedditPost
  newsletter: NewsletterPost
  indieHackers: IHPost
}

function extractField(text: string, field: string, nextFields: string[] = []): string {
  const fieldPattern = new RegExp(`${field}:\\s*([\\s\\S]*?)(?=${nextFields.map(f => `${f}:`).join('|')}|$)`, 'i')
  return text.match(fieldPattern)?.[1]?.trim() || ''
}

function parseOutput(raw: string): ParsedSection {
  const sec = (name: string) => {
    const m = raw.match(new RegExp(`##\\s*${name}[^\\n]*\\n([\\s\\S]*?)(?=---\\s*##|$)`, 'i'))
    return m?.[1]?.trim() || ''
  }

  const twitterSec = sec('TWITTER')
  const linkedinSec = sec('LINKEDIN')
  const tiktokSec = sec('TIKTOK')
  const igSec = sec('INSTAGRAM')
  const threadsSec = sec('THREADS')
  const blueskySec = sec('BLUESKY')
  const redditSec = sec('REDDIT')
  const newsletterSec = sec('NEWSLETTER')
  const ihSec = sec('INDIE HACKERS')

  const parseHooks = (s: string) =>
    s.split(/Hook \d+\s*[—–-]+/g).slice(1).map(h => h.trim().split('\n')[0].trim()).filter(Boolean)

  const parsePosts = (s: string, prefix: string) =>
    s.split(new RegExp(`${prefix} \\d+:\\s*`)).slice(1).map(p => p.trim().split('\n')[0].trim()).filter(Boolean)

  const parseTikTok = (s: string): VideoScript[] =>
    s.split(/Script \d+\s*[—–-]+[^\n]*/g).slice(1).map(block => ({
      title: block.match(/^([^\n]+)/)?.[1]?.trim() || '',
      hook: extractField(block, 'HOOK', ['BODY', 'CTA', 'CAPTION']),
      body: extractField(block, 'BODY', ['CTA', 'CAPTION']),
      cta: extractField(block, 'CTA', ['CAPTION']),
      caption: extractField(block, 'CAPTION', []),
    })).filter(s => s.hook)

  const igSlides = igSec.match(/CAROUSEL_SLIDES:\s*([\s\S]*?)(?=\nCAPTION:|$)/i)?.[1]
    ?.split(/Slide \d+:\s*/g).slice(1).map(s => s.trim().split('\n')[0].trim()).filter(Boolean) || []
  const igCaption = extractField(igSec, 'CAPTION', ['REEL_IDEA'])
  const reelIdea = extractField(igSec, 'REEL_IDEA', [])

  const subreddits = redditSec.match(/SUBREDDIT_TARGETS:\s*([^\n]+)/i)?.[1]?.split(',').map(s => s.trim()).filter(Boolean) || []
  const subjects = newsletterSec.match(/SUBJECT_LINES:\s*([\s\S]*?)(?=\nPREVIEW_TEXT:|$)/i)?.[1]
    ?.split(/\d+\.\s+/).slice(1).map(s => s.trim().split('\n')[0].trim()).filter(Boolean) || []

  return {
    channelMap: sec('CHANNEL MAP'),
    twitterHooks: parseHooks(twitterSec),
    linkedinHooks: parseHooks(linkedinSec),
    tiktokScripts: parseTikTok(tiktokSec),
    instagram: { carouselSlides: igSlides, caption: igCaption, reelIdea },
    threadsPost: parsePosts(threadsSec, 'Post'),
    bluesky: parsePosts(blueskySec, 'Post'),
    reddit: { subreddits, title: extractField(redditSec, 'POST_TITLE', ['POST_BODY']), body: extractField(redditSec, 'POST_BODY', ['COMMENT_HOOK']), commentHook: extractField(redditSec, 'COMMENT_HOOK', []) },
    newsletter: { subjects, previewText: extractField(newsletterSec, 'PREVIEW_TEXT', ['BODY']), body: extractField(newsletterSec, 'BODY', []) },
    indieHackers: { title: extractField(ihSec, 'POST_TITLE', ['POST_BODY']), body: extractField(ihSec, 'POST_BODY', []) },
  }
}

const TABS = ['Overview', 'Twitter/X', 'LinkedIn', 'TikTok', 'Instagram', 'Threads', 'Bluesky', 'Reddit', 'Newsletter', 'IH'] as const
type Tab = typeof TABS[number]

const purple = '#7C3AED'
const purpleFaint = 'rgba(124,58,237,.12)'
const purpleBorder = 'rgba(124,58,237,.25)'
const dim = 'rgba(255,255,255,.35)'
const dimBorder = 'rgba(255,255,255,.08)'

export default function GeneratePage() {
  const [idea, setIdea] = useState('')
  const [email, setEmail] = useState('')
  const [raw, setRaw] = useState('')
  const [parsed, setParsed] = useState<ParsedSection | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [scheduleState, setScheduleState] = useState<'idle' | 'scheduling' | 'done'>('idle')
  const [videoStates, setVideoStates] = useState<Record<number, { status: 'idle' | 'generating' | 'done' | 'error'; renderId?: string; url?: string; error?: string }>>({})
  const abortRef = useRef<AbortController | null>(null)

  async function generateVideo(idx: number, s: VideoScript) {
    setVideoStates(prev => ({ ...prev, [idx]: { status: 'generating' } }))
    try {
      const res = await fetch('/api/generate/tiktok', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hook: s.hook, body: s.body, cta: s.cta, caption: s.caption }) })
      const data = await res.json()
      if (data.error) { setVideoStates(prev => ({ ...prev, [idx]: { status: 'error', error: data.error } })); return }
      const renderId = data.renderId
      setVideoStates(prev => ({ ...prev, [idx]: { status: 'generating', renderId } }))
      const poll = setInterval(async () => {
        const r = await fetch(`/api/generate/tiktok/status?id=${renderId}`)
        const d = await r.json()
        if (d.status === 'succeeded') { clearInterval(poll); setVideoStates(prev => ({ ...prev, [idx]: { status: 'done', url: d.url } })) }
        else if (d.status === 'failed') { clearInterval(poll); setVideoStates(prev => ({ ...prev, [idx]: { status: 'error', error: d.error || 'Render failed' } })) }
      }, 3000)
    } catch (err) { setVideoStates(prev => ({ ...prev, [idx]: { status: 'error', error: String(err) } })) }
  }

  const generate = useCallback(async () => {
    if (!idea.trim()) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true); setRaw(''); setParsed(null); setActiveTab('Overview')

    try {
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea: idea.trim() }), signal: abortRef.current.signal })
      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = dec.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d === '[DONE]') continue
          try {
            const token = JSON.parse(d).choices?.[0]?.delta?.content || ''
            acc += token
            setRaw(acc)
          } catch { /* ignore */ }
        }
      }
      setParsed(parseOutput(acc))
    } catch (e: unknown) {
      if ((e as Error)?.name !== 'AbortError') console.error(e)
    } finally { setLoading(false) }
  }, [idea])

  async function scheduleAll() {
    if (!parsed || !email.trim()) return
    setScheduleState('scheduling')
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), idea: idea.trim(), hooks: { twitter: parsed.twitterHooks, linkedin: parsed.linkedinHooks }, bluesky: parsed.bluesky, threads: parsed.threadsPost }),
    })
    setScheduleState(res.ok ? 'done' : 'idle')
  }

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap',
    background: activeTab === t ? purpleFaint : 'transparent',
    color: activeTab === t ? '#A78BFA' : dim,
    outline: activeTab === t ? `0.5px solid ${purpleBorder}` : 'none',
  })

  const card = (style?: React.CSSProperties): React.CSSProperties => ({ background: 'rgba(255,255,255,.03)', border: `0.5px solid ${dimBorder}`, borderRadius: 12, padding: 20, ...style })

  return (
    <div style={{ minHeight: '100vh', maxWidth: 900, margin: '0 auto', padding: '0 20px 80px' }}>
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: `0.5px solid ${dimBorder}`, marginBottom: 36 }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: 17, textDecoration: 'none', color: '#fff', letterSpacing: '-0.5px' }}>
          Distribution<span style={{ color: purple }}>OS</span>
        </Link>
        {parsed && (
          <Link href={`/queue?email=${encodeURIComponent(email)}`} style={{ fontSize: 12, color: dim, textDecoration: 'none' }}>
            View queue →
          </Link>
        )}
      </div>

      {/* Input */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', margin: '0 0 6px' }}>Build your distribution system</h1>
        <p style={{ fontSize: 14, color: dim, margin: '0 0 20px' }}>One idea → hooks, scripts, captions, videos for every platform</p>
        <textarea
          value={idea}
          onChange={e => setIdea(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate() }}
          placeholder="Describe your idea, product, or content angle…"
          rows={3}
          style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: `0.5px solid rgba(255,255,255,.14)`, borderRadius: 10, padding: '14px 16px', fontSize: 15, color: '#fff', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <button onClick={generate} disabled={loading || !idea.trim()} style={{ background: purple, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: loading || !idea.trim() ? 0.6 : 1 }}>
            {loading ? 'Generating…' : 'Generate distribution system'}
          </button>
          {loading && <button onClick={() => abortRef.current?.abort()} style={{ background: 'rgba(255,255,255,.06)', color: dim, border: `0.5px solid ${dimBorder}`, borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Stop</button>}
        </div>
      </div>

      {/* Streaming preview */}
      {loading && !parsed && raw && (
        <div style={{ ...card(), marginBottom: 24, maxHeight: 220, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, color: dim, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: purple, animation: 'pulse 1.2s ease infinite' }} /> Generating…
          </div>
          <pre style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.5)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{raw.slice(-800)}</pre>
        </div>
      )}

      {/* Results */}
      {parsed && (
        <div>
          {/* Schedule bar */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', ...card({ padding: '14px 16px' }) }}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email"
              style={{ flex: 1, minWidth: 200, background: 'rgba(255,255,255,.06)', border: `0.5px solid ${dimBorder}`, borderRadius: 7, padding: '8px 12px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none' }} />
            <button onClick={scheduleAll} disabled={scheduleState !== 'idle' || !email.trim()}
              style={{ background: purple, color: '#fff', border: 'none', borderRadius: 7, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: scheduleState === 'idle' ? 'pointer' : 'default', fontFamily: 'inherit', opacity: scheduleState !== 'idle' || !email.trim() ? 0.6 : 1, whiteSpace: 'nowrap' }}>
              {scheduleState === 'scheduling' ? 'Scheduling…' : scheduleState === 'done' ? '✓ Scheduled' : 'Schedule 20-day sequence →'}
            </button>
            {scheduleState === 'done' && (
              <Link href={`/queue?email=${encodeURIComponent(email)}`} style={{ fontSize: 12, color: '#A78BFA', textDecoration: 'none' }}>View queue →</Link>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', marginBottom: 24, paddingBottom: 4 }}>
            {TABS.map(t => <button key={t} style={tabStyle(t)} onClick={() => setActiveTab(t)}>{t}</button>)}
          </div>

          {/* Tab content */}
          {activeTab === 'Overview' && (
            <div style={card()}>
              <div style={{ fontSize: 11, fontWeight: 700, color: purple, letterSpacing: '1px', marginBottom: 12 }}>CHANNEL MAP</div>
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,.7)', lineHeight: 1.7 }}>{parsed.channelMap}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 20 }}>
                {[{ label: 'Twitter hooks', n: parsed.twitterHooks.length }, { label: 'LinkedIn hooks', n: parsed.linkedinHooks.length }, { label: 'TikTok scripts', n: parsed.tiktokScripts.length }, { label: 'Threads posts', n: parsed.threadsPost.length }, { label: 'Bluesky posts', n: parsed.bluesky.length }]
                  .map(({ label, n }) => (
                    <div key={label} style={{ background: purpleFaint, border: `0.5px solid ${purpleBorder}`, borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#A78BFA' }}>{n}</div>
                      <div style={{ fontSize: 11, color: dim, marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'Twitter/X' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {parsed.twitterHooks.map((h, i) => (
                <div key={i} style={card({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 })}>
                  <div>
                    <div style={{ fontSize: 10, color: dim, marginBottom: 6 }}>Hook {i + 1} · {h.length}/280</div>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{h}</p>
                  </div>
                  <CopyButton text={h} />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'LinkedIn' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {parsed.linkedinHooks.map((h, i) => (
                <div key={i} style={card({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 })}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: dim, marginBottom: 6 }}>Hook {i + 1}</div>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>{h}</p>
                  </div>
                  <CopyButton text={h} />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'TikTok' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {parsed.tiktokScripts.map((s, i) => {
                const vs = videoStates[i] || { status: 'idle' }
                return (
                  <div key={i} style={card()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#A78BFA' }}>Script {i + 1}{s.title ? ` — ${s.title}` : ''}</div>
                    </div>
                    {[{ label: 'HOOK', value: s.hook }, { label: 'BODY', value: s.body }, { label: 'CTA', value: s.cta }, { label: 'CAPTION', value: s.caption }].filter(f => f.value).map(({ label, value }) => (
                      <div key={label} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: purple, letterSpacing: '1px', marginBottom: 4 }}>{label}</div>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,.8)' }}>{value}</p>
                      </div>
                    ))}
                    <div style={{ borderTop: `0.5px solid ${dimBorder}`, paddingTop: 12, marginTop: 4 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                        <CopyButton size="md" text={[s.hook && `HOOK: ${s.hook}`, s.body && `BODY: ${s.body}`, s.cta && `CTA: ${s.cta}`, s.caption && `CAPTION: ${s.caption}`].filter(Boolean).join('\n\n')} />
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.2)' }}>Copy full script</span>
                      </div>
                      {vs.status === 'idle' && (
                        <button onClick={() => generateVideo(i, s)} style={{ background: purple, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          🎬 Generate TikTok video
                        </button>
                      )}
                      {vs.status === 'generating' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: purpleFaint, border: `0.5px solid ${purpleBorder}`, borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: purple, animation: 'pulse 1.2s ease infinite' }} />
                          <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>Rendering video… ~30–60 seconds</span>
                        </div>
                      )}
                      {vs.status === 'done' && vs.url && (
                        <div>
                          <video src={vs.url} controls playsInline style={{ width: '100%', maxWidth: 280, borderRadius: 10, marginBottom: 10, display: 'block' }} />
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <a href={vs.url} download="tiktok-video.mp4" style={{ background: purple, color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600 }}>Download MP4</a>
                            <a href="https://www.tiktok.com/upload" target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(255,255,255,.08)', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600 }}>Post to TikTok ↗</a>
                            <button onClick={() => generateVideo(i, s)} style={{ background: 'none', border: `0.5px solid ${dimBorder}`, color: dim, borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Regenerate</button>
                          </div>
                        </div>
                      )}
                      {vs.status === 'error' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,.08)', border: '0.5px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '10px 14px' }}>
                          <span style={{ fontSize: 12, color: '#F87171', flex: 1 }}>{vs.error || 'Generation failed'}</span>
                          <button onClick={() => generateVideo(i, s)} style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Retry</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'Instagram' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {parsed.instagram.carouselSlides.length > 0 && (
                <div style={card()}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: purple, letterSpacing: '1px', marginBottom: 12 }}>CAROUSEL</div>
                  {parsed.instagram.carouselSlides.map((slide, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 10, color: purple, fontWeight: 700, minWidth: 20, marginTop: 2 }}>S{i + 1}</span>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{slide}</p>
                    </div>
                  ))}
                </div>
              )}
              {parsed.instagram.caption && (
                <div style={card()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: purple, letterSpacing: '1px' }}>CAPTION</div>
                    <CopyButton text={parsed.instagram.caption} />
                  </div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,.75)' }}>{parsed.instagram.caption}</p>
                </div>
              )}
              {parsed.instagram.reelIdea && (
                <div style={card()}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: purple, letterSpacing: '1px', marginBottom: 8 }}>REEL IDEA</div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{parsed.instagram.reelIdea}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Threads' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {parsed.threadsPost.map((p, i) => (
                <div key={i} style={card({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 })}>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, flex: 1 }}>{p}</p>
                  <CopyButton text={p} />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Bluesky' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {parsed.bluesky.map((p, i) => (
                <div key={i} style={card({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 })}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: dim, marginBottom: 4 }}>{p.length}/300</div>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>{p}</p>
                  </div>
                  <CopyButton text={p} />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Reddit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {parsed.reddit.subreddits.length > 0 && (
                <div style={card()}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: purple, letterSpacing: '1px', marginBottom: 10 }}>TARGET SUBREDDITS</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {parsed.reddit.subreddits.map(s => (
                      <span key={s} style={{ background: purpleFaint, border: `0.5px solid ${purpleBorder}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#A78BFA' }}>r/{s.replace(/^r\//, '')}</span>
                    ))}
                  </div>
                </div>
              )}
              {parsed.reddit.title && (
                <div style={card()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: purple, letterSpacing: '1px' }}>POST</div>
                    <CopyButton text={`${parsed.reddit.title}\n\n${parsed.reddit.body}`} />
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{parsed.reddit.title}</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.65)', lineHeight: 1.7 }}>{parsed.reddit.body}</p>
                </div>
              )}
              {parsed.reddit.commentHook && (
                <div style={card()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: purple, letterSpacing: '1px' }}>COMMENT HOOK</div>
                    <CopyButton text={parsed.reddit.commentHook} />
                  </div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>{parsed.reddit.commentHook}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Newsletter' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {parsed.newsletter.subjects.length > 0 && (
                <div style={card()}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: purple, letterSpacing: '1px', marginBottom: 12 }}>SUBJECT LINES</div>
                  {parsed.newsletter.subjects.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < parsed.newsletter.subjects.length - 1 ? `0.5px solid ${dimBorder}` : 'none' }}>
                      <span style={{ fontSize: 13 }}>{s}</span>
                      <CopyButton text={s} />
                    </div>
                  ))}
                </div>
              )}
              {parsed.newsletter.previewText && (
                <div style={card()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: purple, letterSpacing: '1px' }}>PREVIEW TEXT</div>
                    <CopyButton text={parsed.newsletter.previewText} />
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: dim }}>{parsed.newsletter.previewText}</p>
                </div>
              )}
              {parsed.newsletter.body && (
                <div style={card()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: purple, letterSpacing: '1px' }}>NEWSLETTER BODY</div>
                    <CopyButton text={parsed.newsletter.body} size="md" />
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,.75)', whiteSpace: 'pre-wrap' }}>{parsed.newsletter.body}</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'IH' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {parsed.indieHackers.title && (
                <div style={card()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: purple, letterSpacing: '1px' }}>POST</div>
                    <CopyButton text={`${parsed.indieHackers.title}\n\n${parsed.indieHackers.body}`} size="md" />
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>{parsed.indieHackers.title}</p>
                  <div style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,.7)', whiteSpace: 'pre-wrap' }}>{parsed.indieHackers.body}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
