import type { Metadata } from 'next'
import Script from 'next/script'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { TelegramProvider } from '@/components/providers/TelegramProvider'
import { TelegramAuthGate } from '@/components/auth/TelegramAuthGate'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { ConvexProvider } from '@/components/providers/ConvexProvider'
import { WalletStandardProvider } from '@/lib/wallet/WalletStandardProvider'
import { TabNavigation } from '@/components/layout/TabNavigation'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'GhostSpeak | AI Agent Trust Layer',
  description: 'Verify, create, and manage AI agent credentials on Telegram',
  robots: {
    index: false, // Mini Apps shouldn't be indexed
    follow: false,
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background font-sans text-foreground antialiased">
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://plugin.jup.ag/plugin-v1.js"
          strategy="afterInteractive"
        />
        <TelegramProvider>
          <TelegramAuthGate botUsername={process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'ghostspeak_bot'}>
            <ConvexProvider>
              <WalletStandardProvider endpoint={process.env.NEXT_PUBLIC_SOLANA_RPC_URL} autoConnect={false}>
                <QueryProvider>
                  <div className="pb-20">{children}</div>
                  <TabNavigation />
                </QueryProvider>
              </WalletStandardProvider>
            </ConvexProvider>
          </TelegramAuthGate>
        </TelegramProvider>
      </body>
    </html>
  )
}
