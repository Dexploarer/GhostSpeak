'use client'

import { motion } from 'framer-motion'
import { Code, Terminal, Package, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function DeveloperIntegration() {
  const codeExample = `import { GhostSpeakClient } from '@ghostspeak/sdk'

const client = new GhostSpeakClient({ cluster: 'mainnet-beta' })

// Register your agent
const agent = await client.agents.register(signer, {
  name: "My AI Assistant",
  capabilities: ["data-analysis", "code-review"]
})

// Get Ghost Score
const reputation = await client.reputation.getAgentReputation(agent.address)
console.log(\`Ghost Score: \${reputation.ghostScore}/1000\`)`

  const integrations = [
    {
      icon: Code,
      title: 'TypeScript SDK',
      description: '100% type-safe SDK with comprehensive documentation',
      link: 'https://docs.ghostspeak.io/sdk',
      badge: 'v2.0.5',
    },
    {
      icon: Terminal,
      title: 'CLI Tools',
      description: 'Command-line interface for agent management and credentials',
      link: 'https://docs.ghostspeak.io/cli',
      badge: 'v2.0.0',
    },
    {
      icon: Package,
      title: 'ElizaOS Plugin',
      description: 'Native integration for ElizaOS framework agents',
      link: 'https://docs.ghostspeak.io/plugin-elizaos',
      badge: 'Beta',
    },
  ]

  return (
    <section className="py-24 sm:py-32 md:py-40 bg-background relative overflow-hidden border-t border-border">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--primary)/5,transparent_50%)]" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest backdrop-blur-xl mb-6"
          >
            <Code className="w-4 h-4" />
            For Developers
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-6"
          >
            Integrate in{' '}
            <span className="text-primary italic">Minutes</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Add Ghost Score and verifiable credentials to your AI agents with our SDK, CLI, or
            ElizaOS plugin
          </motion.p>
        </div>

        {/* Code Example */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <div className="relative rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-2xl">
            {/* Code editor header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-zinc-400 font-mono ml-2">index.ts</span>
            </div>

            {/* Code content */}
            <pre className="p-6 overflow-x-auto">
              <code className="text-sm text-zinc-300 font-mono leading-relaxed">{codeExample}</code>
            </pre>

            {/* Glow effect */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
          </div>
        </motion.div>

        {/* Integration Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {integrations.map((integration, i) => (
            <motion.a
              key={integration.title}
              href={integration.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(204,255,0,0.1)]"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <integration.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="px-2 py-1 text-xs font-mono bg-primary/10 text-primary rounded-full border border-primary/20">
                  {integration.badge}
                </span>
              </div>

              <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                {integration.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>

              <div className="flex items-center text-primary text-sm font-medium">
                Learn more
                <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.a>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7 }}
          className="text-center"
        >
          <Link href="https://docs.ghostspeak.io/quickstart" target="_blank" rel="noopener noreferrer">
            <Button
              size="lg"
              className="h-14 px-8 rounded-xl text-base bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_40px_rgba(var(--primary-rgb),0.25)] group"
            >
              View Quickstart Guide
              <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground/60 mt-4 font-mono">
            bun install @ghostspeak/sdk
          </p>
        </motion.div>
      </div>
    </section>
  )
}
