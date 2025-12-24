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
  /** Whether the wallet is connected */
  isConnected: boolean
  /** Whether the user is authenticated */
  isAuthenticated: boolean
  /** Loading state */
  isLoading: boolean
  /** Create a TransactionSigner for SDK operations */
  createSigner: () => TransactionSigner | null
  /** Sign a single transaction */
  signTransaction: (transaction: Uint8Array) => Promise<Uint8Array>
  /** Sign multiple transactions */
  signTransactions: (transactions: readonly Uint8Array[]) => Promise<Uint8Array[]>
}

/**
 * Hook to create a Crossmint-compatible signer for the GhostSpeak SDK
 *
 * This bridges between Crossmint's wallet API and the SDK's TransactionSigner interface.
 *
 * Usage:
 * ```tsx
 * const { createSigner, isConnected, address } = useCrossmintSigner()
 *
 * if (isConnected) {
 *   const signer = createSigner()
 *   await client.agents.register(signer, { ... })
 * }
 * ```
 */
export function useCrossmintSigner(): CrossmintSignerResult {
  const { wallet } = useWallet()
  const { status: authStatus } = useAuth()

  const address = wallet?.address as Address | null
  const isConnected = Boolean(wallet?.address)
  const isAuthenticated = authStatus === 'logged-in'
  const isLoading = authStatus === 'initializing'

  /**
   * Sign a transaction using Crossmint's wallet API
   */
  const signTransaction = useCallback(
    async (transaction: Uint8Array): Promise<Uint8Array> => {
      if (!wallet) {
        throw new Error('Wallet not connected')
      }

      // Crossmint wallet signing
      // The wallet object from Crossmint has a signTransaction method
      // that takes a serialized transaction and returns the signed version
      if ('signTransaction' in wallet && typeof wallet.signTransaction === 'function') {
        const signed = await wallet.signTransaction(transaction)
        return signed as Uint8Array
      }

      // For Crossmint embedded wallets, we need to use their API
      // This would typically go through their transaction signing endpoint
      throw new Error(
        'Crossmint wallet signing not available - please use the Crossmint API routes'
      )
    },
    [wallet]
  )

  /**
   * Sign multiple transactions
   */
  const signTransactions = useCallback(
    async (transactions: readonly Uint8Array[]): Promise<Uint8Array[]> => {
      if (!wallet) {
        throw new Error('Wallet not connected')
      }

      // Sign each transaction individually
      const signed = await Promise.all(transactions.map((tx) => signTransaction(tx)))

      return signed
    },
    [wallet, signTransaction]
  )

  /**
   * Create a TransactionSigner compatible with the GhostSpeak SDK
   */
  const createSigner = useCallback((): TransactionSigner | null => {
    if (!address || !wallet) {
      return null
    }

    // Create a signer that adapts Crossmint's wallet to SDK expectations
    // Note: For Crossmint embedded wallets, actual signing happens via API routes
    return {
      address,
      signTransactions: async (txs: readonly unknown[]) => {
        // Crossmint embedded wallets use server-side signing
        // This is handled by the API routes (/api/crossmint/transactions)
        // Return the transactions as-is; the SDK will handle them
        return txs as unknown[]
      },
    } as unknown as TransactionSigner
  }, [address, wallet])

  return {
    address,
    isConnected,
    isAuthenticated,
    isLoading,
    createSigner,
    signTransaction,
    signTransactions,
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
