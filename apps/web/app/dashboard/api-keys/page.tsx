'use client'

import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell'
import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { readGhostSpeakAuthSessionFromLocalStorage } from '@/lib/auth/verifiedSession'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { StatCard } from '@/components/ui/enhanced/StatCard'
import { StatusBadge } from '@/components/ui/enhanced/StatusBadge'
import { GhostLoader } from '@/components/ui/enhanced/GhostLoader'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import {
  Check,
  Copy,
  AlertTriangle,
  ExternalLink,
  KeyRound,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'

type ApiKeyTier = 'startup' | 'growth' | 'enterprise'

type ApiKeyRow = {
  id: Id<'apiKeys'>
  name?: string | null
  keyPrefix: string
  tier: ApiKeyTier
  rateLimit: number
  createdAt: number
  lastUsedAt?: number | null
  isActive: boolean
  revokedAt?: number | null
}

type RevealState = {
  apiKeyId: Id<'apiKeys'>
  apiKey: string
  keyPrefix: string
  tier: ApiKeyTier
  rateLimit: number
  createdAt: number
}

function formatTimestamp(ts?: number | null): string {
  if (!ts) return 'Never'
  return new Date(ts).toLocaleString()
}

function formatTier(tier: ApiKeyTier): string {
  switch (tier) {
    case 'startup':
      return 'Startup'
    case 'growth':
      return 'Growth'
    case 'enterprise':
      return 'Enterprise'
  }
}

function formatRateLimit(rateLimit: number): string {
  return `${rateLimit.toLocaleString()} req/min`
}

export default function DashboardApiKeysPage() {
  const { publicKey } = useWallet()

  const [userId, setUserId] = useState<Id<'users'> | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    const session = readGhostSpeakAuthSessionFromLocalStorage()
    if (!session?.userId) {
      setUserId(null)
      setSessionError('Session is missing userId. Disconnect and reconnect to re-authenticate.')
      return
    }

    setSessionError(null)
    setUserId(session.userId as Id<'users'>)
  }, [publicKey])

  const apiKeys = useQuery(api.apiKeys.listMyApiKeys, userId ? { userId } : 'skip') as
    | ApiKeyRow[]
    | undefined

  const createApiKey = useMutation(api.apiKeys.createApiKey)
  const revokeApiKey = useMutation(api.apiKeys.revokeApiKey)

  const [createName, setCreateName] = useState('')
  const [createTier, setCreateTier] = useState<ApiKeyTier>('startup')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [reveal, setReveal] = useState<RevealState | null>(null)
  const [revealOpen, setRevealOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRow | null>(null)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [revokeError, setRevokeError] = useState<string | null>(null)

  const activeKeyCount = useMemo(() => {
    if (!apiKeys) return 0
    return apiKeys.filter((k) => k.isActive).length
  }, [apiKeys])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!userId) return

    setIsCreating(true)
    setCreateError(null)
    setCopied(false)

    try {
      const trimmedName = createName.trim()
      const result = await createApiKey({
        userId,
        name: trimmedName.length > 0 ? trimmedName : undefined,
        tier: createTier,
      })

      setReveal({
        apiKeyId: result.apiKeyId as Id<'apiKeys'>,
        apiKey: result.apiKey,
        keyPrefix: result.keyPrefix,
        tier: result.tier as ApiKeyTier,
        rateLimit: result.rateLimit,
        createdAt: result.createdAt,
      })
      setRevealOpen(true)
      setCreateName('')
    } catch (err: any) {
      setCreateError(err?.message ?? 'Failed to create API key')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleCopyRevealedKey() {
    if (!reveal?.apiKey) return
    try {
      await navigator.clipboard.writeText(reveal.apiKey)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // no-op; keep UI minimal
    }
  }

  async function handleConfirmRevoke() {
    if (!userId || !revokeTarget) return

    setIsRevoking(true)
    setRevokeError(null)
    try {
      await revokeApiKey({ userId, apiKeyId: revokeTarget.id })
      setRevokeOpen(false)
      setRevokeTarget(null)
    } catch (err: any) {
      setRevokeError(err?.message ?? 'Failed to revoke API key')
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <DashboardPageShell
      title="API Keys"
      description="Create, list, and revoke API keys for agents and human developers. Keys are only revealed once."
    >
      <div className="space-y-4" data-testid="api-keys-page">
        {/* Usage hints */}
        <section
          className="p-5 sm:p-6 bg-[#111111] border border-white/10 rounded-xl"
          data-testid="api-keys-usage-hints"
        >
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-4 h-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-medium text-white">Usage</h2>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            Send your API key as{' '}
            <span className="font-mono text-white/70">Authorization: Bearer &lt;apiKey&gt;</span>.
            If needed, <span className="font-mono text-white/70">X-API-Key</span> is accepted as an
            alias.
          </p>

          <div className="mt-4 p-3 bg-[#0a0a0a] border border-white/10 rounded-lg">
            <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2">
              Example
            </p>
            <pre
              className="text-xs text-white/70 font-mono whitespace-pre-wrap break-words"
              data-testid="api-key-curl-snippet"
            >{`curl -H "Authorization: Bearer <apiKey>" \\
  https://api.ghostspeak.io/...`}</pre>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href="https://docs.ghostspeak.io/dashboard/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:border-white/20 transition-all"
            >
              API Keys docs <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
            <a
              href="https://docs.ghostspeak.io/api/authentication"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:border-white/20 transition-all"
            >
              API auth docs <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </section>

        {/* Create */}
        <section
          className="p-5 sm:p-6 bg-[#111111] border border-white/10 rounded-xl"
          data-testid="api-key-create-card"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-medium text-white">Create API key</h2>
              <p className="text-xs text-white/40 mt-1">
                Active keys: <span className="text-white/70">{activeKeyCount}</span> / 10
              </p>
            </div>
          </div>

          {!userId ? (
            <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-white/60 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm text-white/80" data-testid="api-keys-session-error">
                  {sessionError ?? 'Unable to read session.'}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  If this keeps happening, disconnect your wallet and reconnect to refresh your SIWS
                  session.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-3" data-testid="api-key-create-form">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-white/40 uppercase tracking-wider font-medium mb-2">
                    Name (optional)
                  </label>
                  <input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. prod-agent, local-dev, staging"
                    className="w-full min-h-[44px] px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                    data-testid="api-key-name-input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider font-medium mb-2">
                    Tier
                  </label>
                  <Select value={createTier} onValueChange={(v) => setCreateTier(v as ApiKeyTier)}>
                    <SelectTrigger
                      className="min-h-[44px] bg-[#0a0a0a] border-white/10 text-white"
                      data-testid="api-key-tier-select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="startup">Startup</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {createError && (
                <p className="text-xs text-red-400" data-testid="api-key-create-error">
                  {createError}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                  data-testid="api-key-create-submit"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  )}
                  Create key
                </button>

                <Link
                  href="/dashboard"
                  className="inline-flex min-h-[44px] items-center justify-center px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:border-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                  data-testid="api-key-back-to-dashboard"
                >
                  Back to Dashboard
                </Link>
              </div>

              <p className="text-xs text-white/40">
                Keys are only shown once at creation. Store it somewhere safe.
              </p>
            </form>
          )}
        </section>

        {/* List */}
        <section
          className="space-y-6"
          data-testid="api-keys-list-card"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" aria-hidden="true" />
              <h2 className="text-xl font-bold text-white">Your API Keys</h2>
            </div>
          </div>

          {apiKeys === undefined ? (
            <GhostLoader variant="list" count={3} />
          ) : apiKeys.length === 0 ? (
            <div className="p-12 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center">
              <KeyRound className="w-12 h-12 text-white/10 mb-4" />
              <p className="text-sm text-white/60">No API keys yet. Create one to start authenticating requests.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="api-keys-list">
              <AnimatePresence mode="popLayout" initial={false}>
                {apiKeys.map((k) => (
                  <motion.div
                    layout
                    key={k.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="p-6 bg-[#111111] border border-white/10 rounded-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-300"
                    data-testid={`api-key-row-${k.id}`}
                  >
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                              {k.name?.trim() ? k.name : 'Production Key'}
                            </h3>
                            <StatusBadge
                              label={k.isActive ? 'Active' : 'Revoked'}
                              variant={k.isActive ? 'premium' : 'neutral'}
                              pulse={k.isActive}
                            />
                          </div>
                          <p className="text-[10px] text-white/40 font-mono tracking-wider">{k.id}</p>
                        </div>

                        {k.isActive && (
                          <button
                            onClick={() => {
                              setRevokeError(null)
                              setRevokeTarget(k)
                              setRevokeOpen(true)
                            }}
                            className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/20 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 mb-6 group-hover:bg-[#0c0c0c] transition-colors">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Key Prefix</span>
                            <span className="text-sm font-mono text-white/70 tracking-widest">{k.keyPrefix}••••••••</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Masked display visual */}
                            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded text-xs text-white/40 font-mono">
                              ••••••••••••••
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-bold text-white/30">Tier</span>
                            <span className="text-[11px] text-white font-medium">{formatTier(k.tier)}</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                k.tier === 'enterprise' ? 'w-full bg-purple-500' :
                                  k.tier === 'growth' ? 'w-[66%] bg-blue-500' : 'w-[33%] bg-lime-500'
                              )}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-bold text-white/30">Rate Limit</span>
                            <span className="text-[11px] text-white font-medium">{formatRateLimit(k.rateLimit)}</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: '80%' }}
                              className="h-full bg-white/20 rounded-full"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] uppercase font-bold text-white/20">Last Used</span>
                          <span className="text-[11px] text-white/60">{formatTimestamp(k.lastUsedAt)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] uppercase font-bold text-white/20">Created</span>
                          <span className="text-[11px] text-white/60">{formatTimestamp(k.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Aesthetic Background Accents */}
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                      <KeyRound className="w-32 h-32" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>

      {/* One-time reveal modal */}
      <Dialog
        open={revealOpen}
        onOpenChange={(open) => {
          setRevealOpen(open)
          if (!open) {
            // Ensure the plaintext key is never shown again after dismiss.
            setReveal(null)
            setCopied(false)
          }
        }}
      >
        <DialogContent
          className="bg-[#111111] border border-white/20 text-white max-w-lg"
          data-testid="api-key-reveal-dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-light text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" aria-hidden="true" />
              New API key
            </DialogTitle>
            <DialogDescription className="text-white/60">
              This is the only time you will be able to view the plaintext key.
            </DialogDescription>
          </DialogHeader>

          {reveal ? (
            <div className="space-y-3">
              <div className="p-3 bg-[#0a0a0a] border border-white/10 rounded-lg">
                <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2">
                  API key
                </p>
                <div className="flex items-start justify-between gap-2">
                  <p
                    className="text-xs text-white/80 font-mono break-all"
                    data-testid="api-key-reveal-value"
                  >
                    {reveal.apiKey}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyRevealedKey}
                    className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 hover:bg-white/10 hover:border-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                    data-testid="api-key-copy-button"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" aria-hidden="true" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2">
                  Header
                </p>
                <p className="text-xs text-white/80 font-mono break-words">
                  Authorization: Bearer {reveal.apiKey}
                </p>
                <p className="text-xs text-white/40 mt-2">
                  Prefix: <span className="font-mono text-white/70">{reveal.keyPrefix}</span> •
                  Tier: <span className="text-white/70">{formatTier(reveal.tier)}</span> • Rate
                  limit: <span className="text-white/70">{formatRateLimit(reveal.rateLimit)}</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/60">No key to display.</p>
          )}

          <DialogFooter>
            <p className="text-xs text-white/40 mr-auto">
              Store this key safely. If you lose it, create a new one.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirm modal */}
      <Dialog
        open={revokeOpen}
        onOpenChange={(open) => {
          setRevokeOpen(open)
          if (!open) {
            setRevokeTarget(null)
            setRevokeError(null)
          }
        }}
      >
        <DialogContent
          className="bg-[#111111] border border-white/20 text-white max-w-md"
          data-testid="api-key-revoke-dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-light text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-white/70" aria-hidden="true" />
              Revoke API key
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Revoking disables this key immediately. You can’t undo this.
            </DialogDescription>
          </DialogHeader>

          {revokeTarget && (
            <div className="p-3 bg-[#0a0a0a] border border-white/10 rounded-lg">
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2">
                Target
              </p>
              <p className="text-sm text-white/80">
                {revokeTarget.name?.trim() ? revokeTarget.name : 'Unnamed key'}{' '}
                <span className="text-xs text-white/40 font-mono">({revokeTarget.keyPrefix})</span>
              </p>
            </div>
          )}

          {revokeError && (
            <p className="text-xs text-red-400" data-testid="api-key-revoke-error">
              {revokeError}
            </p>
          )}

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setRevokeOpen(false)}
              className="inline-flex min-h-[44px] items-center justify-center px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:border-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
              data-testid="api-key-revoke-cancel"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRevoke}
              disabled={isRevoking}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 bg-red-500/15 border border-red-500/30 rounded-lg text-sm text-red-300 hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
              data-testid="api-key-revoke-confirm"
            >
              {isRevoking ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              )}
              Revoke
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardPageShell>
  )
}
