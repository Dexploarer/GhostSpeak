'use client'

import { useState } from 'react'
import { Wallet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import bs58 from 'bs58'
import { useTelegram } from '@/components/providers/TelegramProvider'
import { isDevelopment } from '@/lib/env'

export function ConnectWalletButton() {
  const { userId } = useTelegram()
  const { publicKey, connected, connecting, connect, disconnect, signMessage, wallets } = useWallet()
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const linkWallet = useMutation(api.telegram.linkWallet)

  const handleConnect = async () => {
    setError(null)
    try {
      // Connect wallet
      await connect()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
    }
  }

  const handleLinkWallet = async () => {
    if (!publicKey || !userId) return

    setIsAuthenticating(true)
    setError(null)

    try {
      // Create message to sign
      const message = `Link Solana wallet to Telegram account\n\nTelegram ID: ${userId}\nWallet: ${publicKey}\nTimestamp: ${Date.now()}`
      const messageBytes = new TextEncoder().encode(message)

      // Sign message
      const signatureBytes = await signMessage(messageBytes)
      const signature = bs58.encode(signatureBytes)

      // Link wallet to Telegram account in Convex
      await linkWallet({
        telegramUserId: userId.toString(),
        walletAddress: publicKey,
        signature,
        message,
      })

      // Success!
      if (isDevelopment) {
        console.log('[Dev] Wallet linked successfully')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link wallet')
    } finally {
      setIsAuthenticating(false)
    }
  }

  if (wallets.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center">
        <Wallet className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-50" />
        <p className="mb-1 text-sm font-medium text-foreground">No Wallet Detected</p>
        <p className="text-xs text-muted-foreground">
          Install Phantom, Solflare, or Backpack to connect
        </p>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="space-y-3">
        <button
          onClick={handleConnect}
          disabled={connecting}
          aria-label={connecting ? 'Connecting to Solana wallet, please wait' : 'Connect your Solana wallet'}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {connecting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="h-5 w-5" aria-hidden="true" />
              Connect Wallet
            </>
          )}
        </button>
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted p-4">
        <div className="mb-2 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground">Wallet Connected</span>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {publicKey ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}` : ''}
        </p>
      </div>

      <button
        onClick={handleLinkWallet}
        disabled={isAuthenticating}
        aria-label={isAuthenticating ? 'Linking wallet to your Telegram account, please wait' : 'Link wallet to your Telegram account'}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        {isAuthenticating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Linking Wallet...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            Link to Telegram Account
          </>
        )}
      </button>

      <button
        onClick={disconnect}
        aria-label="Disconnect Solana wallet"
        className="w-full rounded-lg border border-border bg-background px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Disconnect
      </button>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  )
}
