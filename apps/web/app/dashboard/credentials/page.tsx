'use client'

import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell'
import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import {
  ExternalLink,
  Fingerprint,
  Loader2,
  Search,
  ShieldCheck,
  User,
  X,
  BadgeCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PublicKey } from '@solana/web3.js'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/enhanced/StatusBadge'
import { GhostLoader } from '@/components/ui/enhanced/GhostLoader'
import { StatCard } from '@/components/ui/enhanced/StatCard'

type CredentialSummary = {
  credentialType:
    | 'agent_identity'
    | 'reputation_tier'
    | 'payment_milestone'
    | 'staking'
    | 'verified_hire'
    | 'capability_verification'
    | 'uptime_attestation'
    | 'api_quality_grade'
    | 'tee_attestation'
    | 'model_provenance'
  credentialId: string
  issuedAt: number
  expiresAt: number | null
  status: 'active' | 'expired' | 'revocation_unknown'
  crossmintCredentialId: string | null
  txSignatures: Array<{ kind: string; signature: string }>
  display: Record<string, any>
}

type CredentialDetailsEnvelope = {
  credentialType: CredentialSummary['credentialType']
  credentialId: string
  issuedAt: number
  expiresAt: number | null
  status: CredentialSummary['status']
  subjectAgentAddress: string
  evidence: Record<string, any>
  raw: Record<string, any>
} | null

function normalizeSolanaAddress(input: string): { ok: true; address: string } | { ok: false } {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false }
  try {
    return { ok: true, address: new PublicKey(trimmed).toBase58() }
  } catch {
    return { ok: false }
  }
}

function formatDate(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—'
  try {
    return new Date(ms).toLocaleString()
  } catch {
    return String(ms)
  }
}

function humanCredentialType(t: CredentialSummary['credentialType']): string {
  switch (t) {
    case 'agent_identity':
      return 'Agent identity'
    case 'reputation_tier':
      return 'Reputation tier'
    case 'payment_milestone':
      return 'Payment milestone'
    case 'staking':
      return 'Staking'
    case 'verified_hire':
      return 'Verified hire'
    case 'capability_verification':
      return 'Capability verification'
    case 'uptime_attestation':
      return 'Uptime attestation'
    case 'api_quality_grade':
      return 'API quality grade'
    case 'tee_attestation':
      return 'TEE attestation'
    case 'model_provenance':
      return 'Model provenance'
  }
}

