'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { MessageSquare, Shield, Zap, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MeshGradientGhost } from '@/components/shared/MeshGradientGhost'
import { MagneticButton } from '@/components/animations/MagneticButton'
import { useScrollReveal } from '@/lib/animations/hooks'
import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useWalletModal } from '@/lib/wallet/WalletModal'
import { useRouter } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'

/**
 * CaisperCTAEnhanced - Interactive 3D Caisper showcase with advanced animations
 *
 * Features:
 * - 3D mouse parallax on ghost character
 * - Floating UI cards that orbit around ghost
 * - Typewriter effect on speech bubble
 * - Magnetic button with glow effects
 * - Smooth entrance animations
 */
export function CaisperCTA() {
  const { publicKey } = useWallet()
  const { setVisible } = useWalletModal()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [displayedText, setDisplayedText] = useState('')
  const fullText = 'Hold my ectoplasm... 👻'

  const { ref, isInView } = useScrollReveal(0.2, true)

  // Mouse tracking for 3D parallax
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [10, -10]), {
    stiffness: 150,
    damping: 20,
  })
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-10, 10]), {
    stiffness: 150,
    damping: 20,
  })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      mouseX.set(e.clientX - centerX)
      mouseY.set(e.clientY - centerY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  // Typewriter effect
  useEffect(() => {
    if (!isInView) return
    let currentIndex = 0
    const interval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(interval)
      }
    }, 80)
    return () => clearInterval(interval)
  }, [isInView])

  const handleChatClick = () => {
    if (publicKey) {
      router.push('/caisper')
    } else {
      setVisible(true)
    }
  }

  const features = [
    {
      icon: Shield,
      title: 'Verify Credentials',
      desc: "Check any agent's W3C credentials instantly",
    },
    {
      icon: Zap,
      title: 'Check Ghost Scores',
      desc: 'Get real-time reputation data from on-chain',
    },
    {
      icon: MessageSquare,
      title: 'Discover Agents',
      desc: 'Find trusted agents by capability and score',
    },
  ]

  return (
    <section
      ref={ref}
      className="py-20 sm:py-28 md:py-36 bg-gradient-to-b from-background via-primary/5 to-background relative overflow-hidden border-t border-border"
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary)/10,transparent_60%)]" />

      {/* Animated grid background */}
      <motion.div
        animate={{
          opacity: [0.02, 0.04, 0.02],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--primary) 1px, transparent 1px),
            linear-gradient(to bottom, var(--primary) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left side - Content */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest backdrop-blur-xl"
            >
              <MessageSquare className="w-4 h-4" />
              Live AI Demo
            </motion.div>

            {/* Headline */}
            <div className="space-y-4">
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-[0.95]"
              >
                Meet <span className="text-primary italic">Caisper</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="text-lg sm:text-xl text-muted-foreground font-light leading-relaxed max-w-xl"
              >
                Your AI-powered trust detective. Chat with Caisper to verify credentials, check
                Ghost Scores, and discover trusted agents—all in natural language.
              </motion.p>
            </div>

            {/* Feature list */}
            <div className="space-y-4">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -30 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                  whileHover={{ x: 5, scale: 1.02 }}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-primary/5 transition-all cursor-default group"
                >
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 group-hover:border-primary/40 transition-all"
                  >
                    <feature.icon className="w-6 h-6 text-primary" />
                  </motion.div>
                  <div>
                    <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <MagneticButton strength={0.3}>
                <Button
                  onClick={handleChatClick}
                  size="lg"
                  className="h-16 px-10 rounded-2xl text-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_60px_rgba(var(--primary-rgb),0.4)] group relative overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.6 }}
                  />
                  <span className="relative z-10 flex items-center">
                    <MessageSquare className="mr-3 w-6 h-6" />
                    Chat with Caisper
                    <ArrowRight className="ml-3 w-6 h-6 transition-transform group-hover:translate-x-2" />
                  </span>
                </Button>
              </MagneticButton>
              <p className="text-sm text-muted-foreground/60 mt-4 font-mono text-center">
                {publicKey ? 'Start chatting now' : 'Connect wallet to start'}
              </p>
            </motion.div>
          </motion.div>

          {/* Right side - 3D Ghost with floating cards */}
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="relative flex items-center justify-center perspective-2000 min-h-[500px]"
          >
            {/* Floating cards that orbit around ghost */}
            <motion.div
              style={{
                rotateX,
                rotateY,
              }}
              className="relative preserve-3d"
            >
              {/* Main ghost with glow */}
              <motion.div
                animate={{
                  y: [0, -15, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative w-[280px] h-[350px] sm:w-[350px] sm:h-[440px]"
              >
                <div className="absolute inset-0 bg-primary/30 rounded-full blur-[120px]" />
                <MeshGradientGhost
                  className="drop-shadow-[0_0_80px_rgba(204,255,0,0.5)] relative z-10"
                  animated={true}
                  interactive={true}
                  variant="caisper"
                />
              </motion.div>

              {/* Speech bubble - Top right */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={
                  isInView
                    ? {
                      opacity: 1,
                      scale: 1,
                      y: 0,
                    }
                    : {}
                }
                transition={{ delay: 1, duration: 0.5, type: 'spring' }}
                className="absolute -top-8 -right-8 sm:-top-4 sm:-right-4 px-5 py-3 bg-card border border-primary/30 rounded-2xl rounded-br-sm shadow-xl max-w-[200px] z-20"
                style={{
                  transform: 'translateZ(50px)',
                }}
              >
                <p className="text-sm font-medium">
                  {displayedText}
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    |
                  </motion.span>
                </p>
              </motion.div>

              {/* Stats card - Bottom left */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 1.2, duration: 0.5, type: 'spring' }}
                whileHover={{ scale: 1.05, rotate: -2 }}
                className="absolute -bottom-8 -left-8 sm:-bottom-4 sm:-left-4 px-6 py-4 bg-card border border-border rounded-2xl rounded-bl-sm shadow-xl z-20"
                style={{
                  transform: 'translateZ(40px)',
                }}
              >
                <div className="text-xs text-muted-foreground mb-2">Ghost Score</div>
                <div className="text-3xl font-black text-primary">
                  9,200<span className="text-sm text-muted-foreground">/10,000</span>
                </div>
                <div className="text-xs text-primary/80 font-mono mt-1">PLATINUM TIER</div>
              </motion.div>
            </motion.div>

            {/* Orbiting particles */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary/40"
                animate={{
                  x: [0, Math.cos((i * 2 * Math.PI) / 3) * 200, 0],
                  y: [0, Math.sin((i * 2 * Math.PI) / 3) * 200, 0],
                  opacity: [0.2, 0.6, 0.2],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'linear',
                }}
                style={{
                  left: '50%',
                  top: '50%',
                }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
