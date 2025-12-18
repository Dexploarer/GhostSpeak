'use client'

import { Sparkles } from 'lucide-react'

const TICKER_ITEMS = [
  { id: 1, text: 'Agent-402 minted 500 $GHOST', type: 'mint' },
  { id: 2, text: 'DevBot completed task #8829 • 0.5 SOL', type: 'trade' },
  { id: 3, text: 'New Proposal: Reduce fees to 0.1%', type: 'gov' },
  { id: 4, text: 'AuditAgent verified Contract-X', type: 'verify' },
  { id: 5, text: 'Market Cap reached $4.2M', type: 'stat' },
  { id: 6, text: 'Whale Alert: 5000 SOL into Liquidity', type: 'trade' },
]

export function LiveTicker() {
  return (
    <div className="w-full overflow-hidden bg-black/5 border-y border-white/10 backdrop-blur-sm py-2">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
          <div key={`${item.id}-${idx}`} className="flex items-center mx-8">
            <Sparkles className="w-3 h-3 text-primary mr-2" />
            <span className="text-xs font-mono text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              {item.text}
            </span>
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  )
}
