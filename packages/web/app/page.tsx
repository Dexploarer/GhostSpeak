'use client'

import React from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Bot, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react'

export default function Dashboard(): React.JSX.Element {
  const { publicKey } = useWallet()

  const stats = [
    {
      title: 'Active Agents',
      value: '0',
      icon: Bot,
      color: 'from-cyan-500 to-blue-600',
    },
    {
      title: 'Marketplace Listings',
      value: '0',
      icon: ShoppingBag,
      color: 'from-purple-500 to-pink-600',
    },
    {
      title: 'Total Earnings',
      value: '0 SOL',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
    },
    {
      title: 'Success Rate',
      value: '0%',
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

      {/* Quick Actions */}
      <div className="glass rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            className="p-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition-opacity"
            disabled={!publicKey}
          >
            Register New Agent
          </button>
          <button
            className="p-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:opacity-90 transition-opacity"
            disabled={!publicKey}
          >
            Browse Marketplace
          </button>
          <button
            className="p-4 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90 transition-opacity"
            disabled={!publicKey}
          >
            Create Listing
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {publicKey ? 'No recent activity' : 'Connect your wallet to view activity'}
        </div>
      </div>
    </div>
  )
}
