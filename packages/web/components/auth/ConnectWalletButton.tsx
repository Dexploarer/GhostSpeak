'use client'

import React, { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Wallet, ChevronDown, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import bs58 from 'bs58'
import { useRouter } from 'next/navigation'

interface ConnectWalletButtonProps {
  className?: string
  variant?: 'default' | 'ghost' | 'gradient'
}

export function ConnectWalletButton({ className, variant = 'gradient' }: ConnectWalletButtonProps) {
  const { publicKey, disconnect, connecting, signMessage } = useWallet()
  const { setVisible } = useWalletModal()
  const router = useRouter()
  const [showDropdown, setShowDropdown] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionData, setSessionData] = useState<{
    userId: string
    sessionToken: string
    walletAddress: string
  } | null>(null)

  const signInWithSolana = useMutation(api.solanaAuth.signInWithSolana)

  // Trigger authentication when wallet connects
  useEffect(() => {
    const authenticate = async () => {
      if (publicKey && signMessage && !isAuthenticated && !isAuthenticating) {
        setIsAuthenticating(true)
        try {
          // Create sign-in message
          const message = `Sign this message to authenticate with GhostSpeak.\n\nWallet: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`
          const messageBytes = new TextEncoder().encode(message)

          // Request signature from wallet
          const signature = await signMessage(messageBytes)

          // Send to Convex for verification
          const result = await signInWithSolana({
            publicKey: publicKey.toBase58(),
            signature: bs58.encode(signature),
            message,
          })

          if (result.success) {
            setIsAuthenticated(true)
            setSessionData({
              userId: result.userId,
              sessionToken: result.sessionToken,
              walletAddress: result.walletAddress,
            })
            console.log('Successfully authenticated with Convex!', {
              userId: result.userId,
              walletAddress: result.walletAddress,
            })

            // Redirect to dashboard after successful authentication
            router.push('/dashboard')
          }
        } catch (error) {
          console.error('Authentication failed:', error)
          // If user rejects signature, disconnect wallet
          disconnect()
        } finally {
          setIsAuthenticating(false)
        }
      }
    }

    authenticate()
  }, [publicKey, signMessage, isAuthenticated, isAuthenticating, signInWithSolana, disconnect])

  // Reset auth state when wallet disconnects
  useEffect(() => {
    if (!publicKey) {
      setIsAuthenticated(false)
      setSessionData(null)
    }
  }, [publicKey])

  const handleClick = () => {
    if (publicKey) {
      setShowDropdown(!showDropdown)
    } else {
      setVisible(true)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setShowDropdown(false)
    setIsAuthenticated(false)
    setSessionData(null)
  }

  // Format wallet address
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const buttonVariants = {
    default: 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100',
    ghost: 'bg-transparent hover:bg-white/10 dark:hover:bg-white/5 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800',
    gradient: 'bg-gradient-to-r from-lime-500 to-lime-400 text-gray-900 font-semibold hover:from-lime-400 hover:to-lime-300 shadow-lg shadow-lime-500/20',
  }

  return (
    <div className="relative">
      <motion.button
        onClick={handleClick}
        disabled={connecting || isAuthenticating}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200',
          buttonVariants[variant],
          (connecting || isAuthenticating) && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <Wallet className="w-4 h-4" />
        <span className="text-sm font-medium">
          {connecting ? 'Connecting...' : isAuthenticating ? 'Sign to authenticate...' : publicKey ? formatAddress(publicKey.toBase58()) : 'Connect Wallet'}
        </span>
        {publicKey && !isAuthenticating && <ChevronDown className="w-4 h-4" />}
      </motion.button>

      {/* Dropdown menu for connected wallet */}
      <AnimatePresence>
        {showDropdown && publicKey && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden z-50"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Connected Wallet</div>
                <div className="font-mono text-sm text-gray-900 dark:text-white break-all">
                  {publicKey.toBase58()}
                </div>
              </div>

              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect Wallet</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
