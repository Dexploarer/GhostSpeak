'use client'

import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Bot,
  ChevronLeft,
  Loader2,
  Search,
  Shield,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

export default function RegisterAgentPage() {
  const { publicKey } = useWallet()
  const router = useRouter()
  const { toast } = useToast()

  const [address, setAddress] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  // Redirect if not connected
  useEffect(() => {
    if (!publicKey) {
      router.push('/')
    }
  }, [publicKey, router])

  const claimAgent = useMutation(api.ghostDiscovery.claimAgent)

  // Search for agent status
  const discoveredAgent = useQuery(
    api.ghostDiscovery.getDiscoveredAgent,
    address.length >= 32 ? { ghostAddress: address } : 'skip'
  )

  const handleRegister = async () => {
    if (!address || !publicKey) return

    setIsRegistering(true)
    try {
      // Basic claim without tx signature for now (assuming devnet/off-chain claim allowed)
      // or if backend requires it, this will fail.
      const result = await claimAgent({
        ghostAddress: address,
        claimedBy: publicKey,
        // claimTxSignature: undefined // Optional in schema
      })

      toast({
        title: 'Agent Registered',
        description: `Successfully registered agent ${address.slice(0, 8)}...`,
      })

      router.push('/dashboard')
    } catch (error: any) {
      console.error('Registration failed:', error)
      toast({
        title: 'Registration Failed',
        description: error.message || 'Could not register agent. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsRegistering(false)
    }
  }

  if (!publicKey) return null

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-white/40 hover:text-white transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>

          <h1 className="text-3xl font-light text-white mb-2 flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary" />
            Register New Agent
          </h1>
          <p className="text-white/60">
            Claim ownership of your AI agent to start building its reputation (Ghost Score).
          </p>
        </div>

        <div className="bg-[#111111] border border-white/10 rounded-xl p-6 md:p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Agent Wallet Address (Solana)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-white/20" />
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                  placeholder="Enter your agent's SOL address..."
                />
              </div>
            </div>

            {/* Status Feedback */}
            {address.length >= 32 && (
              <div
                className={`p-4 rounded-lg border ${
                  discoveredAgent
                    ? discoveredAgent.status === 'claimed'
                      ? 'bg-red-500/10 border-red-500/20 text-red-400'
                      : 'bg-green-500/10 border-green-500/20 text-green-400'
                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                }`}
              >
                <div className="flex gap-3">
                  {discoveredAgent ? (
                    discoveredAgent.status === 'claimed' ? (
                      <AlertCircle className="w-5 h-5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                    )
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0" />
                  )}

                  <div>
                    <h3 className="font-medium mb-1">
                      {discoveredAgent
                        ? discoveredAgent.status === 'claimed'
                          ? 'Agent Already Claimed'
                          : 'Agent Discovered & Available'
                        : 'Agent Not Found'}
                    </h3>
                    <p className="text-sm opacity-90">
                      {discoveredAgent
                        ? discoveredAgent.status === 'claimed'
                          ? `This agent is already owned by ${discoveredAgent.claimedBy?.slice(0, 8)}...`
                          : 'This agent has been seen on-chain and is available to claim.'
                        : "We haven't seen this agent on-chain yet. Please ensure it has made at least one transaction."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={
                !address ||
                isRegistering ||
                discoveredAgent?.status === 'claimed' ||
                !discoveredAgent
              }
              className="w-full py-3 px-4 bg-primary text-black font-medium rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Claim Agent
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
