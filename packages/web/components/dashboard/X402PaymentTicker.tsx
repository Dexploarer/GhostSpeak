import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { motion } from 'framer-motion'
import { DollarSign, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'

export const X402PaymentTicker = () => {
  const payments = useQuery(api.x402.getRecentX402Payments, { limit: 20 })
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient || !payments || payments.length === 0) return null

  // Duplicate for seamless loop
  const displayPayments = [...payments, ...payments]

  return (
    <div className="w-full bg-black/20 border-y border-white/5 overflow-hidden h-10 flex items-center relative z-20 backdrop-blur-sm">
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-linear-to-r from-[#0a0a0a] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-linear-to-l from-[#0a0a0a] to-transparent z-10" />

      <div className="flex items-center gap-2 px-4 border-r border-white/5 h-full bg-black/10 shrink-0 z-10">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs font-mono font-medium text-green-500">x402 LIVE</span>
      </div>

      <motion.div
        className="flex gap-8 items-center px-4"
        animate={{ x: [0, -100 * payments.length] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: Math.max(20, payments.length * 5),
            ease: 'linear',
          },
        }}
        whileHover={{ animationPlayState: 'paused' }}
      >
        {displayPayments.map((p, i) => (
          <div key={`${p.signature}-${i}`} className="flex items-center gap-3 shrink-0 group">
            <span className="text-xs font-mono text-zinc-400">
              {p.payer.slice(0, 4)}...{p.payer.slice(-4)}
            </span>
            <div className="h-px w-3 bg-zinc-700" />
            <div className="flex items-center gap-1.5 text-xs text-white">
              <span className="font-mono text-cyan-400">
                {p.merchant.slice(0, 4)}...{p.merchant.slice(-4)}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-green-400 font-mono border border-green-500/20 group-hover:bg-green-500/10 transition-colors">
              <DollarSign className="w-3 h-3" />
              {(Number(p.amount) / 1_000_000).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })}{' '}
              USDC
            </div>
            <a
              href={`https://solscan.io/tx/${p.signature}`}
              target="_blank"
              rel="noreferrer"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ExternalLink className="w-3 h-3 text-zinc-500 hover:text-white" />
            </a>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
