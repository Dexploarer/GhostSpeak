'use client'

/**
 * Devnet GHOST Token Airdrop Button Component
 *
 * Allows users to claim 10,000 devnet GHOST tokens once per 24 hours.
 * For testing and development purposes only.
 */

import { useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { address, type Address } from '@solana/addresses'
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  transfer,
  getAccount,
} from '@solana/spl-token'
import { Button } from '../ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

// Devnet GHOST token configuration
const DEVNET_GHOST_MINT: Address = address('BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh')
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
  const { connection } = useConnection()
  const { publicKey, signTransaction, sendTransaction } = useWallet()
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

    if (!sendTransaction) {
      toast({
        title: 'Wallet not ready',
        description: 'Please ensure your wallet is properly connected',
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

      // Load faucet wallet from environment
      const faucetPrivateKey = process.env.NEXT_PUBLIC_DEVNET_FAUCET_KEY
      if (!faucetPrivateKey) {
        throw new Error('Devnet faucet not configured')
      }

      // Get faucet token account
      const faucetTokenAccount = await getAssociatedTokenAddress(
        DEVNET_GHOST_MINT,
        publicKey
      )

      // Check faucet balance
      try {
        const faucetAccount = await getAccount(connection, faucetTokenAccount)
        const faucetBalance = Number(faucetAccount.amount) / 10 ** DECIMALS

        if (faucetBalance < AIRDROP_AMOUNT) {
          throw new Error(`Faucet has insufficient balance (${faucetBalance.toLocaleString()} GHOST)`)
        }
      } catch (error) {
        throw new Error('Devnet faucet not initialized. Please contact the team.')
      }

      // Get or create recipient token account
      const recipientTokenAccount = await getAssociatedTokenAddress(
        DEVNET_GHOST_MINT as any,
        publicKey
      )

      // Create account if needed (this requires signing)
      let recipientAccount
      try {
        recipientAccount = await getAccount(connection, recipientTokenAccount)
      } catch {
        // Account doesn't exist, user needs to create it
        // This will be done automatically by the wallet adapter
        toast({
          title: 'Creating token account...',
          description: 'Please approve the transaction to create your GHOST token account'
        })
      }

      // For webapp, we use an API route to handle the transfer
      // because we can't expose the faucet private key in the browser
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
        description: `Received ${AIRDROP_AMOUNT.toLocaleString()} GHOST. New balance: ${balance.toLocaleString()} GHOST`,
        action: {
          label: 'View Transaction',
          onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=devnet`, '_blank')
        }
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
