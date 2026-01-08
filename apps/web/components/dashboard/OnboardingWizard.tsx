'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  TrendingUp,
  Shield,
  DollarSign,
  Activity,
  MessageSquare,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { MeshGradientGhost } from '@/components/shared/MeshGradientGhost'
import { useRouter } from 'next/navigation'

const ONBOARDING_STORAGE_KEY = 'ghostspeak_onboarding_completed'

interface OnboardingWizardProps {
  ghostScore: number
  hasActivity: boolean
}

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`h-1.5 rounded-full transition-all duration-300 ${index < currentStep
            ? 'w-8 bg-primary'
            : index === currentStep
              ? 'w-8 bg-primary/60'
              : 'w-4 bg-white/20'
            }`}
        />
      ))}
    </div>
  )
}

export function OnboardingWizard({ ghostScore, hasActivity }: OnboardingWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // Check if onboarding should be shown
  useEffect(() => {
    // SSR guard: localStorage is only available in browser
    if (typeof window === 'undefined') return

    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_STORAGE_KEY)

    // Show onboarding if: ghostScore is 0, no activity, and hasn't completed before
    if (ghostScore === 0 && !hasActivity && !hasCompletedOnboarding) {
      setIsVisible(true)
    }
  }, [ghostScore, hasActivity])

  const handleSkip = () => {
    setIsExiting(true)
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
      }
      setIsVisible(false)
    }, 300)
  }

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = (action: 'verify' | 'chat') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    }
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      if (action === 'chat') {
        router.push('/caisper')
      }
      // For 'verify', stay on dashboard where the verify functionality exists
    }, 300)
  }

  if (!isVisible) return null

  const steps = [
    // Step 1: Welcome
    {
      title: 'Welcome to GhostSpeak',
      content: (
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-40 h-48">
              <MeshGradientGhost animated={true} interactive={true} variant="caisper" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-primary">
              <TrendingUp className="w-6 h-6" />
              <span className="text-xl font-medium">Ghost Score</span>
            </div>
            <p className="text-white/70 leading-relaxed max-w-md mx-auto">
              Your <span className="text-primary font-semibold">Ghost Score</span> is your on-chain
              reputation for AI agents. It ranges from{' '}
              <span className="text-white font-medium">0 to 10,000</span> and reflects your
              trustworthiness in the decentralized AI ecosystem.
            </p>
            <div className="flex items-center justify-center gap-6 pt-4">
              <div className="text-center">
                <div className="text-3xl font-light text-primary">0</div>
                <div className="text-xs text-white/40 mt-1">Newcomer</div>
              </div>
              <div className="flex-1 h-px bg-linear-to-r from-white/20 via-primary/40 to-white/20 max-w-32" />
              <div className="text-center">
                <div className="text-3xl font-light text-primary">10,000</div>
                <div className="text-xs text-white/40 mt-1">Legend</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    // Step 2: Build Reputation
    {
      title: 'Build Your Reputation',
      content: (
        <div className="space-y-6">
          <p className="text-white/70 text-center mb-8">
            There are three main ways to increase your Ghost Score:
          </p>
          <div className="space-y-4">
            {/* Verify Agents */}
            <div className="group flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-primary/30 transition-all">
              <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-all shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Verify AI Agents</h4>
                <p className="text-sm text-white/60 leading-relaxed">
                  Verify AI agents on-chain to earn reputation points. Each successful verification
                  builds trust in the ecosystem.
                </p>
              </div>
            </div>

            {/* Make Payments */}
            <div className="group flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all">
              <div className="p-3 bg-white/5 rounded-lg group-hover:bg-white/10 transition-all shrink-0">
                <DollarSign className="w-5 h-5 text-white/60" />
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Make Payments</h4>
                <p className="text-sm text-white/60 leading-relaxed">
                  Conduct secure transactions through GhostSpeak. On-chain payment history
                  demonstrates reliability.
                </p>
              </div>
            </div>

            {/* Stay Active */}
            <div className="group flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all">
              <div className="p-3 bg-white/5 rounded-lg group-hover:bg-white/10 transition-all shrink-0">
                <Activity className="w-5 h-5 text-white/60" />
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Stay Active</h4>
                <p className="text-sm text-white/60 leading-relaxed">
                  Regular engagement with the platform shows commitment. Consistent activity builds
                  long-term reputation.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    // Step 3: Get Started
    {
      title: 'Get Started',
      content: (
        <div className="text-center space-y-8">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-2xl">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-white/70 leading-relaxed max-w-md mx-auto">
              You're all set! Start building your reputation by taking your first action.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={() => handleComplete('verify')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-black rounded-xl font-medium hover:bg-primary/90 transition-all group"
            >
              <Shield className="w-5 h-5" />
              <span>Verify First Agent</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => handleComplete('chat')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all group"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Chat with Caisper</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      ),
    },
  ]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isExiting ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleSkip} />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{
              opacity: isExiting ? 0 : 1,
              scale: isExiting ? 0.95 : 1,
              y: isExiting ? 20 : 0,
            }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative w-full max-w-xl bg-[#111111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Background Gradient Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Header */}
            <div className="relative flex items-center justify-between p-6 border-b border-white/10">
              <StepIndicator currentStep={currentStep} totalSteps={3} />
              <button
                onClick={handleSkip}
                className="p-2 hover:bg-white/10 rounded-lg transition-all group"
                aria-label="Skip onboarding"
              >
                <X className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* Content */}
            <div className="relative p-6 min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-2xl font-light text-white text-center mb-8">
                    {steps[currentStep].title}
                  </h2>
                  {steps[currentStep].content}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer Navigation */}
            {currentStep < 2 && (
              <div className="relative flex items-center justify-between p-6 border-t border-white/10">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  Skip
                </button>
                <div className="flex items-center gap-3">
                  {currentStep > 0 && (
                    <button
                      onClick={handlePrevious}
                      className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-lg font-medium text-sm hover:bg-primary/90 transition-all group"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Export a hook for resetting onboarding (useful for testing/development)
export function useResetOnboarding() {
  return () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY)
    window.location.reload()
  }
}
