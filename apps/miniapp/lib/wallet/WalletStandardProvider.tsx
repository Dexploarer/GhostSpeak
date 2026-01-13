'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { getWallets, type Wallet, type WalletAccount } from '@wallet-standard/core'
import {
  type StandardConnectFeature,
  type StandardDisconnectFeature,
} from '@wallet-standard/features'
import {
  SolanaSignAndSendTransaction,
  SolanaSignMessage,
  SolanaSignTransaction,
  type SolanaSignAndSendTransactionFeature,
  type SolanaSignMessageFeature,
  type SolanaSignTransactionFeature,
} from '@solana/wallet-standard-features'
import { address, type Address } from '@solana/addresses'
import { createSolanaRpc, type Rpc, type SolanaRpcApi } from '@solana/rpc'
import { getSolanaNetwork, type SolanaNetwork } from '@/lib/solana/explorer'
import { config } from '@/lib/config'
import { isDevelopment } from '@/lib/env'

// Wallet Standard Context Types
interface WalletStandardContextValue {
  // Wallet state
  wallet: Wallet | null
  account: WalletAccount | null
  publicKey: Address | null
  connected: boolean
  connecting: boolean

  // Wallet actions
  connect: (walletName?: string) => Promise<void>
  disconnect: () => Promise<void>
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
  signTransaction: (transaction: Uint8Array) => Promise<Uint8Array>
  signAndSendTransaction: (transaction: Uint8Array) => Promise<string>

  // Available wallets
  wallets: Wallet[]

  // RPC
  rpc: Rpc<SolanaRpcApi>

  // Network
  network: SolanaNetwork
}

const WalletStandardContext = createContext<WalletStandardContextValue | null>(null)

interface WalletStandardProviderProps {
  children: React.ReactNode
  /**
   * Solana RPC endpoint URL
   * @default config.solana.rpcUrl
   */
  endpoint?: string

  /**
   * Auto-connect to previously connected wallet on mount
   * @default true
   */
  autoConnect?: boolean
}

