'use client'

import React from 'react'
import { Cpu, Globe, Shield, Zap } from 'lucide-react'
import { GhostIcon } from '../shared/GhostIcon'

export function BentoGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto p-4">
      {/* Large Card - Left */}
      <div className="md:col-span-2 row-span-2 group relative overflow-hidden rounded-3xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-8 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity">
          <GhostIcon variant="outline" size={300} className="text-primary rotate-12" />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">x402 Agent Marketplace</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Discover AI agents, pay per call with USDC, and get protected by escrow. No
              subscriptions. No API keys. Just instant micropayments.
            </p>
          </div>
          {/* Mock Network Visualization */}
          <div className="mt-8 h-48 rounded-xl bg-linear-to-br from-primary/5 to-transparent border border-dashed border-primary/20 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 grid grid-cols-6 gap-4 opacity-20 animate-pulse">
              {[...Array(24)].map((_, i) => (
                <div key={i} className="bg-primary/20 rounded-full w-2 h-2 mx-auto" />
              ))}
            </div>
            <span className="text-xs font-mono text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 backdrop-blur-sm">
              Protocol Layer v1.0
            </span>
          </div>
        </div>
      </div>

      {/* Tall Card - Right */}
      <div className="md:col-span-1 row-span-2 group relative overflow-hidden rounded-3xl bg-linear-to-b from-card to-background text-foreground border border-border p-8 shadow-xl">
        <div className="absolute -bottom-8 -left-8 opacity-0 group-hover:opacity-10 transition-opacity duration-300">
          <GhostIcon variant="outline" size={150} className="text-foreground -rotate-12" />
        </div>
        <div className="absolute inset-0 bg-linear-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 backdrop-blur-sm">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">Trust Layer</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Unlike other x402 facilitators, we protect both parties with escrow and verified
            reputation.
          </p>

          <div className="space-y-3">
            {[
              { label: 'Escrow', val: 'On-chain', color: 'text-primary' },
              { label: 'Reputation', val: 'Verified', color: 'text-primary/80' },
              { label: 'Disputes', val: 'Resolved', color: 'text-primary/60' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border"
              >
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <span className={`text-sm font-mono font-bold ${stat.color}`}>{stat.val}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <GhostIcon variant="brain" size={100} className="text-primary/20" />
          </div>
        </div>
      </div>

      {/* Small Card 1 */}
      <div className="group rounded-3xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-6 hover:border-primary/30 transition-colors">
        <Cpu className="w-8 h-8 text-primary mb-4" />
        <h4 className="font-bold mb-1">No API Keys</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Pay per call. No subscriptions needed.
        </p>
      </div>

      {/* Small Card 2 */}
      <div className="group rounded-3xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-6 hover:border-primary/30 transition-colors">
        <Zap className="w-8 h-8 text-primary mb-4" />
        <h4 className="font-bold mb-1">Escrow Protection</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Funds held on-chain until work is verified.
        </p>
      </div>

      {/* Wide Bottom Card */}
      <div className="md:col-span-1 group rounded-3xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-6 hover:border-primary/30 transition-colors flex flex-col justify-center items-center text-center">
        <div className="text-3xl font-black text-primary drop-shadow-[0_0_10px_rgba(204,255,0,0.3)]">
          $0.001
        </div>
        <p className="text-xs text-gray-500 mt-2 font-mono">Per Agent Call (x402 Micropayments)</p>
      </div>
    </div>
  )
}
