'use client'

import { motion } from 'framer-motion'
import { Coins, TrendingUp, Lock, Zap, DollarSign, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function TokenomicsStaking() {
  const stakingTiers = [
    {
      name: 'Verified Staker',
      stake: '5,000 GHOST',
      value: '~$0.28',
      benefits: [
        'Unlimited Ghost Score checks',
        '1.5x revenue share multiplier',
        'Basic API access',
      ],
      highlight: false,
    },
    {
      name: 'Pro Staker',
      stake: '50,000 GHOST',
      value: '~$2.85',
      benefits: ['Everything in Verified', '2x revenue multiplier', '100K API calls/month'],
      highlight: true,
    },
    {
      name: 'Whale Staker',
      stake: '500,000 GHOST',
      value: '~$28.46',
      benefits: ['Everything in Pro', '3x revenue multiplier', 'Unlimited API calls'],
      highlight: false,
    },
  ]

  return (
    <section className="py-24 sm:py-32 md:py-40 bg-zinc-950 text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(204,255,0,0.1),transparent_70%)]" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest backdrop-blur-xl mb-6"
          >
            <Coins className="w-4 h-4" />
            Token Economics
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-6"
          >
            Stake <span className="text-primary italic">$GHOST</span>,
            <br />
            Earn Revenue Share
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-zinc-400 max-w-2xl mx-auto"
          >
            No subscriptions. No credit cards. Stake GHOST tokens to access features and earn from
            protocol revenue.
          </motion.p>
        </div>

        {/* Token Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mb-16 p-8 rounded-3xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 backdrop-blur-sm"
        >
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-sm text-zinc-400 mb-2 font-mono">Current Price</div>
              <div className="text-2xl font-black text-primary">$0.00005691</div>
            </div>
            <div>
              <div className="text-sm text-zinc-400 mb-2 font-mono">Market Cap</div>
              <div className="text-2xl font-black">$56,905</div>
            </div>
            <div>
              <div className="text-sm text-zinc-400 mb-2 font-mono">Total Supply</div>
              <div className="text-2xl font-black">999.7M</div>
              <div className="text-xs text-zinc-500 mt-1">Fixed, no inflation</div>
            </div>
            <div>
              <div className="text-sm text-zinc-400 mb-2 font-mono">Network</div>
              <div className="text-2xl font-black">Solana</div>
              <div className="text-xs text-zinc-500 mt-1">SPL Token</div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-primary/10">
            <Link
              href="https://dexscreener.com/solana/e44xj7jyjxyermlqqwrpu4nekcphawfjf3ppn2uokgdb"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm font-medium"
            >
              View on DEXScreener
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Staking Tiers */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {stakingTiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className={`relative p-8 rounded-3xl border transition-all duration-300 ${
                tier.highlight
                  ? 'bg-gradient-to-br from-primary/20 to-primary/5 border-primary scale-105 shadow-[0_0_50px_rgba(204,255,0,0.2)]'
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-primary/40'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground rounded-full text-xs font-bold">
                  POPULAR
                </div>
              )}

              <div className="mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <div className="text-3xl font-black text-primary mb-1">{tier.stake}</div>
                <div className="text-sm text-zinc-500 font-mono">{tier.value} USD</div>
              </div>

              <div className="space-y-3">
                {tier.benefits.map((benefit, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm text-zinc-300">{benefit}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Revenue Share Info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7 }}
          className="grid md:grid-cols-2 gap-8 mb-12"
        >
          <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800">
            <TrendingUp className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-2xl font-bold mb-3">Variable APY Model</h3>
            <p className="text-zinc-400 mb-6">
              Earn real protocol revenue, not fixed promises. APY varies based on actual B2C fees
              and B2B overage charges.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">10% of B2C fees</span>
                <span className="text-primary font-mono">→ Staker pool</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">100% of B2B overages</span>
                <span className="text-primary font-mono">→ Staker pool</span>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800">
            <DollarSign className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-2xl font-bold mb-3">Transparent & Honest</h3>
            <p className="text-zinc-400 mb-6">
              No lockup periods. Claim rewards anytime. Unstake whenever you want. We only share
              what we actually earn.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-primary" />
                <span className="text-zinc-300">Daily reward accrual</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-primary" />
                <span className="text-zinc-300">Instant withdrawal</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-primary" />
                <span className="text-zinc-300">Zero lock-up</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.9 }}
          className="text-center"
        >
          <Link
            href="https://dexscreener.com/solana/e44xj7jyjxyermlqqwrpu4nekcphawfjf3ppn2uokgdb"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="lg"
              className="h-14 px-8 rounded-xl text-base bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_40px_rgba(204,255,0,0.3)] group"
            >
              Buy $GHOST
              <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <p className="text-sm text-zinc-500 mt-4 font-mono">
            Contract: DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump
          </p>
        </motion.div>
      </div>
    </section>
  )
}
