'use client'

import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
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
  ChevronRight
} from 'lucide-react'
import { Footer } from '@/components/layout/Footer'
import { MeshGradientGhost } from '@/components/shared/MeshGradientGhost'

export default function DashboardPage() {
  const { publicKey } = useWallet()
  const router = useRouter()

  // Fetch real user dashboard data
  const dashboardData = useQuery(
    api.dashboard.getUserDashboard,
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

  // Show loading state
  if (dashboardData === undefined) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-white/60">Loading dashboard...</p>
        </div>
      </div>
    )
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

  const { stats, staking, recentActivity } = dashboardData

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">

        {/* Header - Minimal */}
        <div className="mb-8">
          {/* Removed redundant header content - wallet info is in navigation */}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          {/* Ghost Score */}
          <div className="group p-6 bg-[#111111] border border-white/10 rounded-xl hover:border-primary/40 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <p className="text-xs text-white/40 mb-2 uppercase tracking-wider font-medium">Ghost Score</p>
                <p className="text-4xl font-light text-primary">
                  {stats.ghostScore}
                </p>
              </div>
              <div className="p-2.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-all">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-white/80">
                {stats.tier}
              </div>
            </div>
          </div>

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

              {/* View Ghost Score */}
              <button className="group w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-all">
                    <TrendingUp className="w-5 h-5 text-white/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">View Ghost Score</p>
                    <p className="text-xs text-white/40">Track reputation</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Manage Payments */}
              <button className="group w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-all">
                    <DollarSign className="w-5 h-5 text-white/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Manage Payments</p>
                    <p className="text-xs text-white/40">Transaction history</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:translate-x-0.5 transition-all" />
              </button>

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
                    <div className={`w-1.5 h-1.5 mt-2 rounded-full flex-shrink-0 ${
                      activity.type === 'VERIFICATION' ? 'bg-primary' :
                      activity.status === 'completed' ? 'bg-green-500' :
                      activity.status === 'pending' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white mb-1 line-clamp-2">
                        {activity.description}
                      </p>
                      <p className="text-xs text-white/40">
                        {new Date(activity.timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="w-12 h-12 text-white/20 mb-4" />
                  <p className="text-sm text-white/60 mb-1">No activity yet</p>
                  <p className="text-xs text-white/40">Start by verifying your first agent</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className="p-6 bg-[#111111] border border-white/10 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
              {stats.ghostScore === 0 ? (
                <Sparkles className="w-6 h-6 text-primary" />
              ) : (
                <TrendingUp className="w-6 h-6 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-light text-white mb-2">
                {stats.ghostScore === 0
                  ? 'Welcome to GhostSpeak'
                  : `${stats.tier} Tier Status`}
              </h3>
              <p className="text-sm text-white/60 mb-4 leading-relaxed max-w-3xl">
                {stats.ghostScore === 0
                  ? 'Your decentralized reputation system for AI agents is now active. Start building your Ghost Score by verifying agents or making your first transaction.'
                  : staking
                  ? `You're a Tier ${staking.tier} staker with a ${(staking.reputationBoostBps / 100).toFixed(1)}% reputation boost. Keep building your reputation to unlock higher tiers and premium benefits.`
                  : `You have ${stats.freeVerificationsRemaining} free verifications remaining this month. Stake GHOST tokens to unlock unlimited verifications and premium benefits.`}
              </p>
              <div className="flex flex-wrap gap-3">
                {stats.ghostScore === 0 ? (
                  <>
                    <button className="px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-all flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Verify First Agent
                    </button>
                    <button className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg text-sm hover:bg-white/20 transition-all">
                      Learn More
                    </button>
                  </>
                ) : (
                  <>
                    {!staking && (
                      <button className="px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-all flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Stake GHOST
                      </button>
                    )}
                    <button className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg text-sm hover:bg-white/20 transition-all">
                      View Full Score
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
  )
}
