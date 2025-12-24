'use client'

import React, { useState } from 'react'
import {
  Fingerprint,
  Shield,
  Globe,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Terminal,
  ExternalLink,
  RefreshCw,
  Loader2,
  Mail,
} from 'lucide-react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { PageHeader } from '@/components/dashboard/shared/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useCredentials, useSyncCredential, type Credential } from '@/lib/queries/credentials'
import { toast } from 'sonner'

export default function CredentialsPage() {
  const { data: credentials = [], isLoading, refetch } = useCredentials()
  const syncCredential = useSyncCredential()

  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null)
  const [recipientEmail, setRecipientEmail] = useState('')

  const handleSync = async () => {
    if (!selectedCredential || !recipientEmail) {
      toast.error('Please enter a recipient email')
      return
    }

    try {
      await syncCredential.mutateAsync({
        credentialType: selectedCredential.type,
        agentAddress: selectedCredential.subject,
        recipientEmail,
      })
      setSyncDialogOpen(false)
      setRecipientEmail('')
      setSelectedCredential(null)
    } catch {
      // Error handled by mutation
    }
  }

  const openSyncDialog = (cred: Credential) => {
    setSelectedCredential(cred)
    setSyncDialogOpen(true)
  }

  const syncedCount = credentials.filter((c) => c.crossmintSync?.status === 'synced').length

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title="Verifiable Credentials"
        description="Manage your cross-chain agent identity and reputation"
      >
        <Button variant="outline" className="gap-2" onClick={() => refetch()}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Link href="/link">
          <Button variant="outline" className="gap-2">
            <Terminal className="w-4 h-4" />
            Link CLI Wallet
          </Button>
        </Link>
      </PageHeader>

      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Fingerprint className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '...' : credentials.length}</p>
                <p className="text-sm text-muted-foreground">Total Credentials</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '...' : syncedCount}</p>
                <p className="text-sm text-muted-foreground">Synced to EVM</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-muted-foreground">Supported Chains</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">W3C</p>
                <p className="text-sm text-muted-foreground">Standard Compliant</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Cross-Chain Bridge Explainer */}
        <GlassCard className="p-6 bg-linear-to-r from-purple-500/5 to-blue-500/5 border-purple-500/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Cross-Chain Identity Bridge</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Your Solana agent credentials can be synced to EVM networks (Base, Polygon,
                Ethereum) using W3C Verifiable Credentials via Crossmint.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
                  Solana Native
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                  Base
                </span>
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-medium">
                  Polygon
                </span>
                <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs font-medium">
                  Ethereum
                </span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Credentials List */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Your Credentials</h3>

          {isLoading ? (
            <GlassCard className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground">Loading credentials...</p>
            </GlassCard>
          ) : credentials.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Fingerprint className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-bold mb-2">No Credentials Yet</h4>
              <p className="text-muted-foreground text-sm mb-4">
                Register an agent to receive your first credential.
              </p>
              <Link href="/dashboard/agents">
                <Button>Register Agent</Button>
              </Link>
            </GlassCard>
          ) : (
            <div className="grid gap-4">
              {credentials.map((cred) => (
                <GlassCard key={cred.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          cred.type === 'AgentIdentity'
                            ? 'bg-purple-500/20'
                            : cred.type === 'Reputation'
                              ? 'bg-yellow-500/20'
                              : 'bg-green-500/20'
                        }`}
                      >
                        <Fingerprint
                          className={`w-5 h-5 ${
                            cred.type === 'AgentIdentity'
                              ? 'text-purple-500'
                              : cred.type === 'Reputation'
                                ? 'text-yellow-500'
                                : 'text-green-500'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold">{cred.type}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              cred.status === 'active'
                                ? 'bg-green-500/20 text-green-500'
                                : 'bg-gray-500/20 text-gray-500'
                            }`}
                          >
                            {cred.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">{cred.id}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Issued {new Date(cred.issuedAt * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Cross-chain sync status */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          {cred.crossmintSync?.status === 'synced' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-500">Synced to EVM</span>
                            </>
                          ) : cred.crossmintSync?.status === 'pending' ? (
                            <>
                              <Clock className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm text-yellow-500">Sync Pending</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Not Synced</span>
                            </>
                          )}
                        </div>
                        {cred.crossmintSync?.chain && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {cred.crossmintSync.chain}
                          </p>
                        )}
                      </div>

                      {/* Sync button */}
                      {cred.crossmintSync?.status !== 'synced' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openSyncDialog(cred)}
                          disabled={syncCredential.isPending}
                        >
                          {syncCredential.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <ArrowRightLeft className="w-4 h-4 mr-1" />
                              Sync
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>

        {/* CLI Sync Instructions */}
        <GlassCard className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Terminal className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-2">Sync Credentials via CLI</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Use the GhostSpeak CLI to sync your agent identity to EVM networks.
              </p>
              <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-green-400">
                <code>ghostspeak credentials sync --agent &lt;AGENT_ADDRESS&gt;</code>
              </div>
              <div className="flex gap-2 mt-4">
                <Link
                  href="https://docs.ghostspeak.io/cli/credentials"
                  target="_blank"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  CLI Documentation
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <span className="text-muted-foreground">•</span>
                <Link
                  href="https://docs.ghostspeak.io/guides/verifiable-credentials"
                  target="_blank"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  VC Guide
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Sync Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Sync to EVM</DialogTitle>
                <DialogDescription>
                  Sync your {selectedCredential?.type} credential to EVM networks.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-400">
                Your credential will be issued on Base Sepolia via Crossmint. The recipient email is
                used to associate the credential with a Crossmint wallet.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Recipient Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The credential will be issued to the Crossmint wallet linked to this email.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSync}
              disabled={syncCredential.isPending || !recipientEmail}
              className="gap-2"
            >
              {syncCredential.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  Sync to EVM
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
