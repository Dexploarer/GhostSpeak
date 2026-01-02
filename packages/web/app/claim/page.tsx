'use client'

import React, { useState } from 'react'
import { useWallet } from '@crossmint/client-sdk-react-ui'
import { useGhostSpeak } from '@/lib/hooks/useGhostSpeak'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Ghost, Shield, Sparkles, Check, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { address, type Address } from '@solana/addresses'

type ClaimStep = 'form' | 'validating' | 'claiming' | 'success' | 'error'
type Network = 'devnet' | 'testnet' | 'mainnet-beta'

export default function ClaimPage() {
  const { wallet } = useWallet()
  const { client, isConnected } = useGhostSpeak()

  const [step, setStep] = useState<ClaimStep>('form')
  const [error, setError] = useState<string | null>(null)
  const [txSignature, setTxSignature] = useState<string | null>(null)

  // Form state
  const [agentAddress, setAgentAddress] = useState('')
  const [x402Address, setX402Address] = useState('')
  const [sasCredential, setSasCredential] = useState('')
  const [sasSchema, setSasSchema] = useState('')
  const [network, setNetwork] = useState<Network>('devnet')
  const [ipfsUri, setIpfsUri] = useState('')
  const [githubUsername, setGithubUsername] = useState('')
  const [twitterHandle, setTwitterHandle] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected || !client || !wallet?.signer) {
      toast.error('Please connect your wallet first')
      return
    }

    try {
      setStep('validating')
      setError(null)

      // Validate inputs
      if (!agentAddress || !x402Address || !sasCredential || !sasSchema) {
        throw new Error('Please fill in all required fields')
      }

      // Validate claim parameters
      const validation = await client.ghosts.validateClaim({
        agentAddress: address(agentAddress),
        x402PaymentAddress: address(x402Address),
        sasCredential: address(sasCredential),
        sasSchema: address(sasSchema),
        network,
        ipfsMetadataUri: ipfsUri || undefined,
        githubUsername: githubUsername || undefined,
        twitterHandle: twitterHandle || undefined,
      })

      if (!validation.valid) {
        throw new Error(validation.errors.join(', '))
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach(w => toast.warning(w))
      }

      setStep('claiming')

      // Execute claim
      // @ts-ignore - Crossmint wallet signer type compatibility
      const signature = await client.ghosts.claim(wallet.signer as any, {
        agentAddress: address(agentAddress),
        x402PaymentAddress: address(x402Address),
        sasCredential: address(sasCredential),
        sasSchema: address(sasSchema),
        network,
        ipfsMetadataUri: ipfsUri || undefined,
        githubUsername: githubUsername || undefined,
        twitterHandle: twitterHandle || undefined,
      })

      setTxSignature(signature)
      setStep('success')
      toast.success('Ghost claimed successfully!')
    } catch (err: any) {
      console.error('Claim error:', err)
      setError(err?.message || 'Failed to claim Ghost')
      setStep('error')
      toast.error(err?.message || 'Failed to claim Ghost')
    }
  }

  const resetForm = () => {
    setStep('form')
    setError(null)
    setTxSignature(null)
    setAgentAddress('')
    setX402Address('')
    setSasCredential('')
    setSasSchema('')
    setIpfsUri('')
    setGithubUsername('')
    setTwitterHandle('')
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <Ghost className="w-5 h-5 text-primary" />
          <span className="text-sm font-mono text-primary uppercase tracking-wider">
            Ghost Claim Protocol
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          Claim Your Ghost Agent
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Prove ownership of your external AI agent using{' '}
          <span className="text-primary font-medium">Solana Attestation Service (SAS)</span> and claim it
          on-chain.
        </p>
      </div>

      {/* Process Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4 mb-8">
          <StepIndicator
            number={1}
            label="Fill Details"
            active={step === 'form'}
            completed={['validating', 'claiming', 'success'].includes(step)}
          />
          <div className="w-16 h-0.5 bg-border" />
          <StepIndicator
            number={2}
            label="Validate"
            active={step === 'validating'}
            completed={['claiming', 'success'].includes(step)}
          />
          <div className="w-16 h-0.5 bg-border" />
          <StepIndicator
            number={3}
            label="Claim"
            active={step === 'claiming'}
            completed={step === 'success'}
          />
        </div>
      </div>

      {/* Main Content */}
      {step === 'form' && (
        <GlassCard className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Agent Address */}
              <div className="space-y-2">
                <Label htmlFor="agentAddress" className="flex items-center gap-2">
                  Agent Address
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="agentAddress"
                  placeholder="e.g., CJC1nZDLRJPYEJiHN..."
                  value={agentAddress}
                  onChange={(e) => setAgentAddress(e.target.value)}
                  required
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  The on-chain address of your registered agent
                </p>
              </div>

              {/* x402 Payment Address */}
              <div className="space-y-2">
                <Label htmlFor="x402Address" className="flex items-center gap-2">
                  x402 Payment Address
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="x402Address"
                  placeholder="e.g., H6ARHf6YXhGYeQfU..."
                  value={x402Address}
                  onChange={(e) => setX402Address(e.target.value)}
                  required
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Your agent's payment address on x402 facilitator
                </p>
              </div>

              {/* SAS Credential */}
              <div className="space-y-2">
                <Label htmlFor="sasCredential" className="flex items-center gap-2">
                  SAS Credential
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sasCredential"
                  placeholder="e.g., 5xc6rLR47kmMcvVk..."
                  value={sasCredential}
                  onChange={(e) => setSasCredential(e.target.value)}
                  required
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  SAS credential address (issuer)
                </p>
              </div>

              {/* SAS Schema */}
              <div className="space-y-2">
                <Label htmlFor="sasSchema" className="flex items-center gap-2">
                  SAS Schema
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sasSchema"
                  placeholder="e.g., 9zN9ULFDZp4NbqP5..."
                  value={sasSchema}
                  onChange={(e) => setSasSchema(e.target.value)}
                  required
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  SAS schema defining attestation structure
                </p>
              </div>

              {/* Network */}
              <div className="space-y-2">
                <Label htmlFor="network" className="flex items-center gap-2">
                  Network
                  <span className="text-destructive">*</span>
                </Label>
                <Select value={network} onValueChange={(v) => setNetwork(v as Network)}>
                  <SelectTrigger id="network">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="devnet">Devnet</SelectItem>
                    <SelectItem value="testnet">Testnet</SelectItem>
                    <SelectItem value="mainnet-beta">Mainnet Beta</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Solana network for DID generation
                </p>
              </div>

              {/* IPFS Metadata URI */}
              <div className="space-y-2">
                <Label htmlFor="ipfsUri">IPFS Metadata URI (Optional)</Label>
                <Input
                  id="ipfsUri"
                  placeholder="ipfs://QmHash..."
                  value={ipfsUri}
                  onChange={(e) => setIpfsUri(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Optional metadata stored on IPFS
                </p>
              </div>
            </div>

            {/* Social Proof (Optional) */}
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Social Proof (Optional)
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="github">GitHub Username</Label>
                  <Input
                    id="github"
                    placeholder="e.g., octocat"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter Handle</Label>
                  <Input
                    id="twitter"
                    placeholder="e.g., @username"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-6 border-t border-border">
              {!isConnected ? (
                <Button type="button" size="lg" disabled>
                  <Shield className="w-4 h-4 mr-2" />
                  Connect Wallet First
                </Button>
              ) : (
                <Button type="submit" size="lg">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Claim Ghost
                </Button>
              )}
            </div>
          </form>
        </GlassCard>
      )}

      {/* Validating State */}
      {step === 'validating' && (
        <GlassCard className="p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Validating Claim...</h3>
          <p className="text-muted-foreground max-w-md">
            Checking agent status, attestation validity, and PDA derivation
          </p>
        </GlassCard>
      )}

      {/* Claiming State */}
      {step === 'claiming' && (
        <GlassCard className="p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Claiming Ghost...</h3>
          <p className="text-muted-foreground max-w-md mb-4">
            Please approve the transaction in your wallet
          </p>
          <Badge variant="outline" className="font-mono text-xs">
            Network: {network}
          </Badge>
        </GlassCard>
      )}

      {/* Success State */}
      {step === 'success' && (
        <GlassCard className="p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Ghost Claimed Successfully!</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            Your Ghost agent is now claimed on-chain with a verifiable DID document
          </p>
          {txSignature && (
            <a
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=${network}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-8"
            >
              <span className="font-mono text-sm">View Transaction</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <div className="flex gap-3">
            <Button onClick={resetForm} variant="outline">
              Claim Another Ghost
            </Button>
            <Button asChild>
              <a href="/dashboard/agents">View My Agents</a>
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Error State */}
      {step === 'error' && (
        <GlassCard className="p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Claim Failed</h3>
          <p className="text-destructive max-w-md mb-8">{error}</p>
          <Button onClick={() => setStep('form')} variant="outline">
            Try Again
          </Button>
        </GlassCard>
      )}

      {/* Info Card */}
      {step === 'form' && (
        <GlassCard className="mt-8 p-6 border-primary/20 bg-primary/5">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">About Ghost Claims</h4>
              <p className="text-sm text-muted-foreground">
                Ghost claiming allows you to prove ownership of external AI agents (registered on x402
                facilitators like PayAI) using the Solana Attestation Service. Once claimed, your agent gets
                a verifiable DID document and can participate in the GhostSpeak reputation system.
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  )
}

// Step Indicator Component
function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number
  label: string
  active: boolean
  completed: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
          completed
            ? 'bg-green-500 text-white'
            : active
              ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {completed ? <Check className="w-5 h-5" /> : number}
      </div>
      <span className={`text-xs font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  )
}
