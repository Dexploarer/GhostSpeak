'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { GhostIcon } from '../shared/GhostIcon'

const layers = [
  {
    id: 'vc',
    title: 'Verifiable Credentials',
    color: '#ccff00',
    text: 'black',
    desc: 'Cryptographically signed credentials for reputation, skills, and job history - portable across EVM chains',
    z: 0,
    side: 'left',
    spin: -360,
    content: (
      <div className="flex flex-col items-center">
        <span className="text-sm md:text-base font-black uppercase tracking-[0.5em] text-black whitespace-nowrap opacity-80">
          VCs
        </span>
        <div className="h-px w-8 bg-black/20 mt-2" />
      </div>
    ),
  },
  {
    id: 'did',
    title: 'Decentralized Identifiers',
    color: '#09090b',
    text: 'white',
    desc: 'W3C-compliant DIDs for portable, self-sovereign agent identity across chains',
    z: 20,
    side: 'right',
    spin: 0,
    content: (
      <div className="flex flex-col items-center">
        <span className="text-sm md:text-base font-black uppercase tracking-[0.5em] text-white whitespace-nowrap opacity-80">
          DIDs
        </span>
        <div className="h-px w-8 bg-primary/40 mt-2" />
      </div>
    ),
  },
  {
    id: 'pda',
    title: 'Ghost PDAs',
    color: '#18181b', // zinc-900
    text: 'white',
    desc: 'Program Derived Addresses storing agent reputation, escrow state, and transaction history on-chain',
    z: 40,
    side: 'left',
    spin: 360,
    content: (
      <div className="flex flex-col items-center">
        <span className="text-sm md:text-base font-black uppercase tracking-[0.5em] text-white whitespace-nowrap opacity-80">
          PDAs
        </span>
        <div className="h-px w-8 bg-primary/40 mt-2" />
      </div>
    ),
  },
  {
    id: 'agent',
    title: 'AI Agent',
    color: '#ffffff',
    text: 'black',
    desc: 'Web Dashboard, ElizaOS Plugin, CLI Tools, API Access',
    z: 60,
    side: 'right',
    spin: 0,
    content: (
      <div className="flex items-center justify-center">
        <GhostIcon variant="logo" size={48} className="text-black opacity-80" />
      </div>
    ),
  },
]

export function ArchitectureLayers() {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="py-32 max-sm:py-16 bg-background text-foreground overflow-hidden relative border-t border-border"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setHovered(!hovered)}
    >
      <div className="max-w-7xl mx-auto px-4 text-center mb-24 max-sm:mb-12 relative z-10">
        <h2 className="text-4xl md:text-6xl max-sm:text-3xl font-black mb-6 max-sm:mb-4">
          Full-Stack <span className="text-primary">Trust</span>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto font-light max-sm:text-sm max-sm:px-2">
          Verifiable credentials and Ghost Score reputation built into every layer. From Solana
          blockchain to your agent&apos;s identity.
        </p>
      </div>

      <div className="relative h-[1200px] max-sm:h-[500px] flex items-center justify-center perspective-1000">
        {/* Isometric Platform Base */}
        <div className="absolute w-[900px] h-[900px] max-sm:w-[400px] max-sm:h-[400px] bg-primary/5 rounded-full blur-[100px] -rotate-x-60 translate-y-80 max-sm:translate-y-32 pointer-events-none" />

        <div
          className="relative w-[320px] md:w-[600px] h-[320px] max-sm:w-[200px] max-sm:h-[200px] preserve-3d transition-transform duration-700 ease-out"
          style={{
            transform: hovered
              ? 'rotateX(50deg) rotateZ(45deg) scale(0.8) translateY(100px)'
              : 'rotateX(60deg) rotateZ(45deg) translateY(50px)',
          }}
        >
          {layers.map((layer, index) => {
            const isLeft = layer.side === 'left'
            return (
              <motion.div
                key={layer.id}
                className="absolute inset-0 rounded-3xl shadow-2xl transition-all duration-500 ease-out border border-foreground/10 group cursor-default"
                initial={false}
                animate={{
                  translateZ: hovered ? index * 200 : index * 40, // Increased expansion spacing
                  rotateZ: hovered ? layer.spin : 0, // Spin the layer itself
                  backgroundColor: layer.color,
                }}
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Layer Edge Effect */}
                <div
                  className="absolute inset-x-0 bottom-0 h-4 bg-black/20 transform -rotate-x-90 origin-bottom rounded-b-2xl"
                  style={{
                    backgroundColor: index === 0 ? '#b3e600' : index === 3 ? '#e5e5e5' : '#111',
                  }}
                />
                <div
                  className="absolute top-0 right-0 w-4 h-full bg-black/40 transform rotate-y-90 origin-right rounded-r-2xl"
                  style={{
                    backgroundColor: index === 0 ? '#99cc00' : index === 3 ? '#cccccc' : '#000',
                  }}
                />

                {/* Minimal Top Face */}
                <div
                  className={`relative w-full h-full flex items-center justify-center p-8 text-center ${layer.text === 'black' ? 'text-black' : 'text-white'}`}
                  style={{ transform: 'translateZ(10px)' }}
                >
                  {layer.content}
                </div>

                {/* Pop-out Information Card */}
                <motion.div
                  className={`absolute top-1/2 w-64 md:w-80 bg-background/90 backdrop-blur-xl border border-border p-6 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.1)] pointer-events-none`}
                  initial={{ opacity: 0, x: 0 }}
                  animate={{
                    opacity: hovered ? 1 : 0,
                    x: hovered ? (isLeft ? -520 : 520) : 0, // Pushed out even further
                    y: hovered ? -20 : 0, // Less vertical shift
                    rotateZ: hovered ? -layer.spin : 0, // Counter-spin the card to keep it level
                  }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  style={{
                    left: '50%',
                    marginLeft: '-160px',
                    transform: 'translate(-50%, -50%) rotateZ(-45deg) rotateX(-50deg)', // Matched counter-rotation
                  }}
                >
                  {/* Connecting Line */}
                  <div
                    className={`absolute top-1/2 ${isLeft ? 'right-0 translate-x-full' : 'left-0 -translate-x-full'} w-48 h-px bg-border`}
                  />

                  <div className="text-xs font-mono text-primary mb-2 uppercase tracking-widest">
                    {layer.id}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{layer.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-light">
                    {layer.desc}
                  </p>
                </motion.div>
              </motion.div>
            )
          })}
        </div>
      </div>


      <style jsx>{`
        .perspective-1000 {
          perspective: 2000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
      `}</style>
    </div>
  )
}
