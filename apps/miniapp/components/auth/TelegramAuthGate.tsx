'use client'

import { useEffect, useState } from 'react'
import { TelegramLoginButton, type TelegramUser } from './TelegramLoginButton'
import { useTelegram } from '@/components/providers/TelegramProvider'

interface TelegramAuthGateProps {
  children: React.ReactNode
  botUsername: string
}

export function TelegramAuthGate({ children, botUsername }: TelegramAuthGateProps) {
  const telegram = useTelegram()
  const [authenticated, setAuthenticated] = useState(false)
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null)

  // Check if user came from Telegram Mini App
  const isFromTelegram = telegram.isReady && telegram.initDataRaw !== null

  useEffect(() => {
    if (isFromTelegram) {
      setAuthenticated(true)
    } else {
      // Check if user already authenticated (stored in sessionStorage)
      const storedUser = sessionStorage.getItem('telegram_user')
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser)
          setTelegramUser(user)
          setAuthenticated(true)
        } catch (error) {
          console.error('Failed to parse stored telegram user:', error)
          sessionStorage.removeItem('telegram_user')
        }
      }
    }
  }, [isFromTelegram])

  const handleTelegramAuth = (user: TelegramUser) => {
    console.log('Telegram auth successful:', user)
    setTelegramUser(user)
    setAuthenticated(true)
    // Store in sessionStorage for this session
    sessionStorage.setItem('telegram_user', JSON.stringify(user))

    // Update the Telegram context with real user data
    // This will be handled by the TelegramProvider
  }

  if (!telegram.isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading GhostSpeak...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Logo/Header */}
          <div className="space-y-2">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-4xl">
              👻
            </div>
            <h1 className="text-3xl font-bold text-foreground">GhostSpeak</h1>
            <p className="text-sm text-muted-foreground">AI Agent Trust Layer</p>
          </div>

          {/* Authentication message */}
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-card-foreground">
                Verify Your Telegram Account
              </h2>
              <p className="text-sm text-muted-foreground">
                GhostSpeak is a Telegram Mini App. Please authenticate with your Telegram account
                to continue.
              </p>
            </div>

            {/* Telegram Login Button */}
            <div className="pt-4">
              <TelegramLoginButton
                botId={botUsername}
                onAuth={handleTelegramAuth}
                buttonSize="large"
                cornerRadius={8}
                requestAccess={true}
              />
            </div>

            {/* Alternative access */}
            <div className="pt-4 text-xs text-muted-foreground">
              <p>
                For the best experience, open GhostSpeak directly from Telegram by searching for{' '}
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline"
                >
                  @{botUsername}
                </a>
              </p>
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 gap-3 text-left">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔒</span>
                <div>
                  <h3 className="text-sm font-medium text-card-foreground">Secure</h3>
                  <p className="text-xs text-muted-foreground">
                    Your Telegram data is verified cryptographically
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="text-sm font-medium text-card-foreground">Fast</h3>
                  <p className="text-xs text-muted-foreground">
                    One-click login with your Telegram account
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // User is authenticated (either from Telegram or via login widget)
  return <>{children}</>
}