export function WalletStandardProvider({
  children,
  endpoint,
  autoConnect = true,
}: WalletStandardProviderProps) {
  // State
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [account, setAccount] = useState<WalletAccount | null>(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [availableWallets, setAvailableWallets] = useState<Wallet[]>([])

  // Create RPC client
  const rpc = useMemo(() => {
    const rpcUrl = endpoint || config.solana.rpcUrl
    return createSolanaRpc(rpcUrl)
  }, [endpoint])

  // Get network
  const network = useMemo(() => getSolanaNetwork(), [])

  // Derived state
  const publicKey = useMemo(() => {
    if (!account) return null
    try {
      return address(account.address)
    } catch {
      return null
    }
  }, [account])

  // Discover available wallets
  useEffect(() => {
    const walletsApi = getWallets()

    // Helper to check if wallet supports Solana features
    // w.features is an object with feature names as keys, not an array
    const isSolanaWallet = (w: Wallet) =>
      SolanaSignAndSendTransaction in w.features || SolanaSignTransaction in w.features

    // Get current wallets
    const currentWallets = walletsApi.get()
    const solanaWallets = currentWallets.filter(isSolanaWallet)
    setAvailableWallets(solanaWallets)

    // Listen for new wallets
    const unsubscribeRegister = walletsApi.on('register', () => {
      const wallets = walletsApi.get()
      const solanaWallets = wallets.filter(isSolanaWallet)
      setAvailableWallets(solanaWallets)
    })

    // Listen for wallet removals/unregister events
    const unsubscribeUnregister = walletsApi.on('unregister', () => {
      const wallets = walletsApi.get()
      const solanaWallets = wallets.filter(isSolanaWallet)
      setAvailableWallets(solanaWallets)
    })

    return () => {
      unsubscribeRegister()
      unsubscribeUnregister()
    }
  }, [])

  // Connect to wallet
  const connect = useCallback(
    async (walletName?: string) => {
      setConnecting(true)
      try {
        // Find wallet by name or use first available
        const targetWallet = walletName
          ? availableWallets.find((w) => w.name === walletName)
          : availableWallets[0]

        if (!targetWallet) {
          throw new Error(
            'No Solana wallets detected. Please install Phantom, Solflare, or Backpack.'
          )
        }

        // Request connection
        const connectFeature = targetWallet.features['standard:connect'] as
          | StandardConnectFeature['standard:connect']
          | undefined
        if (!connectFeature) {
          throw new Error(`Wallet ${targetWallet.name} does not support connection`)
        }

        const result = await connectFeature.connect()

        if (result.accounts && result.accounts.length > 0) {
          setWallet(targetWallet)
          setAccount(result.accounts[0])
          setConnected(true)

          // Save to localStorage for auto-connect
          localStorage.setItem('walletName', targetWallet.name)

          // NOTE: User creation/authentication is handled by ConnectWalletButton component
          // via SIWS (Sign-In With Solana) flow - do not duplicate here
          if (isDevelopment) {
            console.log(`[Dev] [WalletProvider] Wallet connected: ${result.accounts[0].address}`)
          }
        } else {
          throw new Error('No accounts returned from wallet')
        }
      } catch (error) {
        if (isDevelopment) {
          console.error('[Dev] Failed to connect wallet:', error)
        }
        throw error
      } finally {
        setConnecting(false)
      }
    },
    [availableWallets]
  )

  // Auto-connect on mount
  useEffect(() => {
    if (!autoConnect) return
    if (connected || connecting) return // Skip if already connected/connecting

    const lastConnectedWallet = localStorage.getItem('walletName')
    if (lastConnectedWallet && availableWallets.length > 0 && !connected) {
      const wallet = availableWallets.find((w) => w.name === lastConnectedWallet)
      if (wallet) {
        if (isDevelopment) {
          console.log(`[Dev] [WalletProvider] Auto-connecting to ${lastConnectedWallet}...`)
        }
        connect(lastConnectedWallet).catch((error) => {
          if (isDevelopment) {
            console.error('[Dev] [WalletProvider] Auto-connect failed:', error)
          }
          // Clear saved wallet if auto-connect fails
          localStorage.removeItem('walletName')
        })
      }
    }
    // Only depend on primitives and stable refs to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, availableWallets.length, connected, connecting])

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    if (!wallet) return

    try {
      const disconnectFeature = wallet.features['standard:disconnect'] as
        | StandardDisconnectFeature['standard:disconnect']
        | undefined
      if (disconnectFeature) {
        await disconnectFeature.disconnect()
      }
    } catch (error) {
      if (isDevelopment) {
        console.error('[Dev] Failed to disconnect:', error)
      }
    } finally {
      setWallet(null)
      setAccount(null)
      setConnected(false)
      localStorage.removeItem('walletName')
    }
  }, [wallet])

  // Sign message
  const signMessage = useCallback(
    async (message: Uint8Array): Promise<Uint8Array> => {
      if (!wallet || !account) {
        throw new Error('Wallet not connected')
      }

      const signMessageFeature = wallet.features[SolanaSignMessage] as
        | SolanaSignMessageFeature[typeof SolanaSignMessage]
        | undefined
      if (!signMessageFeature) {
        throw new Error('Wallet does not support message signing')
      }

      // Wallet Standard signMessage returns an array of outputs
      const results = await signMessageFeature.signMessage({
        account,
        message,
      })

      // Handle both array result (spec) and single result (some implementations)
      const result = Array.isArray(results) ? results[0] : results
      if (!result || !result.signature) {
        throw new Error('Failed to get signature from wallet')
      }

      return result.signature
    },
    [wallet, account]
  )

  // Sign transaction
  const signTransaction = useCallback(
    async (transaction: Uint8Array): Promise<Uint8Array> => {
      if (!wallet || !account) {
        throw new Error('Wallet not connected')
      }

      const signTransactionFeature = wallet.features[SolanaSignTransaction] as
        | SolanaSignTransactionFeature[typeof SolanaSignTransaction]
        | undefined
      if (!signTransactionFeature) {
        throw new Error('Wallet does not support transaction signing')
      }

      // Wallet Standard returns an array of outputs
      const results = await signTransactionFeature.signTransaction({
        account,
        transaction,
        chain: 'solana:mainnet', // or 'solana:devnet' based on your needs
      })

      // Handle both array result (spec) and single result (some implementations)
      const result = Array.isArray(results) ? results[0] : results
      if (!result || !result.signedTransaction) {
        throw new Error('Failed to get signed transaction from wallet')
      }

      return result.signedTransaction
    },
    [wallet, account]
  )

  // Sign and send transaction
  const signAndSendTransaction = useCallback(
    async (transaction: Uint8Array): Promise<string> => {
      if (!wallet || !account) {
        throw new Error('Wallet not connected')
      }

      const signAndSendFeature = wallet.features[SolanaSignAndSendTransaction] as
        | SolanaSignAndSendTransactionFeature[typeof SolanaSignAndSendTransaction]
        | undefined
      if (!signAndSendFeature) {
        throw new Error('Wallet does not support sign and send')
      }

      // Wallet Standard returns an array of outputs
      const results = await signAndSendFeature.signAndSendTransaction({
        account,
        transaction,
        chain: 'solana:mainnet', // or 'solana:devnet' based on your needs
      })

      // Handle both array result (spec) and single result (some implementations)
      const result = Array.isArray(results) ? results[0] : results
      if (!result || !result.signature) {
        throw new Error('Failed to get transaction signature from wallet')
      }

      return result.signature
    },
    [wallet, account]
  )

  const value: WalletStandardContextValue = {
    wallet,
    account,
    publicKey,
    connected,
    connecting,
    connect,
    disconnect,
    signMessage,
    signTransaction,
    signAndSendTransaction,
    wallets: availableWallets,
    rpc,
    network,
  }

  return <WalletStandardContext.Provider value={value}>{children}</WalletStandardContext.Provider>
}

// Hook to use wallet context
export function useWallet() {
  const context = useContext(WalletStandardContext)
  if (!context) {
    throw new Error('useWallet must be used within WalletStandardProvider')
  }
  return context
}

// Hook for RPC access
export function useConnection() {
  const context = useContext(WalletStandardContext)
  if (!context) {
    throw new Error('useConnection must be used within WalletStandardProvider')
  }
  return { rpc: context.rpc }
}