function summarizeDisplay(display: Record<string, any>): string {
  const pairs: Array<[string, any]> = Object.entries(display)
  const cleaned = pairs
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .slice(0, 3)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: ${v.length}`
      if (typeof v === 'number') return `${k}: ${v}`
      if (typeof v === 'boolean') return `${k}: ${v ? 'true' : 'false'}`
      return `${k}: ${String(v)}`
    })

  return cleaned.length ? cleaned.join(' • ') : '—'
}

function getExplorerTxUrl(signature: string): string {
  // Credentials are currently issued on Solana Devnet.
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
}

export default function DashboardCredentialsPage() {
  const { publicKey } = useWallet()

  const userAgents = useQuery(
    api.dashboard.getUserAgents,
    publicKey ? { walletAddress: publicKey } : 'skip'
  )
  const [addressInput, setAddressInput] = useState('')
  const [lookupAddressRaw, setLookupAddressRaw] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const [selectedCredential, setSelectedCredential] = useState<CredentialSummary | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    if (!userAgents?.agents?.length) return
    if (addressInput.trim()) return
    // Convenience only: prefill with the user's first agent, without auto-running lookup.
    setAddressInput(userAgents.agents[0].address)
  }, [userAgents, addressInput])

  const normalizedLookup = useMemo(() => {
    if (!lookupAddressRaw) return null
    const normalized = normalizeSolanaAddress(lookupAddressRaw)
    return normalized.ok ? normalized.address : null
  }, [lookupAddressRaw])

  const agentProfile = useQuery(
    api.agents.getAgentProfilePublic,
    normalizedLookup ? { agentAddress: normalizedLookup } : 'skip'
  )

  const credentialSummaries = useQuery(
    api.credentials.listAgentCredentialSummariesPublic,
    normalizedLookup ? { agentAddress: normalizedLookup } : 'skip'
  ) as CredentialSummary[] | undefined

  const credentialDetails = useQuery(
    api.credentials.getCredentialDetailsPublic,
    selectedCredential
      ? {
          credentialType: selectedCredential.credentialType,
          credentialId: selectedCredential.credentialId,
        }
      : 'skip'
  ) as CredentialDetailsEnvelope | undefined

  const onSubmitLookup = () => {
    const normalized = normalizeSolanaAddress(addressInput)
    if (!normalized.ok) {
      setValidationError('Enter a valid Solana wallet address')
      setLookupAddressRaw(null)
      setSelectedCredential(null)
      setDetailsOpen(false)
      return
    }

    setValidationError(null)
    setLookupAddressRaw(normalized.address)
    setSelectedCredential(null)
    setDetailsOpen(false)
  }

  const onPickAgent = (agentAddress: string) => {
    setAddressInput(agentAddress)
    setLookupAddressRaw(agentAddress)
    setValidationError(null)
    setSelectedCredential(null)
    setDetailsOpen(false)
  }

  const statusBadgeClass = (status: CredentialSummary['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'expired':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      default:
        return 'bg-white/5 text-white/50 border-white/10'
    }
  }

  return (
    <DashboardPageShell
      title="Credentials"
      description="Lookup issued credentials (VCs) for any agent address and inspect validation metadata."
    >
      <div className="space-y-4">
        <section
          className="p-5 sm:p-6 bg-[#111111] border border-white/10 rounded-xl"
          data-testid="credentials-lookup-section"
        >
          <div className="flex items-center gap-2 mb-4">
            <Fingerprint className="w-4 h-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-medium text-white">Lookup agent credentials</h2>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label className="text-xs text-white/40 uppercase tracking-wider font-medium">
                  Agent wallet address
                </label>
                <input
                  value={addressInput}
                  onChange={(e) => {
                    setAddressInput(e.target.value)
                    setValidationError(null)
                  }}
                  placeholder="Enter any Solana address…"
                  className="mt-2 w-full min-h-[44px] px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                  data-testid="credentials-agent-address-input"
                />
                {validationError && (
                  <p
                    className="text-xs text-red-400 mt-2"
                    data-testid="credentials-agent-address-error"
                  >
                    {validationError}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onSubmitLookup}
                className="sm:mt-6 min-h-[44px] px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-all inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                data-testid="credentials-agent-submit"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                Lookup
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1">
                <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
                  Quick pick (my agents)
                </p>
                <Select
                  onValueChange={onPickAgent}
                  disabled={userAgents === undefined || !userAgents?.agents?.length}
                >
                  <SelectTrigger
                    className="mt-2 bg-[#0a0a0a] border-white/10 text-white"
                    data-testid="credentials-agent-picker"
                  >
                    <SelectValue
                      placeholder={
                        userAgents === undefined
                          ? 'Loading…'
                          : userAgents?.agents?.length
                            ? 'Select one of my agents'
                            : 'No agents'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(userAgents?.agents ?? []).map((a) => (
                      <SelectItem key={a.address} value={a.address}>
                        {a.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-white/40 mt-2">
                  You can lookup any address — it does not need to belong to your wallet.
                </p>
              </div>

              <Link
                href="/agents/register"
                className="min-h-[44px] px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:border-white/20 transition-all inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
              >
                Register an agent
              </Link>
            </div>
          </div>
        </section>

        {normalizedLookup && (
          <section
            className="p-5 sm:p-6 bg-[#111111] border border-white/10 rounded-xl"
            data-testid="credentials-agent-card"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Agent</p>
                <p
                  className="text-sm text-white/90 font-mono break-all mt-1"
                  data-testid="credentials-agent-address"
                >
                  {normalizedLookup}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <div
                  className={`px-2 py-0.5 rounded text-xs border ${
                    agentProfile?.discoveredAgent?.exists
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-white/5 text-white/50 border-white/10'
                  }`}
                  data-testid="credentials-agent-source-discovered"
                >
                  {agentProfile?.discoveredAgent?.exists ? 'Discovered' : 'Not discovered'}
                </div>
                <div
                  className={`px-2 py-0.5 rounded text-xs border ${
                    agentProfile?.reputationCache?.exists
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-white/5 text-white/50 border-white/10'
                  }`}
                  data-testid="credentials-agent-source-reputation"
                >
                  {agentProfile?.reputationCache?.exists
                    ? 'Reputation cached'
                    : 'No reputation cache'}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-white/60" aria-hidden="true" />
                  <p className="text-sm text-white/80 font-medium">Profile</p>
                </div>
                {agentProfile === undefined ? (
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Loading…
                  </div>
                ) : agentProfile?.discoveredAgent?.exists ? (
                  <div className="space-y-1">
                    <p className="text-xs text-white/40">
                      Status:{' '}
                      <span className="text-white/80" data-testid="credentials-agent-status">
                        {agentProfile.discoveredAgent.record?.status ?? 'unknown'}
                      </span>
                    </p>
                    <p className="text-xs text-white/40">
                      Name:{' '}
                      <span className="text-white/80" data-testid="credentials-agent-name">
                        {agentProfile.discoveredAgent.record?.name?.value ?? '—'}
                      </span>
                    </p>
                    <p className="text-xs text-white/40">
                      Description:{' '}
                      <span className="text-white/80" data-testid="credentials-agent-description">
                        {agentProfile.discoveredAgent.record?.description?.value ?? '—'}
                      </span>
                    </p>
                    <p className="text-xs text-white/40">
                      Discovery source:{' '}
                      <span
                        className="text-white/80"
                        data-testid="credentials-agent-discovery-source"
                      >
                        {agentProfile.discoveredAgent.record?.discoverySource ?? '—'}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-white/60">
                    No public discovered profile for this address.
                  </p>
                )}
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-white/60" aria-hidden="true" />
                  <p className="text-sm text-white/80 font-medium">External IDs & reputation</p>
                </div>

                {agentProfile === undefined ? (
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Loading…
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
                        External IDs
                      </p>
                      {agentProfile.externalIdMappings?.count ? (
                        <ul className="mt-2 space-y-1" data-testid="credentials-agent-external-ids">
                          {agentProfile.externalIdMappings.items.map((m: any) => (
                            <li
                              key={`${m.platform}:${m.externalId}`}
                              className="text-xs text-white/70"
                            >
                              <span className="text-white/50">{m.platform}:</span>{' '}
                              <span className="font-mono break-all">{m.externalId}</span>{' '}
                              {m.verified ? (
                                <span
                                  className="inline-flex items-center gap-1 text-green-400"
                                  aria-label="verified"
                                >
                                  <BadgeCheck className="w-3 h-3" aria-hidden="true" /> verified
                                </span>
                              ) : (
                                <span className="text-white/40">unverified</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-white/60 mt-1">None found.</p>
                      )}
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
                        Reputation cache
                      </p>
                      {agentProfile.reputationCache?.exists ? (
                        <div
                          className="mt-2 space-y-1"
                          data-testid="credentials-agent-reputation-cache"
                        >
                          <p className="text-xs text-white/40">
                            Ghost score:{' '}
                            <span className="text-white/80">
                              {agentProfile.reputationCache.record?.ghostScore}
                            </span>
                          </p>
                          <p className="text-xs text-white/40">
                            Tier:{' '}
                            <span className="text-white/80">
                              {agentProfile.reputationCache.record?.tier}
                            </span>
                          </p>
                          <p className="text-xs text-white/40">
                            Last updated:{' '}
                            <span className="text-white/80">
                              {formatDate(agentProfile.reputationCache.record?.lastUpdated)}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-white/60 mt-1">No reputation cache found.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {normalizedLookup && (
          <section className="space-y-6" data-testid="credentials-list-section">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Agent Credentials
              </h2>
            </div>

            {credentialSummaries === undefined ? (
              <GhostLoader variant="list" count={2} />
            ) : credentialSummaries.length === 0 ? (
              <div className="p-12 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center">
                <Fingerprint className="w-12 h-12 text-white/10 mb-4" />
                <p className="text-sm text-white/60">
                  No credentials found for this agent address.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="credentials-list">
                <AnimatePresence mode="popLayout" initial={false}>
                  {credentialSummaries.map((c, idx) => (
                    <motion.button
                      layout
                      key={`${c.credentialType}:${c.credentialId}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ y: -4 }}
                      onClick={() => {
                        setSelectedCredential(c)
                        setDetailsOpen(true)
                      }}
                      className="group relative flex flex-col items-center p-8 bg-[#111111] border border-white/10 rounded-2xl hover:border-white/20 transition-all text-center overflow-hidden"
                    >
                      {/* Background Certificate Decorative Seal */}
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/[0.02] rounded-full border border-white/5 pointer-events-none group-hover:bg-primary/[0.02] transition-colors" />

                      {/* Status Badge */}
                      <div className="absolute top-4 right-4">
                        <StatusBadge
                          label={c.status === 'active' ? 'Active' : 'Expired'}
                          variant={c.status === 'active' ? 'premium' : 'neutral'}
                          pulse={c.status === 'active'}
                        />
                      </div>

                      {/* Badge Visual */}
                      <div className="relative mb-6">
                        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-300">
                          <BadgeCheck className="w-10 h-10 text-white/20 group-hover:text-primary transition-colors" />
                        </div>
                        {/* Floating Decorative Elements */}
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary/20 rounded-full blur-sm group-hover:animate-pulse" />
                      </div>

                      <h3 className="text-lg font-bold text-white mb-2 tracking-tight">
                        {humanCredentialType(c.credentialType)}
                      </h3>

                      <div className="space-y-3 w-full">
                        <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs text-white/40 font-medium">
                          {summarizeDisplay(c.display)}
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-white/20 font-mono tracking-widest break-all">
                            ID: {c.credentialId}
                          </span>
                        </div>

                        <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/5 text-[10px] uppercase font-bold text-white/30 tracking-widest">
                          <div className="flex flex-col gap-0.5">
                            <span>Issued</span>
                            <span className="text-white/60">
                              {new Date(c.issuedAt).toLocaleDateString()}
                            </span>
                          </div>
                          {c.expiresAt && (
                            <>
                              <div className="w-1 h-1 bg-white/10 rounded-full" />
                              <div className="flex flex-col gap-0.5">
                                <span>Expires</span>
                                <span className="text-white/60">
                                  {new Date(c.expiresAt).toLocaleDateString()}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>VIEW PROOF DETAILS</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        )}

        <section className="p-5 sm:p-6 bg-[#111111] border border-white/10 rounded-xl">
          <h2 className="text-sm font-medium text-white mb-2">Not available in web yet</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            This dashboard view shows credential metadata and pointers. Full cryptographic proof
            verification is not available in the web UI yet.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <a
              href="https://docs.ghostspeak.io/dashboard/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:border-white/20 transition-all"
            >
              Credentials docs <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
            <Link
              href="/agents/register"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:border-white/20 transition-all"
            >
              Register an agent
            </Link>
          </div>
        </section>
      </div>

      <Sheet
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open)
          if (!open) setSelectedCredential(null)
        }}
      >
        <SheetContent
          side="right"
          className="bg-[#111111] border-white/10 text-white w-[92vw] sm:max-w-xl [&>button]:hidden"
          data-testid="credential-details-panel"
        >
          <SheetHeader className="pr-8">
            <SheetTitle className="text-white flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-primary" aria-hidden="true" />
              Credential details
            </SheetTitle>
          </SheetHeader>

          {!selectedCredential ? (
            <div className="mt-6 text-sm text-white/60">Select a credential to view details.</div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white/90 font-medium">
                      {humanCredentialType(selectedCredential.credentialType)}
                    </p>
                    <p
                      className="text-xs text-white/40 font-mono break-all mt-1"
                      data-testid="credential-details-id"
                    >
                      {selectedCredential.credentialId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailsOpen(false)
                      setSelectedCredential(null)
                    }}
                    className="shrink-0 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                    data-testid="credential-details-close"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-3 space-y-1" data-testid="credential-details-status-block">
                  <p className="text-xs text-white/40">
                    Status:{' '}
                    <span className="text-white/80">
                      {credentialDetails && credentialDetails !== null
                        ? credentialDetails.status === 'active'
                          ? 'Active'
                          : credentialDetails.status === 'expired'
                            ? 'Expired'
                            : 'Unknown'
                        : '—'}
                    </span>
                  </p>
                  <p className="text-xs text-white/40">
                    Issued at:{' '}
                    <span className="text-white/80">{formatDate(selectedCredential.issuedAt)}</span>
                  </p>
                  <p className="text-xs text-white/40">
                    Expires at:{' '}
                    <span className="text-white/80">
                      {formatDate(selectedCredential.expiresAt ?? null)}
                    </span>
                  </p>
                  <p className="text-xs text-white/40">
                    Crossmint ID:{' '}
                    <span className="text-white/80 font-mono break-all">
                      {selectedCredential.crossmintCredentialId ?? '—'}
                    </span>
                  </p>
                </div>
              </div>

              <div
                className="p-3 bg-white/5 border border-white/10 rounded-lg"
                data-testid="credential-details-proof"
              >
                <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2">
                  Proof
                </p>
                <p className="text-sm text-white/70">
                  Proof: not available in web yet. Any signatures shown below are pointers only and
                  are not cryptographically verified in this UI.
                </p>
              </div>

              <div
                className="p-3 bg-white/5 border border-white/10 rounded-lg"
                data-testid="credential-details-signatures"
              >
                <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2">
                  On-chain / signature pointers
                </p>

                {selectedCredential.txSignatures?.length ? (
                  <ul className="space-y-2">
                    {selectedCredential.txSignatures.map((p) => (
                      <li key={`${p.kind}:${p.signature}`} className="text-xs text-white/70">
                        <span className="text-white/40">{p.kind}:</span>{' '}
                        <span className="font-mono break-all">{p.signature}</span>
                        <a
                          href={getExplorerTxUrl(p.signature)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 inline-flex items-center gap-1 text-primary/70 hover:text-primary transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          view
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-white/60">
                    No signature pointers available for this credential.
                  </p>
                )}
              </div>

              <div
                className="p-3 bg-white/5 border border-white/10 rounded-lg"
                data-testid="credential-details-evidence"
              >
                <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2">
                  Type-specific evidence
                </p>

                {credentialDetails === undefined ? (
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Loading details…
                  </div>
                ) : credentialDetails === null ? (
                  <p className="text-sm text-white/60">Credential not found.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-white/40">
                      Subject:{' '}
                      <span className="text-white/80 font-mono break-all">
                        {credentialDetails.subjectAgentAddress}
                      </span>
                    </p>

                    <div className="border-t border-white/10 pt-3">
                      <ul className="space-y-1" data-testid="credential-details-evidence-list">
                        {Object.entries(credentialDetails.evidence)
                          .filter(([, v]) => v !== undefined)
                          .map(([k, v]) => (
                            <li key={k} className="text-xs text-white/70">
                              <span className="text-white/40">{k}:</span>{' '}
                              <span className="font-mono break-all">
                                {Array.isArray(v)
                                  ? JSON.stringify(v)
                                  : typeof v === 'object' && v !== null
                                    ? JSON.stringify(v)
                                    : String(v)}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </DashboardPageShell>
  )
}
