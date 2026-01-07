'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, AtSign, Check, X, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { useAction, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { MeshGradientGhost } from '@/components/shared/MeshGradientGhost'
import { useUsernameValidation } from '@/hooks/useUsernameValidation'
import { BRAND_NAME, THEME_COLORS } from '@/lib/constants/branding'

interface UsernameOnboardingModalProps {
  walletAddress: string
  onComplete: () => void
}

export function UsernameOnboardingModal({
  walletAddress,
  onComplete,
}: UsernameOnboardingModalProps) {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzingWallet, setIsAnalyzingWallet] = useState(false)

  // Use the extracted hook for validation
  const validation = useUsernameValidation(username)

  // Mutations
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding)
  const analyzeWalletHistory = useAction(api.onboarding.analyzeWalletHistory)

  const canSubmit = validation.isValid && !isSubmitting && !isAnalyzingWallet

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Complete onboarding with username
      await completeOnboarding({
        walletAddress,
        username: username.toLowerCase().trim(),
        name: name.trim() || undefined,
        email: email.trim() || undefined,
      })

      // Start wallet history analysis in background
      setIsAnalyzingWallet(true)
      try {
        await analyzeWalletHistory({ walletAddress })
      } catch (err) {
        // Non-fatal: wallet analysis can fail without blocking onboarding
        console.warn('Wallet history analysis failed:', err)
      }
      setIsAnalyzingWallet(false)

      // Complete!
      onComplete()
    } catch (err) {
      console.error('Onboarding error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop - not dismissible */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`relative w-full max-w-md bg-[${THEME_COLORS.BACKGROUND}] border border-white/10 rounded-2xl shadow-2xl overflow-hidden`}
      >
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Content */}
        <div className="relative p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-28 mb-4">
              <MeshGradientGhost animated={true} variant="caisper" />
            </div>
            <h2 className="text-2xl font-light text-white text-center">Welcome to {BRAND_NAME}</h2>
            <p className="text-white/60 text-center mt-2">Choose a username to get started</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username (Required) */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-white/80">
                <AtSign className="w-4 h-4" />
                Username <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="ghosthunter"
                  className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 transition-all ${
                    validation.status === 'available'
                      ? 'border-green-500/50 focus:ring-green-500/30'
                      : validation.status === 'taken' || validation.status === 'invalid'
                        ? 'border-red-500/50 focus:ring-red-500/30'
                        : 'border-white/10 focus:ring-primary/30'
                  }`}
                  autoFocus
                  disabled={isSubmitting}
                />
                {/* Status Icon */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {validation.status === 'checking' && (
                    <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                  )}
                  {validation.status === 'available' && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                  {(validation.status === 'taken' || validation.status === 'invalid') && (
                    <X className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              {validation.message && (
                <p
                  className={`text-xs ${
                    validation.status === 'available'
                      ? 'text-green-400'
                      : validation.status === 'taken' || validation.status === 'invalid'
                        ? 'text-red-400'
                        : 'text-white/40'
                  }`}
                >
                  {validation.message}
                </p>
              )}
            </div>

            {/* Name (Optional) */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-white/80">
                <User className="w-4 h-4" />
                Display Name <span className="text-white/40 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                disabled={isSubmitting}
              />
            </div>

            {/* Email (Optional) */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-white/80">
                <Mail className="w-4 h-4" />
                Email <span className="text-white/40 text-xs">(optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                disabled={isSubmitting}
              />
              <p className="text-xs text-white/40">
                Only used for important notifications. Never shared.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium transition-all ${
                canSubmit
                  ? 'bg-primary text-black hover:bg-primary/90'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              {isSubmitting || isAnalyzingWallet ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isAnalyzingWallet ? 'Setting up your profile...' : 'Creating account...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Get Started
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-xs text-white/30 text-center mt-6">
            By continuing, you agree to our Terms of Service
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
