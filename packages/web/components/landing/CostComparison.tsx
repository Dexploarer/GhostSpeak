'use client'

import { motion } from 'framer-motion'
import { Coins, Zap, ShieldCheck, Cpu } from 'lucide-react'
import dynamic from 'next/dynamic'
import { StatusLabel } from '../shared/StatusLabel'

const CostVisualizer3D = dynamic(
  () => import('./3d/CostVisualizer3D').then((mod) => mod.CostVisualizer3D),
  { ssr: false }
)

export function CostComparison() {
  return (
    <div className="py-32 bg-zinc-950 text-white overflow-hidden relative border-t border-white/5">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          
          {/* Text Side */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-mono uppercase tracking-[0.2em]">
              <Cpu className="w-3.5 h-3.5" />
              vs Other x402 Facilitators
            </div>
            
            <div className="space-y-4">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
                PayAI is a <br />
                <span className="text-primary italic">Pipe.</span>
              </h2>
              <p className="text-xl text-gray-400 font-light leading-relaxed max-w-lg">
                Other x402 facilitators just verify payments. GhostSpeak is the only marketplace that <span className="text-white font-bold underline decoration-primary/30 underline-offset-4">protects both parties</span> with escrow, reputation, and dispute resolution.
              </p>
            </div>

            <div className="space-y-6">
              {[
                { 
                  icon: ShieldCheck, 
                  title: "PayAI / Coinbase", 
                  cost: "Verify + Settle", 
                  sub: "No Protection",
                  color: "text-gray-500"
                },
                { 
                  icon: Zap, 
                  title: "GhostSpeak", 
                  cost: "Full Trust Layer", 
                  sub: "Escrow + Reputation + Disputes",
                  color: "text-primary"
                }
              ].map((item, i) => (
                <motion.div 
                  key={item.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-6 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/20 transition-colors group"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 ${item.color}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">{item.title}</div>
                    <div className={`text-2xl font-black ${item.color}`}>{item.cost}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">{item.sub}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Visual Side - 3D Visualizer */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-square w-full bg-black/40 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl backdrop-blur-3xl group relative">
              <CostVisualizer3D />
              
              {/* Data Overlays in Corners */}
              <div className="absolute top-8 left-8">
                <StatusLabel 
                  label="Network_Tier" 
                  value="Tier_01" 
                  variant="dim" 
                />
              </div>

              <div className="absolute top-8 right-8">
                <StatusLabel 
                  label="Sync_Status" 
                  value="LOCKED" 
                  variant="primary" 
                  align="right"
                  animate
                />
              </div>

              <div className="absolute bottom-8 left-8">
                <StatusLabel 
                  label="Efficiency_Gain" 
                  value="5000X" 
                  variant="white" 
                />
              </div>

              <div className="absolute bottom-8 right-8">
                <StatusLabel 
                  label="Network_Ready" 
                  value="OPTIMIZED" 
                  variant="primary" 
                  align="right"
                />
              </div>
            </div>

            {/* Floating decorative elements */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          </motion.div>

        </div>
      </div>
    </div>
  )
}

