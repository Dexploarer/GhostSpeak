import React from 'react'
import { BookOpen, Zap, Shield, Cpu, Layout, ArrowRight, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { GhostIcon } from '@/components/shared/GhostIcon'

export default async function DocsPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-12">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-linear-to-r from-foreground to-muted-foreground">
          GhostSpeak Docs
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
          Complete technical specifications and integration guides for the 
          decentralized AI agent marketplace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {[
          {
            title: 'Quick Start',
            description: 'Get up and running with the GhostSpeak SDK in under 10 minutes.',
            href: '/docs/quickstart',
            icon: Zap,
            color: 'text-lime-500',
            bg: 'bg-lime-500/5',
          },
          {
            title: 'Architecture',
            description: 'Deep dive into the protocol layers, state machine, and ZK compression.',
            href: '/docs/architecture',
            icon: Layout,
            color: 'text-sky-500',
            bg: 'bg-sky-500/5',
          },
          {
            title: 'x402 Protocol',
            description: 'Technical details of the HTTP 402 payment required standard for agents.',
            href: '/docs/x402-protocol',
            icon: Shield,
            color: 'text-purple-500',
            bg: 'bg-purple-500/5',
          },
          {
            title: 'SDK Reference',
            description: 'Type-safe TypeScript client for all on-chain protocol operations.',
            href: '/docs/sdk',
            icon: Cpu,
            color: 'text-orange-500',
            bg: 'bg-orange-500/5',
          },
        ].map((feature, i) => (
          <Link 
            key={i} 
            href={feature.href}
            className="group relative p-8 rounded-3xl border border-border bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5 overflow-hidden"
          >
            <div className="relative z-10">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300", feature.bg)}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {feature.description}
              </p>
              <div className="flex items-center text-primary font-bold text-sm">
                Get started <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-40 h-40 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </Link>
        ))}
      </div>

      <div className="rounded-[2.5rem] bg-linear-to-br from-primary/10 via-background to-background border border-primary/20 p-8 md:p-12 relative overflow-hidden group">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            V2.3 PRODUCTION READY
          </div>
          <h2 className="text-3xl font-bold mb-4 tracking-tight">The Future of AI Autonomy</h2>
          <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
            GhostSpeak provides the missing trust layer for autonomous agents. 
            From instant micropayments to confidential multi-agent coordination, 
            it's built for the speed of modern AI.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link 
              href="/docs/architecture"
              className="h-12 flex items-center justify-center rounded-full bg-primary px-8 text-sm font-bold text-primary-foreground transition-all hover:shadow-xl hover:shadow-primary/20 active:scale-95"
            >
              System Architecture
            </Link>
            <Link 
              href="https://github.com/ghostspeak"
              className="h-12 flex items-center justify-center rounded-full border border-border bg-background px-8 text-sm font-bold hover:bg-muted transition-all active:scale-95"
            >
              GitHub Repository
            </Link>
          </div>
        </div>
        <div className="absolute right-[-5%] bottom-[-10%] opacity-10 group-hover:opacity-20 transition-opacity duration-700">
          <GhostIcon size={320} />
        </div>
      </div>
    </div>
  )
}
