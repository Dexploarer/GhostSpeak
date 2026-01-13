'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTelegram } from '@/components/providers/TelegramProvider'
import { ErrorBoundary } from '@/components/error-boundary'

export default function LandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isReady } = useTelegram()

  useEffect(() => {
    if (!isReady) return

    // Get start parameter from Telegram (e.g., /verify, /create, /profile)
    const startParam = searchParams.get('tgWebAppStartParam')

    // Route based on start parameter
    if (startParam === 'verify') {
      router.replace('/verify')
    } else if (startParam === 'create') {
      router.replace('/create')
    } else if (startParam === 'profile') {
      router.replace('/profile')
    } else {
      // Default to verify tab
      router.replace('/verify')
    }
  }, [isReady, searchParams, router])

  return (
    <ErrorBoundary>
      <div className="flex h-screen items-center justify-center bg-tg-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-tg-hint border-t-tg-button" />
          <p className="text-tg-hint">Loading GhostSpeak...</p>
        </div>
      </div>
    </ErrorBoundary>
  )
}
