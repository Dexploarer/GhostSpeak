'use client'

import { useEffect, useRef } from 'react'

interface TelegramLoginButtonProps {
  botId: string
  onAuth: (user: TelegramUser) => void
  buttonSize?: 'large' | 'medium' | 'small'
  cornerRadius?: number
  requestAccess?: boolean
}

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export function TelegramLoginButton({
  botId,
  onAuth,
  buttonSize = 'large',
  cornerRadius = 20,
  requestAccess = true,
}: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create callback function in global scope
    const callbackName = `onTelegramAuth_${Date.now()}`
    ;(window as any)[callbackName] = (user: TelegramUser) => {
      onAuth(user)
      // Clean up
      delete (window as any)[callbackName]
    }

    // Create script element for Telegram Login Widget
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botId)
    script.setAttribute('data-size', buttonSize)
    script.setAttribute('data-radius', cornerRadius.toString())
    script.setAttribute('data-onauth', `${callbackName}(user)`)
    script.setAttribute('data-request-access', requestAccess ? 'write' : '')
    script.async = true

    containerRef.current.appendChild(script)

    return () => {
      // Clean up callback
      delete (window as any)[callbackName]
    }
  }, [botId, onAuth, buttonSize, cornerRadius, requestAccess])

  return <div ref={containerRef} className="flex justify-center" />
}
