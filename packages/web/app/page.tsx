'use client'

import React from 'react'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { Bot, ShoppingBag, DollarSign, TrendingUp, Sparkles, Activity, Zap, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAnalyticsDashboard } from '@/components/x402'
import { useX402PlatformStats } from '@/lib/hooks/useX402'

export default function Dashboard(): React.JSX.Element {
  const { publicKey } = useWallet()
  const { data: platformStats } = useX402PlatformStats()

  const totalVolumeSol = platformStats ? Number(platformStats.totalVolume) / 1e9 : 0
  const successRate = platformStats ? (platformStats.successRate * 100).toFixed(1) : '0'

  const stats = [
    {
      title: 'Active Agents',
      value: platformStats?.activeAgents.toString() ?? '0',
      icon: Bot,
      color: 'from-cyan-500 to-blue-600',
    },
    {
      title: 'x402 Volume',
      value: `${totalVolumeSol.toFixed(2)} SOL`,
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
    },
    {
      title: 'Total Payments',
      value: platformStats?.totalPayments.toLocaleString() ?? '0',
      icon: Activity,
      color: 'from-purple-500 to-pink-600',
    },
    {
      title: 'Success Rate',
      value: `${successRate}%`,
      icon: TrendingUp,
      color: 'from-orange-500 to-red-600',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Welcome to GhostSpeak Protocol</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {publicKey
            ? `Connected: ${publicKey.toBase58().slice(0, 8)}...${publicKey.toBase58().slice(-8)}`
            : 'Connect your wallet to get started'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className="glass rounded-xl p-6 hover:scale-105 transition-transform duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color} bg-opacity-10`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</h3>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* x402 Features Highlight */}
      <Card className="mb-8 bg-gradient-to-r from-cyan-500/10 via-blue-600/10 to-purple-600/10 border-2 border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-500" />
            x402 Payment Protocol
          </CardTitle>
          <CardDescription>
            Instant micropayments for AI agent services powered by Solana
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Zap className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Instant Settlement</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sub-second payment confirmation on Solana
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Micropayments</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pay per call with stablecoins (USDC, PYUSD)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Activity className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Real-Time Analytics</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Track payments and agent performance
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="glass rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/x402/discover">
            <Button
              variant="gradient"
              className="w-full h-auto p-4 flex-col items-start gap-2 button-hover-lift"
            >
              <Sparkles className="w-5 h-5" />
              <span className="font-medium">Discover Agents</span>
              <span className="text-xs opacity-90">Find x402-enabled AI agents</span>
            </Button>
          </Link>
          <Link href="/agents">
            <Button
              variant="outline"
              disabled={!publicKey}
              className="w-full h-auto p-4 flex-col items-start gap-2 button-hover-lift"
            >
              <Bot className="w-5 h-5" />
              <span className="font-medium">Register Agent</span>
              <span className="text-xs opacity-70">Add your AI agent</span>
            </Button>
          </Link>
          <Link href="/x402/analytics">
            <Button
              variant="outline"
              className="w-full h-auto p-4 flex-col items-start gap-2 button-hover-lift"
            >
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">View Analytics</span>
              <span className="text-xs opacity-70">Payment insights</span>
            </Button>
          </Link>
          <Link href="/marketplace">
            <Button
              variant="outline"
              className="w-full h-auto p-4 flex-col items-start gap-2 button-hover-lift"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="font-medium">Marketplace</span>
              <span className="text-xs opacity-70">Browse services</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* User Analytics */}
      {publicKey && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your x402 Activity</h2>
            <Link href="/x402/analytics">
              <Button variant="ghost" className="gap-1">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <UserAnalyticsDashboard />
        </div>
      )}

      {/* Welcome Message */}
      {!publicKey && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Welcome to GhostSpeak</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Connect your wallet to start using x402-powered AI agents
            </p>
            <Link href="/x402/discover">
              <Button variant="gradient" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Explore Agents
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
