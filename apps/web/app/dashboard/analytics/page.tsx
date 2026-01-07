'use client'

import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell'
import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { BarChart3, ExternalLink, Eye } from 'lucide-react'
import Link from 'next/link'

export default function DashboardAnalyticsPage() {
  const { publicKey } = useWallet()

  const dashboardData = useQuery(
    api.dashboard.getUserDashboard,
    publicKey ? { walletAddress: publicKey } : 'skip'
  )

  return (
    <DashboardPageShell
      title="Analytics"
      description="A minimal view of the analytics that exist in the current web backend."
    >
      <div className="space-y-4">
        <section className="p-5 sm:p-6 bg-[#111111] border border-white/10 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-medium text-white">Currently available</h2>
          </div>

          {dashboardData === undefined ? (
            <p className="text-sm text-white/60">Loading…</p>
          ) : !dashboardData ? (
            <p className="text-sm text-white/60">No dashboard data available for this wallet.</p>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <dt className="text-xs text-white/40 uppercase tracking-wider font-medium">
                  API calls (this month)
                </dt>
                <dd className="text-2xl font-light text-white mt-2">
                  {dashboardData.stats.apiCallsThisMonth}
                </dd>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <dt className="text-xs text-white/40 uppercase tracking-wider font-medium">
                  Verifications (this month)
                </dt>
                <dd className="text-2xl font-light text-white mt-2">
                  {dashboardData.stats.verificationsThisMonth}
                </dd>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <dt className="text-xs text-white/40 uppercase tracking-wider font-medium">
                  Transactions (lifetime)
                </dt>
                <dd className="text-2xl font-light text-white mt-2">
                  {dashboardData.stats.totalTransactions}
                </dd>
              </div>
            </dl>
          )}

          <div className="mt-4 text-xs text-white/40">
            Want deeper reliability metrics? The observatory is live at{' '}
            <Link
              href="/dashboard/observe"
              className="inline-flex items-center gap-1 text-white/70 hover:text-primary transition-colors"
            >
              /dashboard/observe <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
            .
          </div>
        </section>

        <section className="p-5 sm:p-6 bg-[#111111] border border-white/10 rounded-xl">
          <h2 className="text-sm font-medium text-white mb-2">Not available in web yet</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            The full charts + exports described in the dashboard docs are not wired into the current web
            backend yet.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <a
              href="https://docs.ghostspeak.io/dashboard/analytics"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:border-white/20 transition-all"
            >
              Analytics docs <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
            <a
              href="https://docs.ghostspeak.io/cli/installation"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:border-white/20 transition-all"
            >
              CLI install <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
          <div className="mt-3 text-xs text-white/40">
            CLI: <span className="font-mono text-white/70">ghostspeak dashboard</span>
          </div>
        </section>
      </div>
    </DashboardPageShell>
  )
}

