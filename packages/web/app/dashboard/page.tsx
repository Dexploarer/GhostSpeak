'use client'

import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Activity,
  User,
  Wallet,
  TrendingUp,
  Loader2,
  Zap,
  MessageSquare,
  Settings,
  DollarSign,
  Shield,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Clock,
  Info,
  Bot,
  Plus,
  CheckCircle2,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'
import { MeshGradientGhost } from '@/components/shared/MeshGradientGhost'
import { Achievements, StreakDisplay, PercentileDisplay } from '@/components/dashboard/Achievements'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getNetworkDisplayConfig, getTransactionExplorerUrl } from '@/lib/solana/explorer'
import { OnboardingWizard } from '@/components/dashboard/OnboardingWizard'
import { UsernameOnboardingModal } from '@/components/dashboard/UsernameOnboardingModal'
import { DashboardPageSkeleton } from '@/components/ui/skeletons'
import { Progress } from '@/components/ui/progress'

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

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Good night'
}

function getEctoTierProgress(score: number, tier: string): { progress: number; current: number; target: number; nextTier: string | null } {
  const tierInfo = ECTO_THRESHOLDS[tier as keyof typeof ECTO_THRESHOLDS] || ECTO_THRESHOLDS.NOVICE
  const progress = tierInfo.max >= 10000
    ? 100
    : Math.min(100, ((score - tierInfo.min) / (tierInfo.max - tierInfo.min)) * 100)
  return {
    progress,
    current: score,
    target: tierInfo.max,
    nextTier: tierInfo.next
  }
}

