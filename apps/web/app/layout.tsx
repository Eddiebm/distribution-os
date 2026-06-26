import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DistributionOS — One idea. Every platform.',
  description: 'Generate a complete distribution system for every platform. Auto-post to connected accounts. Schedule a 20-day hook sequence.',
  openGraph: {
    title: 'DistributionOS',
    description: 'One idea. Every platform. Fully automated.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0A0A0A', color: '#fff' }}>
        {children}
      </body>
    </html>
  )
}
