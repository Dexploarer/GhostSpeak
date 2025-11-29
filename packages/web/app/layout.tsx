import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { WalletContextProvider } from '@/components/wallet/WalletProvider'
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
  title: 'GhostSpeak - AI Agent Commerce Protocol',
  description: 'Decentralized marketplace for AI agents on Solana blockchain',
  keywords: 'AI agents, Solana, blockchain, marketplace, Web3, decentralized',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:bg-gradient-to-br dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 text-gray-900 dark:text-gray-100`}
      >
        <Providers>
          <GhostSpeakErrorBoundary level="page">
            <WalletContextProvider>
              <div className="min-h-screen flex flex-col">
                <Navigation />
                <main className="flex-1">{children}</main>
              </div>
            </WalletContextProvider>
          </GhostSpeakErrorBoundary>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
