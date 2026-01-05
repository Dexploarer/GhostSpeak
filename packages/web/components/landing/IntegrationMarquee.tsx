'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface IntegrationItem {
  name: string
  url: string
  image: string
}

const integrations: IntegrationItem[] = [
  {
    name: 'Solana',
    url: 'https://solana.com',
    image: '/assets/solana-logo-new.png',
  },
  {
    name: 'Crossmint',
    url: 'https://crossmint.com',
    image: '/assets/crossmint-logo-new.png',
  },
  {
    name: 'Mintlify',
    url: 'https://mintlify.com',
    image: '/assets/mintlify-logo-new.png',
  },
  {
    name: 'Vercel',
    url: 'https://vercel.com',
    image: '/assets/vercel-logo-new.png',
  },
  {
    name: 'x402',
    url: 'https://coinbase.com/x402',
    image: '/assets/x402-logo.png',
  },
  {
    name: 'USDC',
    url: 'https://circle.com/usdc',
    image: '/assets/usdc-logo-new.png',
  },
  {
    name: 'PYUSD',
    url: 'https://paypal.com/pyusd',
    image: '/assets/pyusd-logo-new.png',
  },
]

export function IntegrationMarquee() {
  return (
    <div className="w-full py-12 overflow-hidden border-y border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-linear-to-r from-transparent via-border to-border" />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/60">
            Brought to life by
          </span>
          <div className="h-px flex-1 bg-linear-to-r from-border via-border to-transparent" />
        </div>
      </div>

      <div className="relative flex overflow-x-hidden">
        <motion.div
          className="flex whitespace-nowrap"
          animate={{
            x: ['0%', '-50%'],
          }}
          transition={{
            duration: 35, // Slightly slower for more items
            ease: 'linear',
            repeat: Infinity,
          }}
        >
          {[...integrations, ...integrations].map((item, idx) => (
            <a
              key={`${item.name}-${idx}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-12 px-12 group cursor-pointer"
            >
              <div className="relative w-16 h-10 transition-all duration-500 scale-100 group-hover:scale-125 group-hover:filter group-hover:drop-shadow-[0_0_15px_rgba(204,255,0,0.4)]">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="64px"
                  className="object-contain opacity-40 group-hover:opacity-100 transition-all duration-500 grayscale group-hover:grayscale-0"
                />
              </div>
              <span className="text-xl font-black tracking-tighter text-muted-foreground/20 group-hover:text-foreground transition-colors duration-500 uppercase">
                {item.name}
              </span>
            </a>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
