'use client'

import React, { useEffect, useState } from 'react'
import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { WalletModal, useWalletModal } from '@/lib/wallet/WalletModal'
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
  const { publicKey, disconnect, connecting, signMessage, connected } = useWallet()
  const { visible, setVisible } = useWalletModal()
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

  // Load existing session on mount and restore authentication state
  useEffect(() => {
    if (publicKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem('ghostspeak_auth')
      if (stored) {
        try {
          const authData = JSON.parse(stored)
          if (authData.walletAddress === publicKey && authData.sessionToken) {
            // Session exists for this wallet - restore it
            setIsAuthenticated(true)
            setSessionData(authData)
            console.log('✅ Restored session from localStorage')
            return
          }
        } catch (e) {
          console.error('Failed to restore session:', e)
          localStorage.removeItem('ghostspeak_auth')
        }
      }
    }
  }, [publicKey])

  // Trigger authentication ONLY when wallet connects AND no session exists
  useEffect(() => {
    const authenticate = async () => {
      // Only authenticate if wallet connected, can sign, NOT authenticated, and NOT already authenticating
      if (publicKey && connected && signMessage && !isAuthenticated && !isAuthenticating) {
        setIsAuthenticating(true)
        try {
          console.log('🔐 Starting authentication for', publicKey)

          // Create sign-in message
          const message = `Sign this message to authenticate with GhostSpeak.\n\nWallet: ${publicKey}\nTimestamp: ${Date.now()}`
          const messageBytes = new TextEncoder().encode(message)

          // Request signature from wallet
          const signature = await signMessage(messageBytes)

          // Send to Convex for verification
          const result = await signInWithSolana({
            publicKey,
            signature: bs58.encode(signature),
            message,
          })

          if (result.success) {
            const session = {
              userId: result.userId,
              sessionToken: result.sessionToken,
              walletAddress: result.walletAddress,
            }
            setIsAuthenticated(true)
            setSessionData(session)

            // Store in localStorage for persistence
            if (typeof window !== 'undefined') {
              localStorage.setItem('ghostspeak_auth', JSON.stringify(session))
            }

            console.log('✅ Successfully authenticated!', {
              userId: result.userId,
              walletAddress: result.walletAddress,
            })

            // Only redirect to dashboard if on home page or connect page
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
            if (currentPath === '/' || currentPath === '/connect') {
              router.push('/dashboard')
            }
          }
        } catch (error: any) {
          console.error('❌ Authentication failed:', error)

          // Only disconnect if user explicitly rejected signature
          if (error?.message?.includes('User rejected') ||
              error?.message?.includes('rejected the request')) {
            console.log('User rejected signature, disconnecting wallet')
            await disconnect()
          }
        } finally {
          setIsAuthenticating(false)
        }
      }
    }

    authenticate()
  }, [publicKey, connected, signMessage, isAuthenticated, isAuthenticating, signInWithSolana, disconnect, router])

  // Reset auth state when wallet disconnects
  useEffect(() => {
    if (!publicKey || !connected) {
      setIsAuthenticated(false)
      setSessionData(null)
      // Clear stored session when wallet disconnects
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ghostspeak_auth')
      }
    }
  }, [publicKey, connected])

  const handleClick = () => {
    if (publicKey && connected) {
      setShowDropdown(!showDropdown)
    } else {
      setVisible(true)
    }
  }

  const handleDisconnect = async () => {
    await disconnect()
    setShowDropdown(false)
    setIsAuthenticated(false)
    setSessionData(null)
    // Clear stored session
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ghostspeak_auth')
    }
    console.log('🔌 Wallet disconnected and session cleared')
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
    <>
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
            {connecting
              ? 'Connecting...'
              : isAuthenticating
              ? 'Sign to authenticate...'
              : publicKey && connected
              ? formatAddress(publicKey)
              : 'Connect Wallet'}
          </span>
          {publicKey && connected && !isAuthenticating && <ChevronDown className="w-4 h-4" />}
        </motion.button>

        {/* Dropdown menu for connected wallet */}
        <AnimatePresence>
          {showDropdown && publicKey && connected && (
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
                    {publicKey}
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

      {/* Wallet Selection Modal */}
      <WalletModal open={visible} onOpenChange={setVisible} />
    </>
  )
}
