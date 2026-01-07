'use client'

import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from 'convex/react'
import { cn } from '@/lib/utils'
import { api } from '@/convex/_generated/api'
import {
  useWideEventUserEnrichment,
  useWideEventFeatureEnrichment,
  useWideEventBusinessEnrichment,
  useWideEventFrontendMetrics,
  useWideEventComponentTracking,
} from '@/lib/logging/hooks'
import {
  Activity,
  User,
  TrendingUp,
  Loader2,
  Zap,
  MessageSquare,
  Shield,
  Sparkles,
  Bot,
  Plus,
  CheckCircle2,
  ExternalLink,
  LayoutGrid,
  List,
} from 'lucide-react'
import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'
import { MeshGradientGhost } from '@/components/shared/MeshGradientGhost'
import { Achievements, StreakDisplay } from '@/components/dashboard/Achievements'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getNetworkDisplayConfig, getTransactionExplorerUrl } from '@/lib/solana/explorer'
import { OnboardingWizard } from '@/components/dashboard/OnboardingWizard'
import { UsernameOnboardingModal } from '@/components/dashboard/UsernameOnboardingModal'
import { DashboardPageSkeleton } from '@/components/ui/skeletons'
import { Progress } from '@/components/ui/progress'
import { X402PaymentTicker } from '@/components/dashboard/X402PaymentTicker'
import { VerifiedActionBar } from '@/components/dashboard/VerifiedActionBar'
import { VerificationContractCard } from '@/components/dashboard/VerificationContractCard'
import { isVerifiedSessionForWallet } from '@/lib/auth/verifiedSession'
import { StatCard } from '@/components/ui/enhanced/StatCard'
import { ActivityTimeline } from '@/components/ui/enhanced/ActivityTimeline'
import { GhostLoader } from '@/components/ui/enhanced/GhostLoader'
import { StatusBadge } from '@/components/ui/enhanced/StatusBadge'

// ─── THREE-TIER REPUTATION SYSTEM ───────────────────────────────────────────
// 1. Ghost Score - AI Agents only (shown in My Agents)
// 2. Ecto Score - Agent Developers (users who build/register agents)
// 3. Ghosthunter Score - Customers (users who verify/use agents)

// Ecto Score tier thresholds (for Agent Developers)
const ECTO_THRESHOLDS = {
  NOVICE: { min: 0, max: 2500, next: 'APPRENTICE' },
  APPRENTICE: { min: 2500, max: 5000, next: 'ARTISAN' },
  ARTISAN: { min: 5000, max: 7500, next: 'MASTER' },
  MASTER: { min: 7500, max: 9000, next: 'LEGEND' },
  LEGEND: { min: 9000, max: 10000, next: null },
} as const

// Ghosthunter Score tier thresholds (for Customers)
const GHOSTHUNTER_THRESHOLDS = {
  ROOKIE: { min: 0, max: 2500, next: 'TRACKER' },
  TRACKER: { min: 2500, max: 5000, next: 'VETERAN' },
  VETERAN: { min: 5000, max: 7500, next: 'ELITE' },
  ELITE: { min: 7500, max: 9000, next: 'LEGENDARY' },
  LEGENDARY: { min: 9000, max: 10000, next: null },
} as const

type DashboardActivityItem = {
  type?: string
  status?: string
  description: string
  timestamp: number
  transactionSignature?: string
}

type DashboardAgentItem = {
  address: string
  name?: string | null
  verificationStatus: 'verified' | 'claimed' | 'pending' | string
  ghostScore: number
  tier: string
  ghosthunterScore: number | null
  ghosthunterTier?: string | null
}

function getEctoTierProgress(
  score: number,
  tier: string
): { progress: number; current: number; target: number; nextTier: string | null } {
  const tierInfo = ECTO_THRESHOLDS[tier as keyof typeof ECTO_THRESHOLDS] || ECTO_THRESHOLDS.NOVICE
  const progress =
    tierInfo.max >= 10000
      ? 100
      : Math.min(100, ((score - tierInfo.min) / (tierInfo.max - tierInfo.min)) * 100)
  return {
    progress,
    current: score,
    target: tierInfo.max,
    nextTier: tierInfo.next,
  }
}

