'use client'

/**
 * Devnet GHOST Token Airdrop Button Component
 *
 * Allows users to claim 10,000 devnet GHOST tokens once per 24 hours.
 * For testing and development purposes only.
 */

import { useState, createElement } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '../ui/button'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2 } from 'lucide-react'

// Devnet GHOST token configuration
const DECIMALS = 6
const AIRDROP_AMOUNT = 10000 // 10,000 GHOST per request
const RATE_LIMIT_HOURS = 24

interface AirdropButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
  onSuccess?: (signature: string, balance: number) => void
}

export function AirdropButton({
  variant = 'default',
  size = 'default',
  className,
  onSuccess
}: AirdropButtonProps) {
  const { publicKey } = useWallet()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [lastClaim, setLastClaim] = useState<number | null>(null)

  // Check rate limit from local storage
  const checkRateLimit = (): boolean => {
    if (!publicKey) return false

    const key = `ghost_airdrop_${publicKey.toBase58()}`
    const stored = localStorage.getItem(key)

    if (!stored) return true

    const lastClaimTime = parseInt(stored, 10)
    const hoursSinceClaim = (Date.now() - lastClaimTime) / (1000 * 60 * 60)

    if (hoursSinceClaim >= RATE_LIMIT_HOURS) {
      return true
    }

    setLastClaim(lastClaimTime)
    return false
  }

  // Record claim in local storage
  const recordClaim = () => {
    if (!publicKey) return
    const key = `ghost_airdrop_${publicKey.toBase58()}`
    localStorage.setItem(key, Date.now().toString())
    setLastClaim(Date.now())
  }

  // Get time until next claim
  const getTimeUntilNextClaim = (): string => {
    if (!lastClaim) return '0 hours'

    const hoursSinceClaim = (Date.now() - lastClaim) / (1000 * 60 * 60)
    const hoursRemaining = Math.ceil(RATE_LIMIT_HOURS - hoursSinceClaim)

    if (hoursRemaining <= 0) {
      setLastClaim(null)
      return '0 hours'
    }
    if (hoursRemaining === 1) return '1 hour'
    return `${hoursRemaining} hours`
  }

  const handleAirdrop = async () => {
    if (!publicKey) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to claim devnet GHOST tokens',
        variant: 'destructive'
      })
      return
    }

    // Check rate limit
    if (!checkRateLimit()) {
      const timeRemaining = getTimeUntilNextClaim()
      toast({
        title: 'Rate limit exceeded',
        description: `You can claim again in ${timeRemaining}`,
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)

    try {
      toast({
        title: 'Requesting airdrop...',
        description: `Claiming ${AIRDROP_AMOUNT.toLocaleString()} devnet GHOST tokens`
      })

      // Call server-side airdrop API (handles faucet key and transaction)
      const response = await fetch('/api/airdrop/ghost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: publicKey.toBase58()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Airdrop failed')
      }

      const { signature, balance } = await response.json()

      // Record claim
      recordClaim()

      toast({
        title: 'Airdrop successful!',
        description: `Received ${AIRDROP_AMOUNT.toLocaleString()} GHOST. New balance: ${balance.toLocaleString()} GHOST. Click to view transaction.`,
        action: createElement('button', {
          onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=devnet`, '_blank'),
          className: 'text-sm underline',
        }, 'View Transaction') as any
      })

      // Callback with success data
      if (onSuccess) {
        onSuccess(signature, balance)
      }

    } catch (error: any) {
      console.error('Airdrop error:', error)

      toast({
        title: 'Airdrop failed',
        description: error.message || 'Failed to claim devnet GHOST tokens',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleAirdrop}
      disabled={isLoading || !publicKey}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Requesting...
        </>
      ) : (
        <>
          🪂 Get 10K Devnet GHOST
        </>
      )}
    </Button>
  )
}
