'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

export function ManifestoSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  // Parallax for text layers
  const y1 = useTransform(scrollYProgress, [0, 1], [100, -100])
  const y2 = useTransform(scrollYProgress, [0, 1], [200, -200])

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center bg-primary text-primary-foreground overflow-hidden py-32"
    >
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-10 bg-[url('/assets/noise.svg')] mix-blend-multiply pointer-events-none" />

      {/* Large background text for texture */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none overflow-hidden select-none opacity-5">
        <div className="text-[20vw] font-black leading-none -translate-x-10">GHOST</div>
        <div className="text-[20vw] font-black leading-none text-right translate-x-10">SPEAK</div>
      </div>

      <div className="max-w-[90vw] mx-auto relative z-10 grid gap-12 md:gap-24">
        {/* Statement 1 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center"
        >
          <div className="text-[12px] md:text-sm font-bold uppercase tracking-[0.2em] mb-2 border-b-2 border-primary-foreground/20 inline-block pb-1">
            What Makes Us Different
          </div>
          <h2 className="text-6xl md:text-8xl lg:text-[10rem] font-black tracking-tighter leading-[0.85] uppercase">
            Trust <br />
            <span className="text-background drop-shadow-xl stroke-primary-foreground">
              Built In
            </span>
          </h2>
        </motion.div>

        {/* Statement 2 - Left Aligned with Parallax */}
        <motion.div style={{ y: y1 }} className="md:text-left text-center md:pl-20">
          <div className="inline-flex flex-col items-start">
            <span className="bg-primary-foreground text-primary px-4 py-1 text-xl font-bold uppercase -rotate-2 transform mb-2">
              Protection
            </span>
            <h3 className="text-5xl md:text-8xl font-black tracking-tighter w-full leading-[0.9]">
              Escrow <br />
              <span className="text-transparent stroke-text-primary-foreground opacity-70">
                Backed
              </span>
            </h3>
          </div>
        </motion.div>

        {/* Statement 3 - Right Aligned with Parallax */}
        <motion.div style={{ y: y2 }} className="md:text-right text-center md:pr-20">
          <div className="inline-flex flex-col items-end">
            <span className="text-xl font-bold uppercase mb-2">Reputation</span>
            <h3 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9]">
              <span className="text-7xl md:text-[8rem] mr-2">On</span> <br />
              Chain
            </h3>
            <p className="mt-4 max-w-md text-lg md:text-xl font-medium opacity-80 leading-tight">
              Every payment builds verified reputation. Know who you&apos;re paying before you pay.
            </p>
          </div>
        </motion.div>

        {/* Closing Impact */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-20"
        >
          <div className="inline-block p-1 bg-primary-foreground transform rotate-1">
            <div className="bg-background border-2 border-primary-foreground p-8 md:p-12">
              <h4 className="text-4xl md:text-6xl font-black uppercase mb-4 tracking-tight text-foreground">
                Dispute Resolution
              </h4>
              <p className="font-mono text-muted-foreground uppercase tracking-widest text-sm">
                On-Chain Arbitration When Issues Arise
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        .stroke-text-primary-foreground {
          -webkit-text-stroke: 2px var(--primary-foreground);
        }
      `}</style>
    </div>
  )
}
