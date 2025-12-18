'use client'

import React, { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import dynamic from 'next/dynamic'
import { StatusLabel } from '../shared/StatusLabel'

const GhostMascot3D = dynamic(
  () => import('./3d/GhostMascot3D').then((mod) => mod.GhostMascot3D),
  { ssr: false }
)

export function MascotShowcase() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1.1, 0.9])
  const rotateY = useTransform(scrollYProgress, [0, 1], [-15, 15])
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const y = useTransform(scrollYProgress, [0, 1], [50, -50])

  return (
    <section 
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden py-32 bg-background"
    >
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-primary/5 to-transparent opacity-30" />
      
      {/* Decorative Text in background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
         <motion.div 
           style={{ x: useTransform(scrollYProgress, [0, 1], [100, -100]) }}
           className="text-[20vw] font-black text-foreground/2 whitespace-nowrap leading-none"
         >
           GHOST PROTOCOL INFRASTRUCTURE
         </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-mono">
             <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
             CORE PROTOCOL MASCOT
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-foreground leading-[0.9] tracking-tighter">
            Meet the <span className="text-primary italic">Ghost</span> <br /> 
            Behind the Machine
          </h2>
          <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
            GhostSpeak is the decentralized backbone for the machine economy. A silent orchestration layer enabling autonomous agents to discover, negotiate, and settle with absolute finality. Built for scale, secured by Solana.
          </p>
          <div className="pt-8 flex flex-wrap gap-6">
             <div className="p-6 rounded-2xl bg-card border border-border backdrop-blur-xl hover:border-primary/20 transition-colors">
                <StatusLabel 
                  label="Latency" 
                  value="Sub-50ms" 
                  variant="primary" 
                />
             </div>
             <div className="p-6 rounded-2xl bg-card border border-border backdrop-blur-xl hover:border-primary/20 transition-colors">
                <StatusLabel 
                  label="Cost Per Call" 
                  value="0.0001 SOL" 
                  variant="primary" 
                />
             </div>
          </div>
        </motion.div>

        <div className="relative flex justify-center lg:justify-end">
           {/* Glow behind mascot */}
           <motion.div 
             style={{ scale: useTransform(scrollYProgress, [0.3, 0.5, 0.7], [0.8, 1.2, 0.8]) }}
             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -z-10"
           />
           
           <motion.div
             style={{ scale, rotateY, opacity, y }}
             className="relative w-[300px] h-[300px] md:w-[600px] md:h-[600px] group"
           >
              <GhostMascot3D />
              
              {/* Telemetry Overlays in Corners */}
              <div className="absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <StatusLabel 
                  label="Kernel_Version" 
                  value="v1.0.4" 
                  variant="dim" 
                />
              </div>

              <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <StatusLabel 
                  label="Neural_Sync" 
                  value="ACTIVE" 
                  variant="primary" 
                  align="right"
                  animate
                />
              </div>

              <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <StatusLabel 
                  label="Settlement" 
                  value="INSTANT" 
                  variant="primary" 
                  align="right"
                />
              </div>

              {/* Interactive Info bubbles that appear on scroll */}
              <motion.div 
                style={{ opacity: useTransform(scrollYProgress, [0.4, 0.5, 0.6], [0, 1, 0]) }}
                className="absolute bottom-[-40px] left-0 bg-background/80 border border-primary/30 p-6 rounded-2xl backdrop-blur-xl shadow-2xl z-20 min-w-[220px]"
              >
                 <StatusLabel 
                   label="Network_Consensus" 
                   value="VERIFIED" 
                   variant="primary" 
                   animate 
                 />
                 <div className="mt-2 text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                   Signal: Absolute Finality reached
                 </div>
              </motion.div>
           </motion.div>
        </div>
      </div>
    </section>
  )
}
