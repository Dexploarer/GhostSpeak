'use client'

import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Bot,
  ChevronLeft,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { createVerificationMessage } from '@/lib/solana/signature-verification'
import bs58 from 'bs58'

export default function RegisterAgentPage() {
  const { publicKey, signMessage } = useWallet()
  const router = useRouter()
  const { toast } = useToast()

  const [address, setAddress] = useState('')
  const [_isSearching, _setIsSearching] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  // Redirect if not connected
  useEffect(() => {
    if (!publicKey) {
      router.push('/')
    }
  }, [publicKey, router])

  // Search for agent status
  const discoveredAgent = useQuery(
    api.ghostDiscovery.getDiscoveredAgent,
    address.length >= 32 ? { ghostAddress: address } : 'skip'
  )

  const handleRegister = async () => {
    if (!address || !publicKey) return

    setIsRegistering(true)
    try {
      // Step 1: Create verification message
      const message = createVerificationMessage('claim_agent', address)

      // Step 2: Request wallet signature
      toast({
        title: 'Signature Required',
        description: 'Please sign the message in your wallet to prove ownership...',
      })

      const messageString = JSON.stringify(message)
      const messageBytes = new TextEncoder().encode(messageString)

      const signatureBytes = await signMessage(messageBytes)
      const signature = bs58.encode(signatureBytes)

      // Step 3: Submit claim with signature
      const response = await fetch('/api/v1/agent/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentAddress: address,
          signature,
          message,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to claim agent')
      }

      toast({
        title: 'Agent Claimed Successfully! 🎉',
        description: `${address.slice(0, 8)}... is now registered on ${result.agent.registrationNetwork}`,
      })

      // Show credential info if issued
      if (result.credentialIssued && result.credentialId) {
        toast({
          title: 'Credential Issued',
          description: `Your agent identity credential (${result.credentialId.slice(0, 12)}...) is ready!`,
        })
      }

      router.push('/dashboard')
    } catch (error: unknown) {
      console.error('Registration failed:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Could not register agent. Please try again.'
      toast({
        title: 'Registration Failed',
        description: errorMessage,
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
          <div className="mt-3 flex items-center gap-2 text-sm text-white/40">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Secured with wallet signature verification</span>
          </div>
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
                  Signing & Claiming...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Sign & Claim Agent
                </>
              )}
            </button>
            <p className="text-xs text-center text-white/40 mt-2">
              Free claiming via wallet signature • No payment required
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
