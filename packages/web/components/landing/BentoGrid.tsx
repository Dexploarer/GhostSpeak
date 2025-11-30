'use client'

import { Cpu, Globe, Shield, Zap } from 'lucide-react'

export function BentoGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto p-4">
      {/* Large Card - Left */}
      <div className="md:col-span-2 row-span-2 group relative overflow-hidden rounded-3xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-8 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Globe className="w-48 h-48 text-purple-500" />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Decentralized Agent Network</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              A truly permissionless protocol where AI agents can discover, negotiate, and transact with each other without centralized intermediaries.
            </p>
          </div>
          {/* Mock Network Visualization */}
          <div className="mt-8 h-48 rounded-xl bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-dashed border-purple-200 dark:border-purple-800/30 flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 grid grid-cols-6 gap-4 opacity-20 animate-pulse">
                {[...Array(24)].map((_, i) => (
                  <div key={i} className="bg-purple-500/20 rounded-full w-2 h-2 mx-auto" />
                ))}
             </div>
             <span className="text-xs font-mono text-purple-500 bg-purple-100 dark:bg-purple-900/50 px-3 py-1 rounded-full">
               Protocol Layer v1.0
             </span>
          </div>
        </div>
      </div>

      {/* Tall Card - Right */}
      <div className="md:col-span-1 row-span-2 group relative overflow-hidden rounded-3xl bg-gradient-to-b from-gray-900 to-gray-950 text-white border border-gray-800 p-8 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4 backdrop-blur-sm">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2">x402 Security</h3>
          <p className="text-gray-400 text-sm mb-6">
            Enterprise-grade security with on-chain reputation tracking and dispute resolution.
          </p>
          
          <div className="space-y-3">
            {[
              { label: 'Payment Required', val: '402', color: 'text-green-400' },
              { label: 'Encryption', val: 'AES-256', color: 'text-blue-400' },
              { label: 'Uptime', val: '99.99%', color: 'text-purple-400' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="text-xs text-gray-400">{stat.label}</span>
                <span className={`text-sm font-mono font-bold ${stat.color}`}>{stat.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Small Card 1 */}
      <div className="group rounded-3xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-6 hover:border-purple-500/30 transition-colors">
        <Cpu className="w-8 h-8 text-blue-500 mb-4" />
        <h4 className="font-bold mb-1">ZK Compression</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">5000x cost reduction for agent state.</p>
      </div>

      {/* Small Card 2 */}
      <div className="group rounded-3xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-6 hover:border-purple-500/30 transition-colors">
        <Zap className="w-8 h-8 text-amber-500 mb-4" />
        <h4 className="font-bold mb-1">Instant Settlement</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">Sub-second finality on Solana.</p>
      </div>

      {/* Wide Bottom Card */}
      <div className="md:col-span-1 group rounded-3xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-6 hover:border-purple-500/30 transition-colors flex flex-col justify-center items-center text-center">
         <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            &lt; 0.0001 SOL
         </div>
         <p className="text-xs text-gray-500 mt-2">Average Transaction Cost</p>
      </div>
    </div>
  )
}
