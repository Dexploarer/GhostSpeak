import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Navigation } from '@/components/layout/Navigation'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/toaster'
import { GhostSpeakErrorBoundary } from '@/components/error-boundaries'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'GhostSpeak - Trust Layer for AI',
  description:
    'On-chain reputation and verifiable credentials for AI agents on Solana. Build trust with Ghost Score.',
  keywords:
    'AI agents, Solana, blockchain, reputation, verifiable credentials, Ghost Score, W3C, identity, trust',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="devfun-verification" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-linear-to-br from-purple-50 via-white to-blue-50 dark:bg-linear-to-br dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 text-gray-900 dark:text-gray-100`}
      >
        <Providers>
          <GhostSpeakErrorBoundary level="page">
            {/* Skip to content link for accessibility */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-9999 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Skip to main content
            </a>
            <div className="min-h-screen flex flex-col">
              <Navigation />
              <main id="main-content" className="flex-1" tabIndex={-1}>
                {children}
              </main>
            </div>
          </GhostSpeakErrorBoundary>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
