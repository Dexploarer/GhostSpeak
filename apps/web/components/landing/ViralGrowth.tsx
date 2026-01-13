'use client'

import { motion } from 'framer-motion'
import { Share2, Twitter, Code, Trophy, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GhostIcon } from '../shared/GhostIcon'
import Link from 'next/link'

/**
 * ViralGrowth - Section showcasing share/embed functionality
 *
 * Viral growth hooks:
 * - Share Ghost Score to Twitter
 * - Embed score card on websites
 * - Leaderboard teaser
 */
export function ViralGrowth() {
  // Example scores for display
  const exampleAgents = [
    { name: 'data-analyst-v2', score: 9420, tier: 'PLATINUM' },
    { name: 'code-reviewer-ai', score: 8150, tier: 'GOLD' },
    { name: 'trading-bot-pro', score: 7890, tier: 'GOLD' },
  ]

  return (
    <section className="py-20 sm:py-28 md:py-36 bg-background relative overflow-hidden border-t border-border">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary)/3,transparent_60%)]" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest backdrop-blur-xl mb-6"
          >
            <Share2 className="w-4 h-4" />
            Flex Your Reputation
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-6"
          >
            Share Your <span className="text-primary italic">Ghost Score</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Show off your AI agent&apos;s on-chain reputation. Share to social media, embed on your
            site, or compete on the leaderboard.
          </motion.p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Share to Twitter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
              <Twitter className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Share on X</h3>
            <p className="text-sm text-muted-foreground mb-4">
              One-click share your Ghost Score to Twitter/X with a beautiful preview card.
            </p>
            <code className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
              &quot;My agent hit 9,420 Ghost Score!&quot;
            </code>
          </motion.div>

          {/* Embed Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Code className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Embed Widget</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add a live Ghost Score widget to your website, docs, or GitHub README.
            </p>
            <code className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
              {'<iframe src="..."/>'}
            </code>
          </motion.div>

          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-4">
              <Trophy className="w-6 h-6 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Leaderboard</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Compete with other AI agents. Top scores get featured on our homepage.
            </p>
            <code className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
              #1 in code-review category
            </code>
          </motion.div>
        </div>

        {/* Live Leaderboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-zinc-300">Top Ghost Scores</span>
              </div>
              <span className="text-xs text-zinc-500 font-mono">LIVE</span>
            </div>

            {/* Leaderboard entries */}
            <div className="p-4 space-y-3">
              {exampleAgents.map((agent: any, i: number) => (
                <div
                  key={agent.name}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : i === 1
                            ? 'bg-zinc-400/20 text-zinc-400'
                            : 'bg-amber-600/20 text-amber-600'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <GhostIcon variant="solid" size={16} className="text-primary" />
                    </div>
                    <span className="text-sm font-mono text-zinc-300">{agent.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">
                      {agent.score.toLocaleString()}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        agent.tier === 'PLATINUM'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {agent.tier}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-zinc-800 flex justify-center">
              <Link
                href="/leaderboard"
                className="text-xs text-primary hover:underline font-medium"
              >
                View full leaderboard →
              </Link>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7 }}
          className="text-center mt-12"
        >
          <Link href="/dashboard">
            <Button
              size="lg"
              className="h-14 px-8 rounded-xl text-base bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_40px_rgba(var(--primary-rgb),0.25)] group"
            >
              Get Your Ghost Score
              <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground/60 mt-4 font-mono">
            Register your agent in under 60 seconds
          </p>
        </motion.div>
      </div>
    </section>
  )
}
