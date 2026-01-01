'use client'

/**
 * Devnet Tools Page
 *
 * Provides developers with tools for testing on devnet:
 * - GHOST token airdrop
 * - Network status
 * - Testing guides
 */

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AirdropButton } from '@/components/devnet/AirdropButton'
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ExternalLink, Check, Clock, AlertCircle, Info } from 'lucide-react'

interface FaucetStatus {
  status: string
  balance?: number
  claimsRemaining?: number
  faucetAddress?: string
}

export default function DevnetToolsPage() {
  const { publicKey } = useWallet()
  const [faucetStatus, setFaucetStatus] = useState<FaucetStatus | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)

  useEffect(() => {
    fetchFaucetStatus()
  }, [])

  const fetchFaucetStatus = async () => {
    try {
      const response = await fetch('/api/airdrop/ghost')
      const data = await response.json()
      setFaucetStatus(data)
    } catch (error) {
      console.error('Failed to fetch faucet status:', error)
    } finally {
      setIsLoadingStatus(false)
    }
  }

  const handleAirdropSuccess = (signature: string, balance: number) => {
    // Refresh faucet status after successful airdrop
    fetchFaucetStatus()
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Devnet Tools</h1>
        <p className="text-muted-foreground text-lg">
          Get tokens, test features, and build on GhostSpeak devnet
        </p>
      </div>

      {/* Warning Banner */}
      <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        <AlertTitle className="text-yellow-500">Devnet Only</AlertTitle>
        <AlertDescription className="text-yellow-500/80">
          These tools are for development and testing only. Devnet tokens have no real value.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Airdrop Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🪂 GHOST Token Airdrop
              <Badge variant="secondary">Devnet</Badge>
            </CardTitle>
            <CardDescription>Claim 10,000 devnet GHOST tokens once per 24 hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!publicKey ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Connect your wallet to claim devnet GHOST tokens
                </p>
                <WalletConnectButton />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Amount per claim</span>
                    <span className="font-semibold">10,000 GHOST</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rate limit</span>
                    <span className="font-semibold">24 hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Wallet</span>
                    <span className="font-mono text-xs">
                      {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
                    </span>
                  </div>
                </div>

                <AirdropButton
                  variant="default"
                  size="lg"
                  className="w-full"
                  onSuccess={handleAirdropSuccess}
                />

                <p className="text-xs text-muted-foreground text-center">
                  Need SOL for transaction fees?{' '}
                  <a
                    href="https://faucet.solana.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Get devnet SOL <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Faucet Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Faucet Status</CardTitle>
            <CardDescription>Current status of the devnet GHOST faucet</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStatus ? (
              <div className="text-center py-8 text-muted-foreground">Loading status...</div>
            ) : faucetStatus?.status === 'ok' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-500">
                  <Check className="h-5 w-5" />
                  <span className="font-semibold">Operational</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Available Balance</span>
                    <span className="font-semibold">
                      {faucetStatus.balance?.toLocaleString() || 0} GHOST
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Claims Remaining</span>
                    <span className="font-semibold">
                      ~{faucetStatus.claimsRemaining?.toLocaleString() || 0}
                    </span>
                  </div>

                  {faucetStatus.faucetAddress && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Faucet Address</p>
                      <a
                        href={`https://explorer.solana.com/address/${faucetStatus.faucetAddress}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
                      >
                        {faucetStatus.faucetAddress.slice(0, 8)}...
                        {faucetStatus.faucetAddress.slice(-8)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                {(faucetStatus.claimsRemaining || 0) < 10 && (
                  <Alert className="border-yellow-500/50 bg-yellow-500/10">
                    <Info className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-xs text-yellow-500/80">
                      Faucet running low. Please notify the team if you need more tokens.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Faucet unavailable. Please contact support.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
          <CardDescription>Get started testing on GhostSpeak devnet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Get SOL for transaction fees</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Visit the{' '}
                  <a
                    href="https://faucet.solana.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Solana devnet faucet <ExternalLink className="h-3 w-3" />
                  </a>{' '}
                  to get 2 SOL
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Claim GHOST tokens</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Use the airdrop button above to claim 10,000 devnet GHOST tokens
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Stake GHOST and register agent</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Go to{' '}
                  <a href="/dashboard/staking" className="text-primary hover:underline">
                    Staking Dashboard
                  </a>{' '}
                  to stake your GHOST tokens (minimum 1,000 GHOST required)
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                4
              </div>
              <div>
                <h3 className="font-semibold mb-1">Test agent features</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Visit{' '}
                  <a href="/dashboard/agents" className="text-primary hover:underline">
                    Agents Dashboard
                  </a>{' '}
                  to register and manage your test agents
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href="https://docs.ghostspeak.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View docs <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Explorer</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href="https://explorer.solana.com/?cluster=devnet"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Solana Explorer <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Support</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href="https://github.com/dexploarer/GhostSpeak/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Report issues <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
