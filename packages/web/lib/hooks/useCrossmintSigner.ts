'use client'

import { useCallback } from 'react'
import { useWallet, useAuth } from '@crossmint/client-sdk-react-ui'
import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'

/**
 * Crossmint transaction signing interface
 * Adapts Crossmint wallet to work with GhostSpeak SDK
 */
export interface CrossmintSignerResult {
  /** Wallet address as Address type */
  address: Address | null
  /** Whether the wallet is fully loaded and ready */
  isConnected: boolean
  /** Whether the user is authenticated */
  isAuthenticated: boolean
  /** Whether auth or wallet is loading */
  isLoading: boolean
  /** Wallet status from Crossmint */
  walletStatus: string
  /** The raw wallet object for direct access */
  wallet: unknown
  /** Create a TransactionSigner for SDK operations */
  createSigner: () => TransactionSigner | null
  /** Send tokens using Crossmint's wallet.send() method */
  sendTokens: (recipient: string, token: string, amount: string) => Promise<{ explorerLink?: string }>
}

/**
 * Hook to create a Crossmint-compatible signer for the GhostSpeak SDK
 *
 * This bridges between Crossmint's wallet API and the SDK's TransactionSigner interface.
 * 
 * Crossmint wallets use a different API than traditional Solana wallets:
 * - wallet.send(recipient, token, amount) for token transfers
 * - wallet.sendTransaction({ transaction }) for custom transactions
 *
 * Usage:
 * ```tsx
 * const { sendTokens, isConnected, address } = useCrossmintSigner()
 *
 * if (isConnected) {
 *   const result = await sendTokens('recipient', 'usdc', '10.0')
 *   console.log(result.explorerLink)
 * }
 * ```
 */
export function useCrossmintSigner(): CrossmintSignerResult {
  const { wallet, status: walletStatus } = useWallet()
  const { status: authStatus } = useAuth()

  const address = wallet?.address as Address | null
  const isWalletLoaded = walletStatus === 'loaded'
  const isConnected = isWalletLoaded && Boolean(wallet?.address)
  const isAuthenticated = authStatus === 'logged-in'
  const isAuthLoading = authStatus === 'initializing'
  const isWalletLoading = walletStatus === 'in-progress'
  const isLoading = isAuthLoading || isWalletLoading

  /**
   * Send tokens using Crossmint's built-in wallet.send() method
   * This is the recommended way to transfer tokens with Crossmint wallets
   */
  const sendTokens = useCallback(
    async (recipient: string, token: string, amount: string): Promise<{ explorerLink?: string }> => {
      if (!wallet) {
        throw new Error('Wallet not connected')
      }

      if (walletStatus !== 'loaded') {
        throw new Error('Wallet not fully loaded')
      }

      // Crossmint wallets have a send() method for token transfers
      // wallet.send(recipient, token, amount) -> { explorerLink }
      if ('send' in wallet && typeof wallet.send === 'function') {
        const result = await wallet.send(recipient, token, amount)
        return result as { explorerLink?: string }
      }

      throw new Error('Wallet does not support send() method')
    },
    [wallet, walletStatus]
  )

  /**
   * Create a TransactionSigner compatible with the GhostSpeak SDK
   * Note: For Crossmint embedded wallets, transactions are handled differently
   */
  const createSigner = useCallback((): TransactionSigner | null => {
    if (!address || !wallet || walletStatus !== 'loaded') {
      return null
    }

    // Create a signer that works with the SDK
    // For Crossmint wallets, we need to use their API for actual signing
    return {
      address,
      signTransactions: async (txs: readonly unknown[]) => {
        // For now, return transactions as-is
        // Actual signing should go through Crossmint's API
        console.warn('SignTransactions called - Crossmint wallets require API-based signing')
        return txs as unknown[]
      },
    } as unknown as TransactionSigner
  }, [address, wallet, walletStatus])

  return {
    address,
    isConnected,
    isAuthenticated,
    isLoading,
    walletStatus: walletStatus ?? 'not-loaded',
    wallet,
    createSigner,
    sendTokens,
  }
}

/**
 * Utility to check if we should use server-side signing
 * For Crossmint embedded wallets, transactions should be signed server-side
 */
export function shouldUseServerSigning(): boolean {
  // Crossmint embedded wallets use server-side signing via API routes
  return true
}
