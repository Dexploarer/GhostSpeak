'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { getWallets, type Wallet, type WalletAccount } from '@wallet-standard/core'
import {
  SolanaSignAndSendTransaction,
  SolanaSignMessage,
  SolanaSignTransaction
} from '@solana/wallet-standard-features'
import { address, type Address } from '@solana/addresses'
import { createSolanaRpc, type Rpc } from '@solana/rpc'

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
  rpc: Rpc
}

const WalletStandardContext = createContext<WalletStandardContextValue | null>(null)

interface WalletStandardProviderProps {
  children: React.ReactNode
  /**
   * Solana RPC endpoint URL
   * @default process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
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
  autoConnect = true
}: WalletStandardProviderProps) {
  // State
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [account, setAccount] = useState<WalletAccount | null>(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [availableWallets, setAvailableWallets] = useState<Wallet[]>([])

  // Create RPC client
  const rpc = useMemo(() => {
    const rpcUrl = endpoint || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    return createSolanaRpc(rpcUrl)
  }, [endpoint])

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

    // Get current wallets
    const currentWallets = walletsApi.get()
    const solanaWallets = currentWallets.filter(w =>
      w.features.includes(SolanaSignAndSendTransaction) ||
      w.features.includes(SolanaSignTransaction)
    )
    setAvailableWallets(solanaWallets)

    // Listen for new wallets
    const unsubscribe = walletsApi.on('register', () => {
      const wallets = walletsApi.get()
      const solanaWallets = wallets.filter(w =>
        w.features.includes(SolanaSignAndSendTransaction) ||
        w.features.includes(SolanaSignTransaction)
      )
      setAvailableWallets(solanaWallets)
    })

    return () => unsubscribe()
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    if (!autoConnect) return

    const lastConnectedWallet = localStorage.getItem('walletName')
    if (lastConnectedWallet && availableWallets.length > 0) {
      const wallet = availableWallets.find(w => w.name === lastConnectedWallet)
      if (wallet) {
        connect(lastConnectedWallet).catch(console.error)
      }
    }
  }, [autoConnect, availableWallets])

  // Connect to wallet
  const connect = useCallback(async (walletName?: string) => {
    setConnecting(true)
    try {
      // Find wallet by name or use first available
      const targetWallet = walletName
        ? availableWallets.find(w => w.name === walletName)
        : availableWallets[0]

      if (!targetWallet) {
        throw new Error('No Solana wallets detected. Please install Phantom, Solflare, or Backpack.')
      }

      // Request connection
      const connectFeature = targetWallet.features['standard:connect']
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
      } else {
        throw new Error('No accounts returned from wallet')
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      throw error
    } finally {
      setConnecting(false)
    }
  }, [availableWallets])

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    if (!wallet) return

    try {
      const disconnectFeature = wallet.features['standard:disconnect']
      if (disconnectFeature) {
        await disconnectFeature.disconnect()
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
    } finally {
      setWallet(null)
      setAccount(null)
      setConnected(false)
      localStorage.removeItem('walletName')
    }
  }, [wallet])

  // Sign message
  const signMessage = useCallback(async (message: Uint8Array): Promise<Uint8Array> => {
    if (!wallet || !account) {
      throw new Error('Wallet not connected')
    }

    const signMessageFeature = wallet.features[SolanaSignMessage]
    if (!signMessageFeature) {
      throw new Error('Wallet does not support message signing')
    }

    const result = await signMessageFeature.signMessage({
      account,
      message,
    })

    return result.signature
  }, [wallet, account])

  // Sign transaction
  const signTransaction = useCallback(async (transaction: Uint8Array): Promise<Uint8Array> => {
    if (!wallet || !account) {
      throw new Error('Wallet not connected')
    }

    const signTransactionFeature = wallet.features[SolanaSignTransaction]
    if (!signTransactionFeature) {
      throw new Error('Wallet does not support transaction signing')
    }

    const result = await signTransactionFeature.signTransaction({
      account,
      transaction,
      chain: 'solana:mainnet', // or 'solana:devnet' based on your needs
    })

    return result.signedTransaction
  }, [wallet, account])

  // Sign and send transaction
  const signAndSendTransaction = useCallback(async (transaction: Uint8Array): Promise<string> => {
    if (!wallet || !account) {
      throw new Error('Wallet not connected')
    }

    const signAndSendFeature = wallet.features[SolanaSignAndSendTransaction]
    if (!signAndSendFeature) {
      throw new Error('Wallet does not support sign and send')
    }

    const result = await signAndSendFeature.signAndSendTransaction({
      account,
      transaction,
      chain: 'solana:mainnet', // or 'solana:devnet' based on your needs
    })

    return result.signature
  }, [wallet, account])

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
  }

  return (
    <WalletStandardContext.Provider value={value}>
      {children}
    </WalletStandardContext.Provider>
  )
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
