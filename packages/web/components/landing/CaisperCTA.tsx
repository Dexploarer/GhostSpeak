'use client'

import { motion } from 'framer-motion'
import { MessageSquare, Shield, Zap, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MeshGradientGhost } from '@/components/shared/MeshGradientGhost'
import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useWalletModal } from '@/lib/wallet/WalletModal'
import { useRouter } from 'next/navigation'

/**
 * CaisperCTA - Prominent call-to-action to chat with Caisper
 *
 * The AI-powered credential verification agent that demonstrates
 * GhostSpeak's capabilities in a conversational interface.
 */
export function CaisperCTA() {
  const { publicKey } = useWallet()
  const { setVisible } = useWalletModal()
  const router = useRouter()

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
      desc: 'Check any agent\'s W3C credentials instantly',
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
    <section className="py-20 sm:py-28 md:py-36 bg-linear-to-b from-background via-primary/5 to-background relative overflow-hidden border-t border-border">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary)/10,transparent_60%)]" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left side - Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest backdrop-blur-xl">
              <MessageSquare className="w-4 h-4" />
              Live Demo
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-[0.95]">
                Meet{' '}
                <span className="text-primary italic">Caisper</span>
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground font-light leading-relaxed max-w-xl">
                Your AI-powered trust detective. Chat with Caisper to verify credentials,
                check Ghost Scores, and discover trusted agents—all in natural language.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-4">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <Button
                onClick={handleChatClick}
                size="lg"
                className="h-16 px-10 rounded-2xl text-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_50px_rgba(204,255,0,0.3)] group"
              >
                <MessageSquare className="mr-3 w-6 h-6" />
                Chat with Caisper
                <ArrowRight className="ml-3 w-6 h-6 transition-transform group-hover:translate-x-2" />
              </Button>
              <p className="text-sm text-muted-foreground/60 mt-4 font-mono">
                {publicKey ? 'Start chatting now' : 'Connect wallet to start'}
              </p>
            </motion.div>
          </motion.div>

          {/* Right side - Ghost mascot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex items-center justify-center"
          >
            {/* Glow effects */}
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-[100px]" />

            {/* Chat bubble decoration */}
            <div className="absolute -top-4 -right-4 sm:top-0 sm:right-0 px-4 py-2 bg-card border border-border rounded-2xl rounded-br-sm shadow-xl">
              <p className="text-sm font-medium">
                &quot;Hold my ectoplasm... 👻&quot;
              </p>
            </div>

            {/* Ghost */}
            <div className="relative w-[280px] h-[350px] sm:w-[350px] sm:h-[440px]">
              <MeshGradientGhost
                className="drop-shadow-[0_0_80px_rgba(204,255,0,0.4)]"
                animated={true}
                interactive={true}
                variant="caisper"
              />
            </div>

            {/* Stats decoration */}
            <div className="absolute -bottom-4 -left-4 sm:bottom-0 sm:left-0 px-4 py-3 bg-card border border-border rounded-2xl rounded-bl-sm shadow-xl">
              <div className="text-xs text-muted-foreground mb-1">Ghost Score</div>
              <div className="text-2xl font-black text-primary">9,200<span className="text-sm text-muted-foreground">/10,000</span></div>
              <div className="text-xs text-primary/80 font-mono">PLATINUM</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
