'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { TechCard, TechMetric, TechButton, TechBadge } from '@prompt-or-die/tech-ui'
import { Activity, User, Wallet, TrendingUp, Loader2, Zap } from 'lucide-react'

export default function DashboardPage() {
  const { publicKey } = useWallet()
  const router = useRouter()

  // Fetch real user dashboard data
  const dashboardData = useQuery(
    api.dashboard.getUserDashboard,
    publicKey ? { walletAddress: publicKey.toBase58() } : 'skip'
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

  // Show loading state
  if (dashboardData === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-foreground font-mono">LOADING_DASHBOARD...</span>
        </div>
      </div>
    )
  }

  // Handle no user data (shouldn't happen after authentication)
  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground font-mono mb-4">ERROR_LOADING_DASHBOARD</p>
          <TechButton onClick={() => router.push('/')}>RETURN_HOME</TechButton>
        </div>
      </div>
    )
  }

  const { stats, staking, recentActivity } = dashboardData

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-mono font-bold text-foreground">
              GHOST<span className="text-primary">SPEAK</span>_DASHBOARD
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <TechBadge variant="success" className="border-primary/50">
                ONLINE
              </TechBadge>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
            <Wallet className="w-4 h-4" />
            <span>{formatAddress(publicKey.toBase58())}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Ghost Score */}
          <TechCard className="p-6 border-primary/30 bg-card/50 backdrop-blur">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-1">GHOST_SCORE</p>
                <p className="text-3xl font-mono font-bold text-primary">{stats.ghostScore}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
            <TechMetric
              label="TIER"
              value={stats.tier}
              status={stats.tier === 'NEWCOMER' ? 'info' : stats.tier === 'BRONZE' ? 'warning' : 'success'}
              className="text-xs"
            />
          </TechCard>

          {/* Verifications */}
          <TechCard className="p-6 border-primary/30 bg-card/50 backdrop-blur">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-1">VERIFICATIONS</p>
                <p className="text-3xl font-mono font-bold text-foreground">{stats.verificationsThisMonth}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {stats.freeVerificationsRemaining} FREE REMAINING
            </p>
          </TechCard>

          {/* Transactions */}
          <TechCard className="p-6 border-primary/30 bg-card/50 backdrop-blur">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-1">TRANSACTIONS</p>
                <p className="text-3xl font-mono font-bold text-foreground">{stats.totalTransactions}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              LIFETIME TOTAL
            </p>
          </TechCard>

          {/* Staking Status */}
          <TechCard className="p-6 border-primary/30 bg-card/50 backdrop-blur">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-1">
                  {staking ? 'STAKING' : 'ACCOUNT'}
                </p>
                <p className="text-3xl font-mono font-bold text-foreground">
                  {staking ? `${(staking.amountStaked / 1_000_000).toFixed(0)}K` : '●'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                {staking ? <Zap className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-primary" />}
              </div>
            </div>
            <TechBadge
              variant={staking ? 'success' : 'warning'}
              className="border-primary/50 text-xs"
            >
              {staking ? `TIER ${staking.tier} STAKER` : 'ACTIVE'}
            </TechBadge>
          </TechCard>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <TechCard className="p-6 border-primary/30 bg-card/50 backdrop-blur">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-mono font-bold text-foreground">
                  QUICK_ACTIONS
                </h2>
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TechButton
                  variant="primary"
                  className="w-full justify-start"
                  onClick={() => router.push('/caisper')}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  CHAT_WITH_CAISPER
                </TechButton>
                <TechButton variant="secondary" className="w-full justify-start">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  VIEW_GHOST_SCORE
                </TechButton>
                <TechButton variant="secondary" className="w-full justify-start">
                  <Wallet className="w-4 h-4 mr-2" />
                  MANAGE_PAYMENTS
                </TechButton>
                <TechButton variant="secondary" className="w-full justify-start">
                  <User className="w-4 h-4 mr-2" />
                  PROFILE_SETTINGS
                </TechButton>
              </div>
            </TechCard>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <TechCard className="p-6 border-primary/30 bg-card/50 backdrop-blur">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-mono font-bold text-foreground">
                  ACTIVITY_LOG
                </h2>
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {recentActivity && recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                    >
                      <div className={`w-2 h-2 mt-1.5 rounded-full ${
                        activity.type === 'VERIFICATION' ? 'bg-primary' :
                        activity.status === 'completed' ? 'bg-green-500' :
                        activity.status === 'pending' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-xs font-mono text-foreground mb-1">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 opacity-50">
                    <div className="w-2 h-2 mt-1.5 bg-muted-foreground rounded-full" />
                    <div className="flex-1">
                      <p className="text-xs font-mono text-muted-foreground mb-1">
                        NO_ACTIVITY_YET
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Start by verifying your first agent
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TechCard>
          </div>
        </div>

        {/* Welcome/Status Message */}
        <div className="mt-6">
          <TechCard className="p-8 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent backdrop-blur">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/20">
                {stats.ghostScore === 0 ? (
                  <Activity className="w-6 h-6 text-primary" />
                ) : (
                  <TrendingUp className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-mono font-bold text-foreground mb-2">
                  {stats.ghostScore === 0
                    ? 'WELCOME_TO_GHOSTSPEAK'
                    : `GHOST_SCORE_${stats.tier}`}
                </h3>
                <p className="text-sm text-muted-foreground font-mono mb-4 leading-relaxed">
                  {stats.ghostScore === 0
                    ? 'Your decentralized reputation system for AI agents is now active. Start building your Ghost Score by verifying agents or making your first transaction.'
                    : staking
                    ? `You're a Tier ${staking.tier} staker with ${(staking.reputationBoostBps / 100).toFixed(1)}% reputation boost. Keep building your reputation to unlock higher tiers and premium benefits.`
                    : `You have ${stats.freeVerificationsRemaining} free verifications remaining this month. Stake GHOST tokens to unlock unlimited verifications and revenue sharing.`}
                </p>
                <div className="flex gap-3">
                  {stats.ghostScore === 0 ? (
                    <>
                      <TechButton variant="primary" size="sm">
                        VERIFY_FIRST_AGENT
                      </TechButton>
                      <TechButton variant="outline" size="sm">
                        LEARN_MORE
                      </TechButton>
                    </>
                  ) : (
                    <>
                      {!staking && (
                        <TechButton variant="primary" size="sm">
                          STAKE_GHOST
                        </TechButton>
                      )}
                      <TechButton variant="outline" size="sm">
                        VIEW_FULL_SCORE
                      </TechButton>
                    </>
                  )}
                </div>
              </div>
            </div>
          </TechCard>
        </div>
      </div>
    </div>
  )
}
