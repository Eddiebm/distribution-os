import Link from 'next/link'

const PLATFORMS = [
  { icon: '𝕏', label: 'Twitter / X' },
  { icon: 'in', label: 'LinkedIn' },
  { icon: '🦋', label: 'Bluesky' },
  { icon: '◉', label: 'Threads' },
  { icon: '▶', label: 'TikTok' },
  { icon: '◻', label: 'Instagram' },
  { icon: '🤖', label: 'Reddit' },
  { icon: '✍', label: 'Newsletter' },
  { icon: '🚀', label: 'Indie Hackers' },
]

const STEPS = [
  { n: '01', title: 'Paste your idea', body: 'One sentence, a product description, or a rough draft. DistributionOS figures out the angle.' },
  { n: '02', title: 'Get your full distribution system', body: '20 hooks, TikTok scripts, captions, carousels, posts, newsletters — generated in under 30 seconds.' },
  { n: '03', title: 'Connect and auto-post', body: 'Link your accounts once. We schedule and post your content across all platforms automatically.' },
]

const WHAT_YOU_GET = [
  '20 Twitter/X hooks + 20 LinkedIn hooks',
  '3 TikTok video scripts + MP4 video generation',
  'Instagram carousels + captions + hashtags',
  'Threads, Bluesky, Reddit, Newsletter, Indie Hackers',
  'Auto-post to connected accounts',
  '20-day scheduled delivery by email',
]

export default function LandingPage() {
  return (
    <main style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', borderBottom: '0.5px solid rgba(255,255,255,.08)' }}>
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' }}>
          Distribution<span style={{ color: '#7C3AED' }}>OS</span>
        </span>
        <Link href="/generate" style={{ background: '#7C3AED', color: '#fff', textDecoration: 'none', padding: '9px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
          Get started →
        </Link>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '100px 24px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(124,58,237,.15)', border: '0.5px solid rgba(124,58,237,.3)', borderRadius: 999, padding: '5px 14px', fontSize: 12, color: '#A78BFA', marginBottom: 28, fontWeight: 500 }}>
          9 platforms. One generation.
        </div>
        <h1 style={{ fontSize: 'clamp(42px, 8vw, 72px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2.5px', margin: '0 0 24px' }}>
          One idea.<br />
          <span style={{ color: '#7C3AED' }}>Every platform.</span>
        </h1>
        <p style={{ fontSize: 20, color: 'rgba(255,255,255,.55)', maxWidth: 520, margin: '0 auto 44px', lineHeight: 1.6 }}>
          Generate a complete distribution system — hooks, videos, captions, posts — for every platform. Auto-post to your connected accounts.
        </p>
        <Link href="/generate" style={{ display: 'inline-block', background: '#7C3AED', color: '#fff', textDecoration: 'none', padding: '16px 36px', borderRadius: 10, fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>
          Build your distribution system →
        </Link>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.2)', marginTop: 12 }}>Free to try · No account required</p>
      </section>

      {/* Platform pills */}
      <section style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, padding: '0 24px 80px' }}>
        {PLATFORMS.map(p => (
          <div key={p.label} style={{ background: 'rgba(255,255,255,.05)', border: '0.5px solid rgba(255,255,255,.1)', borderRadius: 999, padding: '8px 16px', fontSize: 13, color: 'rgba(255,255,255,.7)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 14 }}>{p.icon}</span> {p.label}
          </div>
        ))}
      </section>

      {/* How it works */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 100px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, letterSpacing: '-1px', marginBottom: 56 }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ background: 'rgba(255,255,255,.03)', border: '0.5px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '28px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', letterSpacing: '1px', marginBottom: 14 }}>{s.n}</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.4px' }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,.45)', lineHeight: 1.6, margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px 100px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', marginBottom: 40 }}>What you get</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', maxWidth: 480, margin: '0 auto' }}>
          {WHAT_YOU_GET.map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15 }}>
              <span style={{ color: '#7C3AED', fontWeight: 700, flexShrink: 0 }}>✓</span>
              <span style={{ color: 'rgba(255,255,255,.75)' }}>{item}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 48 }}>
          <Link href="/generate" style={{ display: 'inline-block', background: '#7C3AED', color: '#fff', textDecoration: 'none', padding: '14px 32px', borderRadius: 10, fontSize: 16, fontWeight: 700 }}>
            Start distributing →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '0.5px solid rgba(255,255,255,.06)', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Distribution<span style={{ color: '#7C3AED' }}>OS</span></span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.2)' }}>One idea. Every platform.</span>
      </footer>
    </main>
  )
}