function getGhosthunterTierProgress(score: number, tier: string): { progress: number; current: number; target: number; nextTier: string | null } {
  const tierInfo = GHOSTHUNTER_THRESHOLDS[tier as keyof typeof GHOSTHUNTER_THRESHOLDS] || GHOSTHUNTER_THRESHOLDS.ROOKIE
  const progress = tierInfo.max >= 10000
    ? 100
    : Math.min(100, ((score - tierInfo.min) / (tierInfo.max - tierInfo.min)) * 100)
  return {
    progress,
    current: score,
    target: tierInfo.max,
    nextTier: tierInfo.next
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

export default function DashboardPage() {
  const { publicKey, network } = useWallet()
  const router = useRouter()
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [activeScoreType, setActiveScoreType] = useState<'ecto' | 'ghosthunter'>('ghosthunter')
  const [showUsernameOnboarding, setShowUsernameOnboarding] = useState(false)
  const networkConfig = getNetworkDisplayConfig()

  // Get greeting and formatted address
  const greeting = useMemo(() => getTimeBasedGreeting(), [])
  const shortAddress = useMemo(() => {
    if (!publicKey) return ''
    return `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
  }, [publicKey])

  // Check onboarding status
  const onboardingStatus = useQuery(
    api.onboarding.checkOnboardingStatus,
    publicKey ? { walletAddress: publicKey } : 'skip'
  )

  // Fetch real user dashboard data
  const dashboardData = useQuery(
    api.dashboard.getUserDashboard,
    publicKey ? { walletAddress: publicKey } : 'skip'
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
    publicKey ? { walletAddress: publicKey } : 'skip'
  )

  // Fetch user's percentile ranking
  const percentileData = useQuery(
    api.dashboard.getUserPercentile,
    publicKey ? { walletAddress: publicKey } : 'skip'
  )

  // Redirect to home if not connected
  useEffect(() => {
    if (!publicKey) {
      router.push('/')
    }
  }, [publicKey, router])

  if (!publicKey) {
    return null
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
          <p className="text-sm text-white/60 mb-6">Please try refreshing the page or contact support.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm hover:bg-white/20 transition-all"
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
  const primaryScore = roles?.isAgentDeveloper && reputation?.ecto
    ? { type: 'ecto' as const, score: reputation.ecto.score, tier: reputation.ecto.tier, progress: ectoTierProgress }
    : roles?.isCustomer && reputation?.ghosthunter
    ? { type: 'ghosthunter' as const, score: reputation.ghosthunter.score, tier: reputation.ghosthunter.tier, progress: ghosthunterTierProgress }
    : null

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">

        {/* Dashboard Header with Network Indicator and Streak */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-light text-white">Dashboard</h1>
            {gamification?.streak && gamification.streak.days > 0 && (
              <StreakDisplay
                days={gamification.streak.days}
                isActive={gamification.streak.isActive}
              />
            )}
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${networkConfig.bgClass} border border-white/10`}>
            <div className={`w-2 h-2 rounded-full ${networkConfig.dotClass}`} />
            <span className={`text-xs font-medium ${networkConfig.textClass}`}>
              {networkConfig.shortName}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          {/* Role-Based Score Card - Shows Ecto (Developer) or Ghosthunter (Customer) */}
          {primaryScore ? (
            <button
              onClick={() => {
                setActiveScoreType(primaryScore.type)
                setShowScoreModal(true)
              }}
              className="group p-6 bg-[#111111] border border-white/10 rounded-xl hover:border-primary/40 transition-all text-left w-full cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <p className="text-xs text-white/40 mb-2 uppercase tracking-wider font-medium flex items-center gap-1.5">
                    {primaryScore.type === 'ecto' ? 'Ecto Score' : 'Ghosthunter Score'}
                    <Info className="w-3 h-3 text-white/30" />
                  </p>
                  <p className="text-4xl font-light text-primary">
                    {formatNumber(primaryScore.score)}
                  </p>
                </div>
                <div className="p-2.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-all">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-white/80">
                  {primaryScore.tier}
                </div>
                {primaryScore.type === 'ecto' && roles?.isAgentDeveloper && (
                  <div className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-xs text-primary">
                    Developer
                  </div>
                )}
                {primaryScore.type === 'ghosthunter' && roles?.isCustomer && (
                  <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400">
                    Hunter
                  </div>
                )}
              </div>
              {/* Progress bar to next tier */}
              {primaryScore.progress?.nextTier ? (
                <div className="space-y-1.5">
                  <Progress value={primaryScore.progress.progress} className="h-1.5" />
                  <p className="text-xs text-white/40">
                    {formatNumber(primaryScore.progress.current)} / {formatNumber(primaryScore.progress.target)} to {primaryScore.progress.nextTier}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-primary/60">Max tier achieved!</p>
              )}
            </button>
          ) : (
            // New user - show welcome card instead
            <div className="group p-6 bg-[#111111] border border-white/10 rounded-xl">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <p className="text-xs text-white/40 mb-2 uppercase tracking-wider font-medium">
                    Your Score
                  </p>
                  <p className="text-4xl font-light text-white/40">
                    —
                  </p>
                </div>
                <div className="p-2.5 bg-white/5 rounded-lg">
                  <Sparkles className="w-5 h-5 text-white/40" />
                </div>
              </div>
              <p className="text-xs text-white/40">
                Verify agents or register your own to start building reputation!
              </p>
            </div>
          )}

          {/* Verifications */}
          <div className="group p-6 bg-[#111111] border border-white/10 rounded-xl hover:border-white/20 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <p className="text-xs text-white/40 mb-2 uppercase tracking-wider font-medium">Verifications</p>
                <p className="text-4xl font-light text-white">
                  {stats.verificationsThisMonth}
                </p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-lg group-hover:bg-white/10 transition-all">
                <Shield className="w-5 h-5 text-white/60" />
              </div>
            </div>
            <p className="text-xs text-white/40">
              {stats.freeVerificationsRemaining} free remaining
            </p>
          </div>

          {/* Transactions */}
          <div className="group p-6 bg-[#111111] border border-white/10 rounded-xl hover:border-white/20 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <p className="text-xs text-white/40 mb-2 uppercase tracking-wider font-medium">Transactions</p>
                <p className="text-4xl font-light text-white">
                  {stats.totalTransactions}
                </p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-lg group-hover:bg-white/10 transition-all">
                <Activity className="w-5 h-5 text-white/60" />
              </div>
            </div>
            <p className="text-xs text-white/40">
              Lifetime activity
            </p>
          </div>

          {/* Staking */}
          <div className="group p-6 bg-[#111111] border border-white/10 rounded-xl hover:border-white/20 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <p className="text-xs text-white/40 mb-2 uppercase tracking-wider font-medium">
                  {staking ? 'Staked' : 'Status'}
                </p>
                <p className="text-4xl font-light text-white">
                  {staking ? `${(staking.amountStaked / 1_000_000).toFixed(0)}K` : '—'}
                </p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-lg group-hover:bg-white/10 transition-all">
                {staking ? (
                  <Zap className="w-5 h-5 text-white/60" />
                ) : (
                  <User className="w-5 h-5 text-white/60" />
                )}
              </div>
            </div>
            <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-white/80 inline-block">
              {staking ? `Tier ${staking.tier}` : 'Active User'}
            </div>
          </div>
        </div>

        {/* Achievements Section */}
        {gamification?.achievements && gamification.achievements.length > 0 && (
          <Achievements
            achievements={gamification.achievements}
            className="mb-8"
          />
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* Quick Actions */}
          <div className="lg:col-span-2 p-6 bg-[#111111] border border-white/10 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-light text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Quick Actions
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Chat with Caisper */}
              <button
                onClick={() => router.push('/caisper')}
                className="group w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-primary/40 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg group-hover:bg-primary/10 transition-all">
                    <MessageSquare className="w-5 h-5 text-white/60 group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Chat with Caisper</p>
                    <p className="text-xs text-white/40">AI assistant</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* View Score Breakdown */}
              <button
                onClick={() => setShowScoreModal(true)}
                className="group w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-primary/40 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg group-hover:bg-primary/10 transition-all">
                    <TrendingUp className="w-5 h-5 text-white/60 group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">View Score Breakdown</p>
                    <p className="text-xs text-white/40">Track your reputation</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Manage Payments - Coming Soon */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="group w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg opacity-60 cursor-not-allowed text-left relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <DollarSign className="w-5 h-5 text-white/40" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white/60 flex items-center gap-2">
                          Manage Payments
                          <span className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-[10px] text-white/50 uppercase tracking-wider">Soon</span>
                        </p>
                        <p className="text-xs text-white/30">Transaction history</p>
                      </div>
                    </div>
                    <Clock className="w-4 h-4 text-white/30" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-[#1a1a1a] border border-white/20 text-white">
                  <p>Payment management coming soon</p>
                </TooltipContent>
              </Tooltip>

              {/* Profile Settings */}
              <button
                onClick={() => router.push('/settings')}
                className="group w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-all">
                    <Settings className="w-5 h-5 text-white/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Profile Settings</p>
                    <p className="text-xs text-white/40">Customize account</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="p-6 bg-[#111111] border border-white/10 rounded-xl relative overflow-hidden">
            {/* Floating Ghost Decoration */}
            <div className="absolute -top-4 -right-4 w-32 h-40 opacity-20 pointer-events-none">
              <MeshGradientGhost animated={true} interactive={false} />
            </div>

            <div className="flex items-center justify-between mb-6 relative z-10">
              <h2 className="text-lg font-light text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Recent Activity
              </h2>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
                  >
                    <div className={`w-1.5 h-1.5 mt-2 rounded-full shrink-0 ${
                      activity.type === 'VERIFICATION' ? 'bg-primary' :
                      activity.status === 'completed' ? 'bg-green-500' :
                      activity.status === 'pending' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white mb-1 line-clamp-2">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-white/40">
                          {new Date(activity.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {activity.transactionSignature && (
                          <a
                            href={getTransactionExplorerUrl(activity.transactionSignature)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View tx</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                /* Enhanced empty state with ghost illustration and quick actions */
                <div className="flex flex-col items-center justify-center py-8 text-center relative">
                  {/* Animated ghost illustration */}
                  <div className="w-24 h-28 mb-4 opacity-60">
                    <MeshGradientGhost animated={true} interactive={false} />
                  </div>
                  <p className="text-sm text-white/70 mb-2 font-medium">Your journey begins here</p>
                  <p className="text-xs text-white/40 mb-4 max-w-[200px] leading-relaxed">
                    Verify an agent or chat with Caisper to start building reputation.
                  </p>
                  {/* Quick action buttons in empty state */}
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      onClick={() => router.push('/caisper')}
                      className="w-full px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg text-xs text-primary hover:bg-primary/20 transition-all flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Chat with Caisper
                    </button>
                    <button className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white/60 hover:bg-white/10 hover:text-white/80 transition-all flex items-center justify-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      Verify an Agent
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* My Agents Section */}
        <div className="p-6 bg-[#111111] border border-white/10 rounded-xl mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-light text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              My Agents
            </h2>
            <Link
              href="/agents/register"
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary hover:bg-primary/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Register Agent
            </Link>
          </div>

          {userAgents === undefined ? (
            // Loading state
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white/40" />
            </div>
          ) : userAgents && userAgents.agents.length > 0 ? (
            // Agents list
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userAgents.agents.map((agent) => (
                <Link
                  key={agent.address}
                  href={`/agents/${agent.address}`}
                  className="block group p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <Bot className="w-4 h-4 text-white/60" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white font-mono">
                          {formatAddress(agent.address)}
                        </p>
                        {agent.name && (
                          <p className="text-xs text-white/40">{agent.name}</p>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                      agent.verificationStatus === 'verified'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : agent.verificationStatus === 'claimed'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-white/5 text-white/40 border border-white/10'
                    }`}>
                      {agent.verificationStatus === 'verified' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : agent.verificationStatus === 'claimed' ? (
                        <Shield className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span className="capitalize">{agent.verificationStatus}</span>
                    </div>
                  </div>
                  {/* Ghost Score (agent's own reputation) */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40">Ghost Score:</span>
                      <span className="text-sm font-medium text-primary">{formatNumber(agent.ghostScore)}</span>
                    </div>
                    <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-white/60">
                      {agent.tier}
                    </div>
                  </div>
                  {/* Ghosthunter Score (if agent verifies other agents) */}
                  {agent.ghosthunterScore !== null && agent.ghosthunterScore > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">Ghosthunter:</span>
                        <span className="text-sm font-medium text-blue-400">{formatNumber(agent.ghosthunterScore)}</span>
                      </div>
                      <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400">
                        {agent.ghosthunterTier}
                      </div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            // Empty state
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-white/5 rounded-full mb-4">
                <Bot className="w-10 h-10 text-white/20" />
              </div>
              <p className="text-sm text-white/60 mb-2">No agents yet</p>
              <p className="text-xs text-white/40 mb-6 max-w-sm">
                Register your first AI agent to build reputation and unlock the full potential of GhostSpeak.
              </p>
              <Link
                href="/agents/register"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-all"
              >
                <Plus className="w-4 h-4" />
                Register Agent
              </Link>
            </div>
          )}
        </div>

        {/* Status Banner */}
        <div className="p-6 bg-[#111111] border border-white/10 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg shrink-0">
              {!primaryScore ? (
                <Sparkles className="w-6 h-6 text-primary" />
              ) : (
                <TrendingUp className="w-6 h-6 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-light text-white mb-2">
                {!primaryScore
                  ? `${greeting}, ${shortAddress}`
                  : primaryScore.type === 'ecto'
                  ? `${primaryScore.tier} Developer`
                  : `${primaryScore.tier} Hunter`}
              </h3>
              <p className="text-sm text-white/60 mb-4 leading-relaxed max-w-3xl">
                {!primaryScore
                  ? 'Welcome to GhostSpeak! Your decentralized reputation system for AI agents is now active. Start building your reputation by verifying agents (Ghosthunter) or registering your own AI agents (Developer).'
                  : staking
                  ? `You're a Tier ${staking.tier} staker with a ${(staking.reputationBoostBps / 100).toFixed(1)}% reputation boost. Keep building your reputation to unlock higher tiers and premium benefits.`
                  : roles?.isAgentDeveloper && roles?.isCustomer
                  ? `You're both a Developer (Ecto Score: ${formatNumber(reputation?.ecto?.score || 0)}) and a Hunter (Ghosthunter: ${formatNumber(reputation?.ghosthunter?.score || 0)}). Keep building on both fronts!`
                  : roles?.isAgentDeveloper
                  ? `You've registered ${reputation?.ecto?.agentsRegistered || 0} agent(s). Keep building quality agents to increase your Ecto Score!`
                  : `You have ${stats.freeVerificationsRemaining} free verifications remaining this month. Verify more agents to increase your Ghosthunter Score!`}
              </p>
              <div className="flex flex-wrap gap-3">
                {!primaryScore ? (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="px-4 py-2 bg-primary/50 text-black/60 rounded-lg text-sm font-medium cursor-not-allowed flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Verify First Agent
                          <Clock className="w-3 h-3 ml-1" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-[#1a1a1a] border border-white/20 text-white">
                        <p>Agent verification coming soon</p>
                      </TooltipContent>
                    </Tooltip>
                    <Link
                      href="/agents/register"
                      className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Register Agent
                    </Link>
                  </>
                ) : (
                  <>
                    {!staking && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="px-4 py-2 bg-primary/50 text-black/60 rounded-lg text-sm font-medium cursor-not-allowed flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Stake GHOST
                            <Clock className="w-3 h-3 ml-1" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-[#1a1a1a] border border-white/20 text-white">
                          <p>Staking coming soon</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <button
                      onClick={() => setShowScoreModal(true)}
                      className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg text-sm hover:bg-white/20 transition-all"
                    >
                      View Score Breakdown
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeScoreType === 'ecto'
                  ? 'bg-primary/20 border border-primary/40 text-primary'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              Ecto (Developer)
            </button>
            <button
              onClick={() => setActiveScoreType('ghosthunter')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeScoreType === 'ghosthunter'
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
          <div className={`p-4 rounded-lg text-center ${
            activeScoreType === 'ecto'
              ? 'bg-primary/10 border border-primary/20'
              : 'bg-blue-500/10 border border-blue-500/20'
          }`}>
            <p className={`text-5xl font-light mb-1 ${
              activeScoreType === 'ecto' ? 'text-primary' : 'text-blue-400'
            }`}>
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
              <div className={`px-2 py-0.5 rounded text-xs ${
                activeScoreType === 'ecto'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {activeScoreType === 'ecto' ? 'Developer' : 'Hunter'}
              </div>
            </div>
          </div>

          {/* Score Components */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white/80 uppercase tracking-wider">Score Components</h4>

            {activeScoreType === 'ecto' ? (
              <>
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bot className="w-4 h-4 text-white/60" />
                    <span className="text-sm text-white/80">Agents Registered</span>
                  </div>
                  <span className="text-sm text-white font-medium">{reputation?.ecto?.agentsRegistered || 0}</span>
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
                  <span className="text-sm text-white font-medium">{stats.totalVerifications}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-white/60" />
                    <span className="text-sm text-white/80">Transactions</span>
                  </div>
                  <span className="text-sm text-white font-medium">{stats.totalTransactions}</span>
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
                  {formatNumber(ectoTierProgress.current)} / {formatNumber(ectoTierProgress.target)} to {ectoTierProgress.nextTier}
                </p>
              </div>
            ) : activeScoreType === 'ghosthunter' && ghosthunterTierProgress?.nextTier ? (
              <div className="space-y-2">
                <Progress value={ghosthunterTierProgress.progress} className="h-1.5" />
                <p className="text-xs text-white/40">
                  {formatNumber(ghosthunterTierProgress.current)} / {formatNumber(ghosthunterTierProgress.target)} to {ghosthunterTierProgress.nextTier}
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
