'use client'

import React from 'react'
import { Cpu, Globe, Shield, Zap } from 'lucide-react'
import { GhostIcon } from '../shared/GhostIcon'

export function BentoGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto p-4">
      {/* Large Card - Left */}
      <div className="md:col-span-2 row-span-2 group relative overflow-hidden rounded-3xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity">
          <GhostIcon variant="outline" size={300} className="text-primary rotate-12" />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Globe className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-2">Decentralized Agent Network</h3>
            <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 max-w-md">
              A truly permissionless protocol where AI agents can discover, negotiate, and transact with each other without centralized intermediaries.
            </p>
          </div>
          {/* Mock Network Visualization */}
          <div className="mt-6 md:mt-8 h-32 md:h-48 rounded-xl bg-linear-to-br from-primary/5 to-transparent border border-dashed border-primary/20 flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 grid grid-cols-6 gap-2 md:gap-4 opacity-20 animate-pulse">
                {[...Array(24)].map((_, i) => (
                  <div key={i} className="bg-primary/20 rounded-full w-1 h-1 md:w-2 md:h-2 mx-auto" />
                ))}
             </div>
             <span className="text-[10px] md:text-xs font-mono text-primary bg-primary/10 px-2 md:px-3 py-1 rounded-full border border-primary/20 backdrop-blur-sm">
               Protocol Layer v1.0
             </span>
          </div>
        </div>
      </div>

      {/* Tall Card - Right */}
      <div className="md:col-span-1 row-span-2 group relative overflow-hidden rounded-3xl bg-linear-to-b from-card to-background text-foreground border border-border p-6 md:p-8 shadow-xl">
        <div className="absolute -bottom-8 -left-8 opacity-0 group-hover:opacity-10 transition-opacity duration-300">
             <GhostIcon variant="outline" size={150} className="text-foreground -rotate-12" />
        </div>
        <div className="absolute inset-0 bg-linear-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 backdrop-blur-sm">
            <Shield className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          </div>
          <h3 className="text-lg md:text-xl font-bold mb-2">x402 Security</h3>
          <p className="text-xs md:text-sm text-muted-foreground mb-6">
            Enterprise-grade security with on-chain reputation tracking and dispute resolution.
          </p>
          
          <div className="space-y-2 md:space-y-3">
            {[
              { label: 'Payment Required', val: '402', color: 'text-primary' },
              { label: 'Encryption', val: 'AES-256', color: 'text-primary/80' },
              { label: 'Uptime', val: '99.99%', color: 'text-primary/60' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-background/50 border border-border">
                <span className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</span>
                <span className={`text-xs md:text-sm font-mono font-bold ${stat.color}`}>{stat.val}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 md:mt-8 flex justify-center">
             <GhostIcon variant="brain" size={80} className="text-primary/20" />
          </div>
        </div>
      </div>

      {/* Small Card 1 */}
      <div className="group rounded-3xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-5 md:p-6 hover:border-primary/30 transition-colors">
        <Cpu className="w-6 h-6 md:w-8 md:h-8 text-primary mb-3 md:mb-4" />
        <h4 className="text-sm md:text-base font-bold mb-1">ZK Compression</h4>
        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">5000x cost reduction for agent state.</p>
      </div>

      {/* Small Card 2 */}
      <div className="group rounded-3xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-5 md:p-6 hover:border-primary/30 transition-colors">
        <Zap className="w-6 h-6 md:w-8 md:h-8 text-primary mb-3 md:mb-4" />
        <h4 className="text-sm md:text-base font-bold mb-1">Instant Settlement</h4>
        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Sub-second finality on Solana.</p>
      </div>

      {/* Wide Bottom Card */}
      <div className="md:col-span-1 group rounded-3xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-5 md:p-6 hover:border-primary/30 transition-colors flex flex-col justify-center items-center text-center">
         <div className="text-2xl md:text-3xl font-black text-primary drop-shadow-[0_0_10px_rgba(204,255,0,0.3)]">
            &lt; 0.0001 SOL
         </div>
         <p className="text-[10px] md:text-xs text-gray-500 mt-2 font-mono uppercase tracking-widest">Transaction Cost</p>
      </div>
    </div>
  )
}
