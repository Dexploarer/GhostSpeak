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
  const { createSigner, isConnected, address } = useCrossmintSigner()

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

        // TODO: Replace with actual SDK X402Client integration
        // This is a placeholder for the actual payment flow
        //
        // const client = new X402Client(rpc, signer)
        // const receipt = await client.pay({
        //   recipient: params.paymentAddress as Address,
        //   amount: params.amount,
        //   token: params.token as Address,
        //   description: params.description,
        // })

        // Simulate payment for now
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Mock successful payment
        const mockSignature = `x402-${Date.now()}-${Math.random().toString(36).substring(7)}`

        setState((prev) => ({
          ...prev,
          isPaying: false,
          lastSignature: mockSignature,
        }))

        toast.success('x402 payment successful!')

        return {
          success: true,
          signature: mockSignature,
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
    [isConnected, address, createSigner]
  )

  /**
   * Verify a payment signature
   */
  const verifyPayment = useCallback(
    async (signature: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, isVerifying: true }))

      try {
        // TODO: Replace with actual SDK verification
        // const client = new X402Client(rpc)
        // const result = await client.verifyPayment(signature)
        // return result.valid

        // Mock verification
        await new Promise((resolve) => setTimeout(resolve, 500))

        setState((prev) => ({ ...prev, isVerifying: false }))
        return true
      } catch (error) {
        console.error('Payment verification failed:', error)
        setState((prev) => ({
          ...prev,
          isVerifying: false,
          lastError: 'Verification failed',
        }))
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
