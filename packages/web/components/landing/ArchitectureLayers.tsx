'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { GhostIcon } from '../shared/GhostIcon'

const layers = [
  {
    id: 'blockchain',
    title: 'Blockchain Layer',
    color: '#ccff00',
    text: 'black',
    desc: 'Solana: High Performance, Low Cost, Secure',
    z: 0,
    side: 'left',
    spin: -360,
    content: (
      <div className="flex flex-col items-center">
        <span className="text-sm md:text-base font-black uppercase tracking-[0.5em] text-black whitespace-nowrap opacity-80">GhostSpeak</span>
        <div className="h-px w-8 bg-black/20 mt-2" />
      </div>
    )
  },
  {
    id: 'contracts',
    title: 'Smart Contract Layer (Rust)',
    color: '#18181b', // zinc-900
    text: 'white',
    desc: 'Core Protocol, Token-2022, Escrow, Governance',
    z: 20,
    side: 'right',
    spin: 0,
    content: (
      <div className="flex flex-col items-center">
        <span className="text-sm md:text-base font-black uppercase tracking-[0.5em] text-white whitespace-nowrap opacity-80">Settle Everything</span>
        <div className="h-px w-8 bg-primary/40 mt-2" />
      </div>
    )
  },
  {
    id: 'sdk',
    title: 'SDK Layer (TypeScript)',
    color: '#09090b',
    text: 'white',
    desc: 'Client Libraries, Type Safety, Error Handling, Utilities',
    z: 40,
    side: 'left',
    spin: 360,
    content: (
      <div className="flex flex-col items-center">
        <span className="text-sm md:text-base font-black uppercase tracking-[0.5em] text-white whitespace-nowrap opacity-80">Speak Nothing</span>
        <div className="h-px w-8 bg-primary/40 mt-2" />
      </div>
    )
  },
  {
    id: 'app',
    title: 'Application Layer',
    color: '#ffffff',
    text: 'black',
    desc: 'AI Agents, dApps, Marketplaces, Analytics Dashboards',
    z: 60,
    side: 'right',
    spin: 0,
    content: (
      <div className="flex items-center justify-center">
        <GhostIcon variant="logo" size={48} className="text-black opacity-80" />
      </div>
    )
  }
]

export function ArchitectureLayers() {
  const [hovered, setHovered] = useState(false)

  return (
    <div className="py-20 md:py-32 bg-background text-foreground overflow-hidden relative border-t border-border" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={() => setHovered(!hovered)}>
      
      <div className="max-w-7xl mx-auto px-4 text-center mb-16 md:mb-24 relative z-10">
        <h2 className="text-3xl md:text-6xl font-black mb-6 leading-tight">Protocol <span className="text-primary">Architecture</span></h2>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto font-light">
          Built from the ground up for machine-speed commerce. A high-performance stack optimizing every layer for autonomous agents.
        </p>
      </div>

      <div className="relative h-[800px] md:h-[1200px] flex items-center justify-center perspective-1000">
        {/* Isometric Platform Base */}
        <div className="absolute w-[300px] md:w-[900px] h-[300px] md:h-[900px] bg-primary/5 rounded-full blur-[60px] md:blur-[100px] -rotate-x-60 translate-y-40 md:translate-y-80 pointer-events-none" />

        <div className="relative w-[280px] sm:w-[320px] md:w-[600px] h-[280px] sm:h-[320px] preserve-3d transition-transform duration-700 ease-out" 
             style={{ 
               transform: hovered 
                 ? 'rotateX(50deg) rotateZ(45deg) scale(0.6) md:scale(0.8) translateY(100px)' 
                 : 'rotateX(60deg) rotateZ(45deg) scale(0.8) md:scale(1) translateY(50px)' 
             }}>
          
          {layers.map((layer, index) => {
             const isLeft = layer.side === 'left'
             return (
            <motion.div
              key={layer.id}
              className="absolute inset-0 rounded-2xl md:rounded-3xl shadow-2xl transition-all duration-500 ease-out border border-foreground/10 group cursor-default"
              initial={false}
              animate={{
                translateZ: hovered ? index * (window?.innerWidth < 768 ? 120 : 200) : index * (window?.innerWidth < 768 ? 25 : 40),
                rotateZ: hovered ? layer.spin : 0,
                backgroundColor: layer.color
              }}
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Layer Edge Effect */}
              <div 
                className="absolute inset-x-0 bottom-0 h-2 md:h-4 bg-black/20 transform -rotate-x-90 origin-bottom rounded-b-xl md:rounded-b-2xl" 
                style={{ backgroundColor: index === 0 ? '#b3e600' : (index === 3 ? '#e5e5e5' : '#111') }}
              />
              <div 
                className="absolute top-0 right-0 w-2 md:w-4 h-full bg-black/40 transform rotate-y-90 origin-right rounded-r-xl md:rounded-r-2xl"
                style={{ backgroundColor: index === 0 ? '#99cc00' : (index === 3 ? '#cccccc' : '#000') }}
              />

              {/* Minimal Top Face */}
              <div className={`relative w-full h-full flex items-center justify-center p-4 md:p-8 text-center ${layer.text === 'black' ? 'text-black' : 'text-white'}`} style={{ transform: 'translateZ(10px)' }}>
                <div className="scale-75 md:scale-100">
                  {layer.content}
                </div>
              </div>

              {/* Pop-out Information Card */}
              <motion.div
                className={cn(
                  "absolute top-1/2 w-56 md:w-80 bg-background/95 backdrop-blur-2xl border border-border p-4 md:p-6 rounded-xl shadow-2xl pointer-events-none z-50",
                  index % 2 === 0 ? "text-left" : "text-right"
                )}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                    opacity: hovered ? 1 : 0,
                    scale: hovered ? 1 : 0.8,
                    x: hovered ? (isLeft ? (typeof window !== 'undefined' && window.innerWidth < 768 ? -240 : -520) : (typeof window !== 'undefined' && window.innerWidth < 768 ? 240 : 520)) : 0,
                    rotateZ: hovered ? -layer.spin : 0 
                }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                style={{
                    left: '50%',
                    marginLeft: '-112px', // half of w-56
                    transform: 'translate(-50%, -50%) rotateZ(-45deg) rotateX(-50deg)', 
                }}
              >
                  <div className="text-[10px] font-mono text-primary mb-1 uppercase tracking-widest">{layer.id}</div>
                  <h3 className="text-sm md:text-xl font-bold text-foreground mb-1">{layer.title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-light">{layer.desc}</p>
              </motion.div>

            </motion.div>
          )})}
        </div>
      </div>
      
      {/* Interactive Hint */}
      <div className="absolute bottom-10 md:bottom-20 left-0 right-0 text-center text-muted-foreground/40 font-mono text-[10px] md:text-xs uppercase tracking-widest animate-pulse pointer-events-none">
        {hovered ? 'Tap again to collapse' : 'Tap/Hover system to analyze layers'}
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
import { cn } from '@/lib/utils'

