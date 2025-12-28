'use client'

import { useState, useCallback } from 'react'
import { useCrossmintSigner } from './useCrossmintSigner'
import { toast } from 'sonner'
import type { Address } from '@solana/addresses'

/**
 * x402 Payment state
 */
export interface X402PaymentState {
  isPaying: boolean
  isVerifying: boolean
  lastSignature: string | null
  lastError: string | null
}

/**
 * x402 Payment request params
 */
export interface X402PaymentParams {
  agentAddress: string
  serviceEndpoint: string
  paymentAddress: string
  amount: bigint
  token: string // Token mint address (e.g., USDC)
  description?: string
}

/**
 * x402 Payment result
 */
export interface X402PaymentResult {
  success: boolean
  signature?: string
  receipt?: {
    amount: bigint
    token: string
    timestamp: number
  }
  error?: string
}

/**
 * Hook for making x402 payments to AI agents
 *
 * Wraps the SDK's X402Client for React usage with Crossmint wallet integration.
 */
export function useX402Payment() {
  const { createSigner, isConnected, address, sendTokens } = useCrossmintSigner()

  const [state, setState] = useState<X402PaymentState>({
    isPaying: false,
    isVerifying: false,
    lastSignature: null,
    lastError: null,
  })

  /**
   * Make a payment to an agent's x402 endpoint
   */
  const makePayment = useCallback(
    async (params: X402PaymentParams): Promise<X402PaymentResult> => {
      if (!isConnected || !address) {
        const error = 'Wallet not connected'
        setState((prev) => ({ ...prev, lastError: error }))
        return { success: false, error }
      }

      setState((prev) => ({
        ...prev,
        isPaying: true,
        lastError: null,
      }))

      try {
        const signer = createSigner()
        if (!signer) {
          throw new Error('Could not create signer')
        }

        // Convert amount to decimal string for Crossmint wallet.send()
        // params.amount is in token base units (e.g., 1000000 = 1 USDC with 6 decimals)
        const decimals = params.token.includes('USDC') ? 6 : 9 // USDC has 6 decimals, SOL has 9
        const amountDecimal = (Number(params.amount) / Math.pow(10, decimals)).toString()

        // Get token identifier for Crossmint (lowercase name)
        const tokenName = params.token.includes('USDC') ? 'usdc' : 'sol'

        toast.info(`Sending ${amountDecimal} ${tokenName.toUpperCase()} payment...`)

        // Make real payment using Crossmint wallet
        const result = await sendTokens(
          params.paymentAddress,
          tokenName,
          amountDecimal
        )

        if (!result.explorerLink) {
          throw new Error('Payment succeeded but no transaction signature returned')
        }

        // Extract signature from explorer link
        // Format: https://explorer.solana.com/tx/SIGNATURE?cluster=devnet
        const signatureMatch = result.explorerLink.match(/\/tx\/([^?]+)/)
        const signature = signatureMatch ? signatureMatch[1] : result.explorerLink

        setState((prev) => ({
          ...prev,
          isPaying: false,
          lastSignature: signature,
        }))

        toast.success('x402 payment successful!', {
          description: 'View on explorer',
          action: {
            label: 'View',
            onClick: () => window.open(result.explorerLink, '_blank'),
          },
        })

        return {
          success: true,
          signature,
          receipt: {
            amount: params.amount,
            token: params.token,
            timestamp: Date.now(),
          },
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Payment failed'

        setState((prev) => ({
          ...prev,
          isPaying: false,
          lastError: errorMessage,
        }))

        toast.error(`Payment failed: ${errorMessage}`)

        return { success: false, error: errorMessage }
      }
    },
    [isConnected, address, createSigner, sendTokens]
  )

  /**
   * Verify a payment signature
   */
  const verifyPayment = useCallback(
    async (signature: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, isVerifying: true }))

      try {
        // Use SDK to verify payment on-chain
        const { X402Client } = await import('@ghostspeak/sdk')
        const { createSolanaRpc } = await import('@solana/kit')
        
        const rpc = createSolanaRpc(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!)
        const x402 = new X402Client(rpc)
        
        const result = await x402.verifyPayment(signature)
        
        setState((prev) => ({ ...prev, isVerifying: false }))
        
        if (!result.valid) {
          toast.error('Payment verification failed', {
            description: result.error || 'Invalid transaction signature'
          })
        }
        
        return result.valid
      } catch (error) {
        console.error('Payment verification failed:', error)
        setState((prev) => ({
          ...prev,
          isVerifying: false,
          lastError: 'Verification failed',
        }))
        
        toast.error('Payment verification error', {
          description: error instanceof Error ? error.message : 'Unknown error'
        })
        
        return false
      }
    },
    []
  )

  /**
   * Reset payment state
   */
  const reset = useCallback(() => {
    setState({
      isPaying: false,
      isVerifying: false,
      lastSignature: null,
      lastError: null,
    })
  }, [])

  return {
    ...state,
    isWalletConnected: isConnected,
    walletAddress: address,
    makePayment,
    verifyPayment,
    reset,
  }
}

/**
 * Known USDC mint addresses
 */
export const USDC_MINTS = {
  mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address,
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' as Address,
}

/**
 * Known PYUSD mint addresses  
 */
export const PYUSD_MINTS = {
  mainnet: '2b1kV6DkPAnxd5ixpW2zbWJFZcv7BZRztXKEVJUfkS3' as Address,
  devnet: 'CXk2AMBfi3TwaEL2468xG2xL3j7iMQ4XZgd2fNKd4x7p' as Address,
}
