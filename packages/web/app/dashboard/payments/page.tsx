'use client'

import React from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { GlassTable } from '@/components/dashboard/shared/GlassTable'
import { Zap, Activity, ArrowUpRight, Wallet } from 'lucide-react'
import { CrossmintPaymentManager } from '@/components/payments/CrossmintPaymentManager'

export default function PaymentsPage() {
  const transactions = [
    { id: 'tx_8x92...3k29', service: 'Image Generation Agent', date: 'Oct 24, 2025', amount: '-0.05 SOL', status: 'completed' },
    { id: 'tx_7a11...9p44', service: 'Arbitrage Bot Subscription', date: 'Oct 23, 2025', amount: '-1.20 SOL', status: 'completed' },
    { id: 'tx_3m22...1q88', service: 'Data Analysis', date: 'Oct 22, 2025', amount: '-0.15 SOL', status: 'pending' },
    { id: 'tx_5n55...2r77', service: 'Consulting Fee', date: 'Oct 21, 2025', amount: '+5.00 SOL', status: 'completed' },
    { id: 'tx_9b99...4s66', service: 'Network Gas', date: 'Oct 20, 2025', amount: '-0.001 SOL', status: 'completed' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">x402 Payments</h1>
          <p className="text-gray-400">Manage your payment streams and transaction history</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Card */}
        <GlassCard className="p-6 bg-linear-to-br from-yellow-900/20 to-orange-900/20 border-yellow-500/20">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400">
                 <Wallet className="w-6 h-6" />
              </div>
              <span className="text-yellow-100 font-medium">Wallet Balance</span>
           </div>
           <div className="space-y-1">
              <h2 className="text-4xl font-bold text-white">145.20 <span className="text-lg text-gray-400 font-normal">SOL</span></h2>
              <p className="text-sm text-gray-400">≈ $24,542.10 USD</p>
           </div>
        </GlassCard>

        {/* Quick Stats */}
        <GlassCard className="p-6 flex flex-col justify-center space-y-6">
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="p-2 rounded-lg bg-lime-500/20 text-lime-400">
                    <Zap className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-lg font-bold text-foreground">4.2 SOL</p>
                 </div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-3">
                 <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                    <ArrowUpRight className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-sm text-muted-foreground">Total Earned</p>
                    <p className="text-lg font-bold text-foreground">12.8 SOL</p>
                 </div>
              </div>
           </div>
        </GlassCard>
        
        {/* Graph Placeholder -> Activity */}
         <GlassCard className="p-6 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.05]" />
            <div className="text-center relative z-10">
               <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
               <p className="text-muted-foreground">Payment Activity</p>
            </div>
         </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Payment Methods */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Agent Payment Methods
          </h2>
          <CrossmintPaymentManager />
        </div>

        {/* Recent Transactions */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Overview</h2>
          <GlassTable 
            title="Recent Transactions"
            data={transactions}
            columns={[
              { header: 'Transaction ID', accessorKey: 'id', className: 'font-mono text-muted-foreground' },
              { header: 'Service', accessorKey: 'service', className: 'text-foreground' },
              { header: 'Date', accessorKey: 'date', className: 'text-muted-foreground' },
              { 
                header: 'Amount', 
                accessorKey: 'amount', 
                className: 'text-right font-mono',
                cell: (item) => (
                  <span className={item.amount.startsWith('+') ? 'text-green-500' : 'text-red-500'}>
                    {item.amount}
                  </span>
                )
              }
            ]}
          />
        </div>
      </div>
    </div>
  )
}