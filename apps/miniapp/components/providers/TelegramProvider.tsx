'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { init, backButton, themeParams, retrieveLaunchParams, retrieveRawInitData } from '@tma.js/sdk'
import { isDevelopment } from '@/lib/env'

interface TelegramContextValue {
  initDataRaw: string | null
  userId: number | null
  username: string | null
  firstName: string | null
  lastName: string | null
  isPremium: boolean
  themeParams: Record<string, string> | {}
  isReady: boolean
}

const TelegramContext = createContext<TelegramContextValue>({
  initDataRaw: null,
  userId: null,
  username: null,
  firstName: null,
  lastName: null,
  isPremium: false,
  themeParams: {},
  isReady: false,
})

export function useTelegram() {
  const context = useContext(TelegramContext)
  if (!context) {
    throw new Error('useTelegram must be used within TelegramProvider')
  }
  return context
}

interface TelegramProviderProps {
  children: ReactNode
}

export function TelegramProvider({ children }: TelegramProviderProps) {
  const [isReady, setIsReady] = useState(false)
  const [contextValue, setContextValue] = useState<TelegramContextValue>({
    initDataRaw: null,
    userId: null,
    username: null,
    firstName: null,
    lastName: null,
    isPremium: false,
    themeParams: {},
    isReady: false,
  })

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    try {
      // Initialize Telegram Mini App SDK
      if (isDevelopment) {
        console.log('[Dev] [TelegramProvider] Initializing Telegram SDK...')
      }
      init()

      // Get raw init data directly from @tma.js/bridge (2026 pattern)
      const initDataRaw = retrieveRawInitData()
      if (isDevelopment) {
        console.log('[Dev] [TelegramProvider] Raw init data retrieved:', {
          hasInitDataRaw: !!initDataRaw,
          initDataRawLength: initDataRaw?.length,
        })
      }

      // Get launch parameters for user data and theme
      const launchParams = retrieveLaunchParams()
      const data = launchParams.initData ?? {}
      const theme = launchParams.themeParams ?? {}

      if (isDevelopment) {
        console.log('[Dev] [TelegramProvider] Launch params:', {
          hasInitData: !!launchParams.initData,
          hasUser: !!(launchParams.initData as any)?.user,
        })
      }

      // Mount back button (hidden by default)
      backButton.mount()
      backButton.hide()

      // Set up back button handler
      backButton.onClick(() => {
        if (window.history.length > 1) {
          window.history.back()
        } else {
          backButton.hide()
        }
      })

      // Parse user data (type casting as the SDK types are complex)
      const user = (data as any)?.user

      const contextData = {
        initDataRaw: initDataRaw || null,
        userId: user?.id ?? null,
        username: user?.username ?? null,
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        isPremium: user?.isPremium ?? false,
        themeParams: theme,
        isReady: true,
      }

      if (isDevelopment) {
        console.log('[Dev] [TelegramProvider] Setting context:', {
          hasInitDataRaw: !!contextData.initDataRaw,
          userId: contextData.userId,
          username: contextData.username,
        })
      }

      setContextValue(contextData)
      setIsReady(true)

      // Notify Telegram that Mini App is ready
      if (window.Telegram?.WebApp) {
        if (isDevelopment) {
          console.log('[Dev] [TelegramProvider] Notifying Telegram WebApp ready')
        }
        window.Telegram.WebApp.ready()
        window.Telegram.WebApp.expand()
      }
    } catch (error) {
      // Suppress LaunchParamsRetrieveError - expected when not in Telegram
      if (isDevelopment) {
        console.error('[Dev] [TelegramProvider] Error during initialization:', error)
        if (error instanceof Error && error.message.includes('launch parameters')) {
          console.info('[Dev] [TelegramProvider] Running outside Telegram - will require login widget')
        } else {
          console.error('[Dev] [TelegramProvider] Failed to initialize Telegram SDK:', error)
        }
      }

      // Check if user authenticated via login widget (stored in sessionStorage)
      const storedUser = sessionStorage.getItem('telegram_user')
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser)
          setContextValue({
            initDataRaw: null, // No initDataRaw for widget auth
            userId: user.id ?? null,
            username: user.username ?? null,
            firstName: user.first_name ?? null,
            lastName: user.last_name ?? null,
            isPremium: false, // Widget doesn't provide premium status
            themeParams: {},
            isReady: true,
          })
          setIsReady(true)
          return
        } catch (parseError) {
          if (isDevelopment) {
            console.error('[Dev] Failed to parse stored telegram user:', parseError)
          }
        }
      }

      // Fallback: Not in Telegram and not authenticated
      // AuthGate will handle showing login widget
      setContextValue({
        initDataRaw: null,
        userId: null,
        username: null,
        firstName: null,
        lastName: null,
        isPremium: false,
        themeParams: {},
        isReady: true,
      })
      setIsReady(true)
    }

    // Cleanup
    return () => {
      try {
        backButton.unmount()
      } catch (error) {
        // Ignore unmount errors
      }
    }
  }, [])

  // Listen for telegram_user changes in sessionStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const storedUser = sessionStorage.getItem('telegram_user')
      if (storedUser && !contextValue.userId) {
        try {
          const user = JSON.parse(storedUser)
          setContextValue({
            ...contextValue,
            userId: user.id ?? null,
            username: user.username ?? null,
            firstName: user.first_name ?? null,
            lastName: user.last_name ?? null,
          })
        } catch (error) {
          if (isDevelopment) {
            console.error('[Dev] Failed to parse telegram user from storage:', error)
          }
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [contextValue])

  // Apply theme CSS variables and dark mode class
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Apply dark mode class based on Telegram's color scheme
    try {
      const theme = contextValue.themeParams as Record<string, string>
      const bgColor = theme.bgColor || theme.bg_color || ''
      // Simple heuristic: if background is dark (low RGB values), use dark mode
      const isDark = bgColor && bgColor.startsWith('#') && parseInt(bgColor.slice(1, 3), 16) < 128

      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } catch (error) {
      // If not in Telegram, default to light mode
      document.documentElement.classList.remove('dark')
    }

    // Apply Telegram theme CSS variables
    if (!contextValue.themeParams) return
    const theme = contextValue.themeParams as Record<string, string>

    requestAnimationFrame(() => {
      Object.entries(theme).forEach(([key, value]) => {
        const cssKey = `--tg-theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
        document.documentElement.style.setProperty(cssKey, value)
      })
    })
  }, [contextValue.themeParams])

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-tg-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-tg-hint border-t-tg-button" />
          <p className="text-sm text-tg-hint">Loading GhostSpeak...</p>
        </div>
      </div>
    )
  }

  return <TelegramContext.Provider value={contextValue}>{children}</TelegramContext.Provider>
}

// Type declarations for Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        expand: () => void
        close: () => void
        MainButton: {
          text: string
          color: string
          textColor: string
          isVisible: boolean
          isActive: boolean
          show: () => void
          hide: () => void
          enable: () => void
          disable: () => void
          showProgress: (leaveActive: boolean) => void
          hideProgress: () => void
          setText: (text: string) => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
        BackButton: {
          isVisible: boolean
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
      }
    }
  }
}
