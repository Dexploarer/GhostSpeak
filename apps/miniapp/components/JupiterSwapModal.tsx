'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { config } from '@/lib/config'
import { isDevelopment } from '@/lib/env'

interface JupiterSwapModalProps{
  isOpen: boolean
  onClose: () => void
}

declare global {
  interface Window {
    Jupiter?: {
      init: (config: {
        displayMode: 'integrated'
        integratedTargetId: string
        formProps: {
          initialInputMint: string
          fixedOutputMint?: string
        }
      }) => void
      close: () => void
    }
  }
}

export function JupiterSwapModal({ isOpen, onClose }: JupiterSwapModalProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && window.Jupiter) {
      // Initialize Jupiter plugin
      try {
        window.Jupiter.init({
          displayMode: 'integrated',
          integratedTargetId: 'jupiter-terminal',
          formProps: {
            initialInputMint: 'So11111111111111111111111111111111111111112', // SOL
            fixedOutputMint: config.solana.ghostTokenAddress, // $GHOST
          },
        })
        setIsLoaded(true)
      } catch (error) {
        if (isDevelopment) {
          console.error('[Dev] Error initializing Jupiter:', error)
        }
      }
    }

    return () => {
      if (window.Jupiter?.close) {
        window.Jupiter.close()
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-card border border-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold text-card-foreground">
            Buy $GHOST
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-accent"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Jupiter Terminal Container */}
        <div className="p-4">
          <div
            id="jupiter-terminal"
            style={{
              width: '100%',
              height: '568px',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          />
          {!isLoaded && (
            <div className="flex h-[568px] items-center justify-center">
              <div className="text-center">
                <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                <p className="text-sm text-muted-foreground">Loading Jupiter...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