function getGhosthunterTierProgress(
  score: number,
  tier: string
): { progress: number; current: number; target: number; nextTier: string | null } {
  const tierInfo =
    GHOSTHUNTER_THRESHOLDS[tier as keyof typeof GHOSTHUNTER_THRESHOLDS] ||
    GHOSTHUNTER_THRESHOLDS.ROOKIE
  const progress =
    tierInfo.max >= 10000
      ? 100
      : Math.min(100, ((score - tierInfo.min) / (tierInfo.max - tierInfo.min)) * 100)
  return {
    progress,
    current: score,
    target: tierInfo.max,
    nextTier: tierInfo.next,
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

export default function DashboardPage() {
  const { publicKey, connecting } = useWallet()
  const router = useRouter()
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid')
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [activeScoreType, setActiveScoreType] = useState<'ecto' | 'ghosthunter'>('ghosthunter')
  const [showUsernameOnboarding, setShowUsernameOnboarding] = useState(false)
  const networkConfig = getNetworkDisplayConfig()

  const walletAddress = useMemo(() => publicKey ?? null, [publicKey])
  const [hasVerifiedSession, setHasVerifiedSession] = useState(false)

  // Comprehensive Wide Event Enrichment
  useWideEventUserEnrichment()
  useWideEventBusinessEnrichment('dashboard_viewing', 'user_dashboard', 'view_account_metrics')
  useWideEventFrontendMetrics()
  useWideEventComponentTracking('DashboardPage')

  // Enrich wide event with feature flags
  useWideEventFeatureEnrichment({
    dashboard: true,
    reputation_tracking: true,
  })

  // Check onboarding status
  const onboardingStatus = useQuery(
    api.onboarding.checkOnboardingStatus,
    hasVerifiedSession && publicKey ? { walletAddress: publicKey } : 'skip'
  )

  // Fetch real user dashboard data
  const dashboardData = useQuery(
    api.dashboard.getUserDashboard,
    hasVerifiedSession && publicKey ? { walletAddress: publicKey } : 'skip'
  )

  // Show username onboarding modal if needed
  useEffect(() => {
    if (onboardingStatus?.needsOnboarding && onboardingStatus?.exists) {
      setShowUsernameOnboarding(true)
    }
  }, [onboardingStatus])

  // Fetch user's agents
  const userAgents = useQuery(
    api.dashboard.getUserAgents,
    hasVerifiedSession && publicKey ? { walletAddress: publicKey } : 'skip'
  )

  // Fetch user's percentile ranking
  const _percentileData = useQuery(
    api.dashboard.getUserPercentile,
    hasVerifiedSession && publicKey ? { walletAddress: publicKey } : 'skip'
  )

  // A "verified" dashboard session means:
  // - wallet connected
  // - AND SIWS session present in localStorage (written by ConnectWalletButton)
  useEffect(() => {
    if (!walletAddress) {
      setHasVerifiedSession(false)
      return
    }

    const check = () => setHasVerifiedSession(isVerifiedSessionForWallet(walletAddress))
    check()

    // Same-tab localStorage writes do not fire the "storage" event, so poll briefly.
    const intervalId = window.setInterval(() => {
      const next = isVerifiedSessionForWallet(walletAddress)
      setHasVerifiedSession(next)
      if (next) window.clearInterval(intervalId)
    }, 500)

    return () => window.clearInterval(intervalId)
  }, [walletAddress])

  // Redirect to home if not connected.
  // Important: wallet auto-connect can take a moment during hydration/initialization.
  // Avoid bouncing users away from /dashboard while the wallet is still initializing.
  useEffect(() => {
    if (publicKey) return
    if (connecting) return

    // If a wallet was previously connected, give auto-connect a short grace period
    // before treating the user as disconnected.
    const hasRememberedWallet = (() => {
      try {
        return !!window.localStorage.getItem('walletName')
      } catch {
        return false
      }
    })()

    const redirectTimeoutMs = hasRememberedWallet ? 1500 : 500
    const timeoutId = window.setTimeout(() => {
      router.push('/')
    }, redirectTimeoutMs)

    return () => window.clearTimeout(timeoutId)
  }, [publicKey, connecting, router])

  if (!publicKey) {
    return null
  }

  // Session gating: only show dashboard tooling once the SIWS session is present.
  if (!hasVerifiedSession) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-[#0a0a0a]">
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
            <header className="flex items-center justify-between mb-6">
              <h1 id="dashboard-heading" className="text-2xl font-light text-white">
                Dashboard
              </h1>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${networkConfig.bgClass} border border-white/10`}
                aria-label={`Network: ${networkConfig.shortName}`}
              >
                <div className={`w-2 h-2 rounded-full ${networkConfig.dotClass}`} />
                <span className={`text-xs font-medium ${networkConfig.textClass}`}>
                  {networkConfig.shortName}
                </span>
              </div>
            </header>

            <div className="space-y-4">
              <VerificationContractCard className="p-6 bg-[#111111] border border-white/10 rounded-xl" />
              <p className="text-xs text-white/40 leading-relaxed">
                To continue, approve the "Sign to authenticate" request in your wallet. The
                dashboard only unlocks after your SIWS session is verified.
              </p>
            </div>
          </main>

          <Footer />
        </div>
      </TooltipProvider>
    )
  }

  // Show skeleton loading state
  if (dashboardData === undefined) {
    return <DashboardPageSkeleton />
  }

  // Handle no user data
  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="p-8 max-w-md text-center bg-[#111111] border border-white/10 rounded-xl">
          <Activity className="w-12 h-12 mx-auto mb-4 text-white/40" />
          <p className="text-lg font-medium text-white mb-2">Unable to load dashboard</p>
          <p className="text-sm text-white/60 mb-6">
            Please try refreshing the page or contact support.
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="min-h-[44px] px-6 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm hover:bg-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  const { stats, staking, recentActivity, gamification, roles, reputation } = dashboardData

  // Get the appropriate tier progress based on user role
  const ectoTierProgress = reputation?.ecto
    ? getEctoTierProgress(reputation.ecto.score, reputation.ecto.tier)
    : null
  const ghosthunterTierProgress = reputation?.ghosthunter
    ? getGhosthunterTierProgress(reputation.ghosthunter.score, reputation.ghosthunter.tier)
    : null

  // Determine primary score to show (prefer Ecto if developer, else Ghosthunter)
  const primaryScore =
    roles?.isAgentDeveloper && reputation?.ecto
      ? {
        type: 'ecto' as const,
        score: reputation.ecto.score,
        tier: reputation.ecto.tier,
        progress: ectoTierProgress,
      }
      : roles?.isCustomer && reputation?.ghosthunter
        ? {
          type: 'ghosthunter' as const,
          score: reputation.ghosthunter.score,
          tier: reputation.ghosthunter.tier,
          progress: ghosthunterTierProgress,
        }
        : null

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#0a0a0a]">
        <main
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8"
          aria-labelledby="dashboard-heading"
        >
          {/* x402 Payment Ticker */}
          <div className="mb-8">
            <X402PaymentTicker />
          </div>

          {/* Dashboard Header with Network Indicator and Streak */}
          <header className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h1 id="dashboard-heading" className="text-2xl font-light text-white">
                Dashboard
              </h1>
              {gamification?.streak && gamification.streak.days > 0 && (
                <StreakDisplay
                  days={gamification.streak.days}
                  isActive={gamification.streak.isActive}
                />
              )}
            </div>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${networkConfig.bgClass} border border-white/10`}
              aria-label={`Network: ${networkConfig.shortName}`}
            >
              <div className={`w-2 h-2 rounded-full ${networkConfig.dotClass}`} />
              <span className={`text-xs font-medium ${networkConfig.textClass}`}>
                {networkConfig.shortName}
              </span>
            </div>
          </header>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Role-Based Score Card */}
            {primaryScore && (
              <StatCard
                title={primaryScore.type === 'ecto' ? 'Ecto Score' : 'Ghosthunter Score'}
                value={formatNumber(primaryScore.score)}
                icon={TrendingUp}
                glowColor={primaryScore.type === 'ecto' ? 'lime' : 'blue'}
                subtitle={primaryScore.tier}
                trend={5.2} // Calculated trend mock for now
                trendLabel="this week"
                description={
                  primaryScore.type === 'ecto'
                    ? 'Your developer reputation based on your agents performance.'
                    : 'Your hunter reputation based on verification activity.'
                }
                onClick={() => {
                  setActiveScoreType(primaryScore.type)
                  setShowScoreModal(true)
                }}
              />
            )}

            {!primaryScore && (
              <StatCard
                title="Your Score"
                value="—"
                icon={Sparkles}
                glowColor="emerald"
                subtitle="Newcomer"
                description="Verify agents or register your own to start building reputation!"
              />
            )}

            {/* Verifications */}
            <StatCard
              title="Verifications"
              value={stats.verificationsThisMonth}
              icon={Shield}
              glowColor="emerald"
              subtitle={`${stats.freeVerificationsRemaining} free remaining`}
              trend={12}
              trendLabel="vs last month"
              description="Total credential verifications performed this month."
            />

            {/* Transactions */}
            <StatCard
              title="Transactions"
              value={stats.totalTransactions}
              icon={Activity}
              glowColor="blue"
              subtitle="Lifetime Activity"
              trend={8}
              description="Total on-chain transactions associated with your wallet."
            />

            {/* Staking */}
            <StatCard
              title={staking ? 'Staked' : 'Status'}
              value={staking ? `${(staking.amountStaked / 1_000_000).toFixed(0)}K` : 'Active'}
              icon={staking ? Zap : User}
              glowColor="purple"
              subtitle={staking ? `Tier ${staking.tier}` : 'Active User'}
              description={staking ? 'Total $GHOST tokens staked in the protocol.' : 'Active status on the GhostSpeak network.'}
            />
          </div>

          {/* Achievements Section */}
          {gamification?.achievements && gamification.achievements.length > 0 && (
            <Achievements achievements={gamification.achievements} className="mb-8" />
          )}

          {/* Main Content (feed-first, verified-only) */}
          <div className="space-y-6 mb-6">
            <VerifiedActionBar />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity (main content) */}
              <section
                role="region"
                aria-labelledby="recent-activity-heading"
                className="lg:col-span-2 p-6 bg-[#111111] border border-white/10 rounded-xl relative overflow-hidden"
              >
                {/* Floating Ghost Decoration */}
                <div className="absolute -top-4 -right-4 w-32 h-40 opacity-20 pointer-events-none">
                  <MeshGradientGhost animated={true} interactive={false} />
                </div>

                <div className="flex items-center justify-between mb-6 relative z-10">
                  <h2
                    id="recent-activity-heading"
                    className="text-lg font-light text-white flex items-center gap-2"
                  >
                    <Activity className="w-5 h-5 text-primary" />
                    Recent Activity
                  </h2>
                </div>

                <div
                  className="max-h-[400px] overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] rounded-lg p-1"
                  tabIndex={0}
                  aria-label="Recent activity"
                >
                  {recentActivity && recentActivity.length > 0 ? (
                    <ActivityTimeline
                      items={recentActivity.map((activity: any, idx: number) => ({
                        id: activity.transactionSignature || idx,
                        title: activity.description,
                        subtitle: new Date(activity.timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                        timestamp: '', // subtitle handles it better for this layout
                        type: activity.type === 'VERIFICATION' ? 'premium' :
                          activity.status === 'completed' ? 'success' :
                            activity.status === 'pending' ? 'warning' : 'error',
                        details: activity.transactionSignature ? (
                          <a
                            href={getTransactionExplorerUrl(activity.transactionSignature)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-sm text-xs text-primary/70 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View Transaction</span>
                          </a>
                        ) : undefined,
                      }))}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center relative">
                      <div className="w-24 h-28 mb-4 opacity-60">
                        <MeshGradientGhost animated={true} interactive={false} />
                      </div>
                      <p className="text-sm text-white/70 mb-2 font-medium">
                        Your journey begins here
                      </p>
                      <p className="text-xs text-white/40 mb-6 max-w-[200px] leading-relaxed">
                        Chat with Caisper or register an agent to start building reputation.
                      </p>
                      <div className="flex flex-col gap-2 w-full max-w-[200px]">
                        <button
                          type="button"
                          onClick={() => router.push('/caisper')}
                          className="w-full min-h-[44px] px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg text-xs text-primary hover:bg-primary/20 transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Chat with Caisper
                        </button>
                        <Link
                          href="/agents/register"
                          className="w-full min-h-[44px] px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white/80 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Register Agent
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Verification Contract */}
              <VerificationContractCard />
            </div>
          </div>

          {/* My Agents Section */}
          <div className="p-6 bg-[#111111] border border-white/10 rounded-2xl mb-8 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">My Registered Agents</h2>
                  {userAgents?.agents && (
                    <p className="text-xs text-white/40 mt-0.5">{userAgents.agents.length} agents discovered</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex bg-white/5 border border-white/10 rounded-lg p-1">
                  <button
                    onClick={() => setViewType('grid')}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      viewType === 'grid' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                    )}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewType('list')}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      viewType === 'list' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                    )}
                    aria-label="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <Link
                  href="/agents/register"
                  className="flex min-h-[44px] items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg text-sm font-bold hover:bg-primary/90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                >
                  <Plus className="w-4 h-4" />
                  Register Agent
                </Link>
              </div>
            </div>

            {userAgents === undefined ? (
              <GhostLoader variant="list" count={3} />
            ) : userAgents && userAgents.agents.length > 0 ? (
              <div className={cn(
                "gap-4",
                viewType === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col"
              )}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {userAgents.agents.map((agent: DashboardAgentItem) => (
                    <motion.div
                      layout
                      key={agent.address}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Link
                        href={`/agents/${agent.address}`}
                        className={cn(
                          "group h-full relative block bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all duration-300",
                          viewType === 'grid' ? "p-5" : "p-4 flex items-center justify-between gap-4"
                        )}
                      >
                        <div className={cn(
                          "flex gap-4",
                          viewType === 'grid' ? "flex-col" : "items-center flex-1"
                        )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                              <Bot className="w-5 h-5 text-white/40 group-hover:text-primary transition-colors" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate max-w-[150px]">
                                {agent.name || 'Unnamed Agent'}
                              </p>
                              <p className="text-[10px] text-white/30 font-mono tracking-widest uppercase">
                                {formatAddress(agent.address)}
                              </p>
                            </div>
                          </div>

                          <div className={cn(
                            "flex items-center gap-3",
                            viewType === 'grid' ? "justify-between" : "ml-auto"
                          )}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] uppercase font-bold text-white/20 tracking-widest">Ghost Score</span>
                              <span className="text-sm font-bold text-primary font-mono">{formatNumber(agent.ghostScore)}</span>
                            </div>
                            <StatusBadge
                              label={agent.verificationStatus}
                              variant={agent.verificationStatus === 'verified' ? 'premium' :
                                agent.verificationStatus === 'claimed' ? 'info' : 'neutral'}
                            />
                          </div>
                        </div>

                        {viewType === 'grid' && (
                          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                            <div className="flex -space-x-2">
                              {/* Decorative visual for reputation peers if available */}
                              {[1, 2, 3].map(i => (
                                <div key={i} className="w-5 h-5 rounded-full border border-[#111111] bg-white/5 flex items-center justify-center">
                                  <User className="w-2.5 h-2.5 text-white/20" />
                                </div>
                              ))}
                            </div>
                            <div className="text-[10px] font-bold text-white/40 group-hover:text-primary mb-0 transition-colors uppercase tracking-widest">
                              View Profile →
                            </div>
                          </div>
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                  <Bot className="w-10 h-10 text-white/10" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No agents registered</h3>
                <p className="text-sm text-white/40 max-w-sm mb-8">
                  Register your AI agent to start building its on-chain reputation and verified identity.
                </p>
                <Link
                  href="/agents/register"
                  className="min-h-[44px] px-8 py-2 bg-primary text-black rounded-lg text-sm font-bold hover:bg-primary/90 transition-all"
                >
                  Register your first agent
                </Link>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Score Breakdown Modal - Shows Ecto or Ghosthunter based on activeScoreType */}
      <Dialog open={showScoreModal} onOpenChange={setShowScoreModal}>
        <DialogContent className="bg-[#111111] border border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-light text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {activeScoreType === 'ecto' ? 'Ecto Score Breakdown' : 'Ghosthunter Score Breakdown'}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {activeScoreType === 'ecto'
                ? 'Your developer reputation is calculated based on your agents and their performance.'
                : 'Your hunter reputation is calculated based on your verification and evaluation activity.'}
            </DialogDescription>
          </DialogHeader>

          {/* Score Type Tabs */}
          {roles?.isAgentDeveloper && roles?.isCustomer && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setActiveScoreType('ecto')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeScoreType === 'ecto'
                  ? 'bg-primary/20 border border-primary/40 text-primary'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                  }`}
              >
                Ecto (Developer)
              </button>
              <button
                onClick={() => setActiveScoreType('ghosthunter')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeScoreType === 'ghosthunter'
                  ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                  }`}
              >
                Ghosthunter
              </button>
            </div>
          )}

          <div className="space-y-4 mt-4">
            {/* Current Score */}
            <div
              className={`p-4 rounded-lg text-center ${activeScoreType === 'ecto'
                ? 'bg-primary/10 border border-primary/20'
                : 'bg-blue-500/10 border border-blue-500/20'
                }`}
            >
              <p
                className={`text-5xl font-light mb-1 ${activeScoreType === 'ecto' ? 'text-primary' : 'text-blue-400'
                  }`}
              >
                {activeScoreType === 'ecto'
                  ? formatNumber(reputation?.ecto?.score || 0)
                  : formatNumber(reputation?.ghosthunter?.score || 0)}
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <p className="text-sm text-white/60">
                  {activeScoreType === 'ecto'
                    ? reputation?.ecto?.tier || 'NOVICE'
                    : reputation?.ghosthunter?.tier || 'ROOKIE'}
                </p>
                <div
                  className={`px-2 py-0.5 rounded text-xs ${activeScoreType === 'ecto'
                    ? 'bg-primary/20 text-primary'
                    : 'bg-blue-500/20 text-blue-400'
                    }`}
                >
                  {activeScoreType === 'ecto' ? 'Developer' : 'Hunter'}
                </div>
              </div>
            </div>

            {/* Score Components */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/80 uppercase tracking-wider">
                Score Components
              </h4>

              {activeScoreType === 'ecto' ? (
                <>
                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bot className="w-4 h-4 text-white/60" />
                      <span className="text-sm text-white/80">Agents Registered</span>
                    </div>
                    <span className="text-sm text-white font-medium">
                      {reputation?.ecto?.agentsRegistered || 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-white/60" />
                      <span className="text-sm text-white/80">Agent Quality Bonus</span>
                    </div>
                    <span className="text-sm text-white font-medium">Based on Ghost Scores</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="w-4 h-4 text-white/60" />
                      <span className="text-sm text-white/80">Staking Bonus</span>
                    </div>
                    <span className="text-sm text-white font-medium">
                      {staking ? `+${(staking.reputationBoostBps / 100).toFixed(0)}%` : '+0%'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-white/60" />
                      <span className="text-sm text-white/80">Verifications</span>
                    </div>
                    <span className="text-sm text-white font-medium">
                      {stats.totalVerifications}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="w-4 h-4 text-white/60" />
                      <span className="text-sm text-white/80">Transactions</span>
                    </div>
                    <span className="text-sm text-white font-medium">
                      {stats.totalTransactions}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-white/60" />
                      <span className="text-sm text-white/80">Reviews Written</span>
                    </div>
                    <span className="text-sm text-white font-medium">Coming soon</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="w-4 h-4 text-white/60" />
                      <span className="text-sm text-white/80">Staking Bonus</span>
                    </div>
                    <span className="text-sm text-white font-medium">
                      {staking ? `+${(staking.reputationBoostBps / 100).toFixed(0)}%` : '+0%'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Progress to Next Tier */}
            <div className="pt-4 border-t border-white/10">
              {activeScoreType === 'ecto' && ectoTierProgress?.nextTier ? (
                <div className="space-y-2">
                  <Progress value={ectoTierProgress.progress} className="h-1.5" />
                  <p className="text-xs text-white/40">
                    {formatNumber(ectoTierProgress.current)} /{' '}
                    {formatNumber(ectoTierProgress.target)} to {ectoTierProgress.nextTier}
                  </p>
                </div>
              ) : activeScoreType === 'ghosthunter' && ghosthunterTierProgress?.nextTier ? (
                <div className="space-y-2">
                  <Progress value={ghosthunterTierProgress.progress} className="h-1.5" />
                  <p className="text-xs text-white/40">
                    {formatNumber(ghosthunterTierProgress.current)} /{' '}
                    {formatNumber(ghosthunterTierProgress.target)} to{' '}
                    {ghosthunterTierProgress.nextTier}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-primary/60">Max tier achieved!</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Username Onboarding Modal - must complete before seeing dashboard */}
      {showUsernameOnboarding && publicKey && (
        <UsernameOnboardingModal
          walletAddress={publicKey}
          onComplete={() => {
            setShowUsernameOnboarding(false)
            // Dashboard data will auto-refresh via Convex reactivity
          }}
        />
      )}

      {/* Onboarding Wizard for new users (explains Ghost Score) - only after username is set */}
      {!showUsernameOnboarding && (
        <OnboardingWizard
          ghostScore={primaryScore?.score || 0}
          hasActivity={recentActivity && recentActivity.length > 0}
        />
      )}
    </TooltipProvider>
  )
}
