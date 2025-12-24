'use client'

import React, { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth, useWallet } from '@crossmint/client-sdk-react-ui'
import { motion } from 'framer-motion'
import {
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  Shield,
  Key,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

function LinkPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { wallet } = useWallet()
  const { status, login, user } = useAuth()

  const code = searchParams.get('code')
  const cliPubKey = searchParams.get('pubkey')

  const [linking, setLinking] = useState(false)
  const [success, setSuccess] = useState(false)
  const [linkDetails, setLinkDetails] = useState<{
    cliPublicKey: string
    webWalletAddress: string
    authorizedAt: number
  } | null>(null)

  const handleLink = async () => {
    if (!wallet?.address) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!code) {
      toast.error('Missing verification code')
      return
    }

    setLinking(true)
    try {
      // Call the real API endpoint to authorize the CLI as a delegated signer
      const response = await fetch('/api/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'authorize',
          code,
          webWalletAddress: wallet.address,
          userEmail: user?.email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to authorize link')
      }

      setLinkDetails(data.link)
      setSuccess(true)
      toast.success('CLI Wallet successfully linked!')
    } catch (error) {
      console.error('Link error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to link wallet')
    } finally {
      setLinking(false)
    }
  }

  // Not authenticated - show login prompt
  const isAuthenticated = status === 'logged-in'
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 border-white/10 bg-zinc-900/50 backdrop-blur-xl text-center">
          <Smartphone className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Connect Your Identity</h1>
          <p className="text-muted-foreground mb-8 text-sm">
            To link your CLI wallet, you first need to sign in with your GhostSpeak Crossmint
            account.
          </p>
          <Button
            onClick={login}
            className="w-full bg-primary text-black hover:bg-primary/90 font-bold"
          >
            Sign In with Crossmint
          </Button>

          {code && (
            <div className="mt-6 p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-muted-foreground mb-1">Verification Code</p>
              <p className="text-xl font-mono font-bold text-primary tracking-widest">{code}</p>
            </div>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full"
      >
        <Card className="p-8 border-primary/20 bg-zinc-900/50 backdrop-blur-2xl relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32" />

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <LinkIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">Link CLI Device</h1>
                <p className="text-muted-foreground text-sm">
                  Establishing protocol-level delegation
                </p>
              </div>
            </div>

            {!success ? (
              <div className="space-y-6">
                {/* Identity Cards */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <Shield className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">
                        Master Identity (Crossmint Wallet)
                      </p>
                      <p className="font-mono text-sm text-primary truncate">{wallet?.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center py-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-8 h-px bg-linear-to-r from-transparent to-primary/30" />
                      <span>delegates to</span>
                      <div className="w-8 h-px bg-linear-to-l from-transparent to-primary/30" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Key className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">CLI Public Key (Device)</p>
                      <p className="font-mono text-sm text-white truncate">
                        {cliPubKey || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Permissions Warning */}
                <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex gap-3 text-sm text-yellow-200/80">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Delegated Permissions</p>
                    <ul className="text-xs space-y-1 text-yellow-200/60">
                      <li>• Register and manage AI agents</li>
                      <li>• Create marketplace listings</li>
                      <li>• Sign transactions on your behalf</li>
                    </ul>
                  </div>
                </div>

                {/* Verification Code & Action */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between group px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
                    <span className="text-xs font-bold uppercase text-primary/60">
                      Verification Code
                    </span>
                    <span className="text-2xl font-black text-primary tracking-widest">
                      {code || '------'}
                    </span>
                  </div>

                  <Button
                    onClick={handleLink}
                    disabled={linking || !code || !cliPubKey}
                    className="h-14 bg-primary text-black hover:bg-primary/90 font-black text-lg transition-all active:scale-95"
                  >
                    {linking ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Linking Securely...
                      </>
                    ) : (
                      'Authorize CLI Device'
                    )}
                  </Button>

                  <button
                    onClick={() => router.push('/dashboard')}
                    className="text-xs text-muted-foreground hover:text-white transition-colors"
                  >
                    Cancel and return to dashboard
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <CheckCircle2 className="w-20 h-20 text-primary mx-auto mb-6" />
                </motion.div>
                <h2 className="text-3xl font-black mb-2 uppercase text-white">Identity Linked</h2>
                <p className="text-zinc-400 mb-6">Your CLI wallet is now an authorized delegate</p>

                {linkDetails && (
                  <div className="text-left p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 mb-6 text-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">CLI Key</span>
                      <span className="font-mono text-xs text-white truncate max-w-[200px]">
                        {linkDetails.cliPublicKey}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Web Wallet</span>
                      <span className="font-mono text-xs text-primary truncate max-w-[200px]">
                        {linkDetails.webWalletAddress}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Linked At</span>
                      <span className="text-xs text-white">
                        {new Date(linkDetails.authorizedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium mb-8">
                  ✓ You can now return to your terminal. The CLI has been updated.
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="w-full h-12 border-zinc-600 text-white hover:bg-zinc-800"
                >
                  Go to Dashboard
                </Button>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

export default function LinkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <LinkPageContent />
    </Suspense>
  )
}
