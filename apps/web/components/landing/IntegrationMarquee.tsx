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
  const [isPaused, setIsPaused] = React.useState(false)

  return (
    <div className="w-full py-12 overflow-hidden border-y border-border/50 bg-background/50 backdrop-blur-sm relative">
      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-border" />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/60">
            Brought to life by
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-border via-border to-transparent" />
        </div>
      </div>

      {/* First row - moving left */}
      <div 
        className="relative flex overflow-x-hidden mb-6"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <motion.div
          className="flex whitespace-nowrap"
          animate={{
            x: isPaused ? undefined : ['0%', '-50%'],
          }}
          transition={{
            duration: 30,
            ease: 'linear',
            repeat: Infinity,
          }}
        >
          {[...integrations, ...integrations].map((item, idx) => (
            <a
              key={`row1-${item.name}-${idx}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-12 px-12 group cursor-pointer"
            >
              <motion.div
                whileHover={{ scale: 1.2, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="relative w-16 h-10"
              >
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="64px"
                  className="object-contain opacity-40 group-hover:opacity-100 transition-all duration-500 grayscale group-hover:grayscale-0 relative z-10"
                />
              </motion.div>
              <span className="text-xl font-black tracking-tighter text-muted-foreground/20 group-hover:text-primary transition-colors duration-300 uppercase">
                {item.name}
              </span>
            </a>
          ))}
        </motion.div>
      </div>

      {/* Second row - moving right (reverse direction) */}
      <div 
        className="relative flex overflow-x-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <motion.div
          className="flex whitespace-nowrap"
          animate={{
            x: isPaused ? undefined : ['-50%', '0%'],
          }}
          transition={{
            duration: 35,
            ease: 'linear',
            repeat: Infinity,
          }}
        >
          {[...integrations, ...integrations].reverse().map((item, idx) => (
            <a
              key={`row2-${item.name}-${idx}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-12 px-12 group cursor-pointer"
            >
              <motion.div
                whileHover={{ scale: 1.2, rotate: -5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="relative w-16 h-10"
              >
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="64px"
                  className="object-contain opacity-40 group-hover:opacity-100 transition-all duration-500 grayscale group-hover:grayscale-0 relative z-10"
                />
              </motion.div>
              <span className="text-xl font-black tracking-tighter text-muted-foreground/20 group-hover:text-primary transition-colors duration-300 uppercase">
                {item.name}
              </span>
            </a>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
