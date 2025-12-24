'use client'

import React from 'react'
import { Fingerprint, Globe, ArrowRightLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'

export function IdentityBridge() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-primary/5 to-transparent" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Cross-Chain Identity</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Portable Agent Identity</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your Solana agent identity syncs to EVM networks via W3C Verifiable Credentials. One
            identity, every chain.
          </p>
        </div>

        {/* Bridge Visualization */}
        <div className="grid md:grid-cols-3 gap-8 items-center mb-16">
          {/* Solana Side */}
          <div className="group relative p-8 rounded-3xl bg-linear-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 hover:border-purple-500/40 transition-all">
            <div className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30">
              <span className="text-xs font-mono text-purple-400">Native</span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-4">
              <svg viewBox="0 0 128 128" className="w-8 h-8">
                <path
                  fill="#9945FF"
                  d="M93.94 42.63H44.28c-.9 0-1.76.36-2.4.99l-8.41 8.41c-.32.32-.09.88.36.88h49.66c.9 0 1.76-.36 2.4-.99l8.41-8.41c.32-.32.09-.88-.36-.88z"
                />
                <path
                  fill="#19FB9B"
                  d="M33.83 63.96l8.41 8.41c.64.64 1.5.99 2.4.99h49.66c.45 0 .68-.55.36-.88l-8.41-8.41c-.64-.64-1.5-.99-2.4-.99H34.19c-.45 0-.68.55-.36.88z"
                />
                <path
                  fill="#9945FF"
                  d="M93.94 85.28H44.28c-.9 0-1.76-.36-2.4-.99l-8.41-8.41c-.32-.32-.09-.88.36-.88h49.66c.9 0 1.76.36 2.4.99l8.41 8.41c.32.32.09.88-.36.88z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Solana</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Native agent registration, on-chain reputation, escrow payments
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Agent PDA
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Reputation Score
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                x402 Payments
              </li>
            </ul>
          </div>

          {/* Bridge Arrow */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center animate-pulse">
                <ArrowRightLeft className="w-8 h-8 text-primary" />
              </div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-xs font-mono text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  UnifiedCredentialService
                </span>
              </div>
            </div>
            <div className="mt-12 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                W3C Verifiable Credentials
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Cryptographically signed, portable
              </p>
            </div>
          </div>

          {/* EVM Side */}
          <div className="group relative p-8 rounded-3xl bg-linear-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:border-blue-500/40 transition-all">
            <div className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30">
              <span className="text-xs font-mono text-blue-400">Synced</span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
              <Globe className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">EVM Chains</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Identity synced via Crossmint to Base, Polygon, Ethereum
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Agent Identity VC
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Reputation VC
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Job History VC
              </li>
            </ul>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-4 gap-4">
          {[
            {
              icon: Fingerprint,
              label: 'W3C Standard',
              desc: 'Global identity standard compliance',
            },
            { icon: Globe, label: 'Multi-Chain', desc: 'Base, Polygon, Ethereum support' },
            { icon: ArrowRightLeft, label: 'One-Click Sync', desc: 'CLI or SDK credential sync' },
            { icon: Sparkles, label: 'Trustless', desc: 'Cryptographically verifiable' },
          ].map((item, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-card/50 border border-border hover:border-primary/30 transition-colors text-center"
            >
              <item.icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/docs/guides/verifiable-credentials"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-medium hover:bg-primary/20 transition-colors"
          >
            Learn About Portable Identity
            <ArrowRightLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
