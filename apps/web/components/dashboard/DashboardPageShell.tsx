'use client'

import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'
import { VerificationContractCard } from '@/components/dashboard/VerificationContractCard'
import { isVerifiedSessionForWallet } from '@/lib/auth/verifiedSession'
import { Loader2 } from 'lucide-react'

type DashboardPageShellProps = {
  title: string
  description?: string
  backHref?: string
  children: React.ReactNode
}

/**
 * Shared wrapper for dashboard sub-pages that must be accessible only when:
 * - wallet is connected
 * - AND SIWS session is verified for that wallet
 *
 * Semantics intentionally mirror [`DashboardPage()`](../../app/dashboard/page.tsx:129)
 * and [`ObservePage()`](../../app/dashboard/observe/page.tsx:65).
 */
export function DashboardPageShell({
  title,
  description,
  backHref = '/dashboard',
  children,
}: DashboardPageShellProps) {
  const { publicKey, connecting } = useWallet()
  const router = useRouter()

  const walletAddress = useMemo(() => publicKey ?? null, [publicKey])
  const [hasVerifiedSession, setHasVerifiedSession] = useState(false)

  // A "verified" session means wallet connected AND SIWS session matches the wallet.
  useEffect(() => {
    if (!walletAddress) {
      setHasVerifiedSession(false)
      return
    }

    const check = () => setHasVerifiedSession(isVerifiedSessionForWallet(walletAddress))
    check()

    // Same-tab localStorage writes do not fire the "storage" event, so poll briefly.
    const intervalId = window.setInterval(() => {
      const next = isVerifiedSessionForWallet(walletAddress)
      setHasVerifiedSession(next)
      if (next) window.clearInterval(intervalId)
    }, 500)

    return () => window.clearInterval(intervalId)
  }, [walletAddress])

  // Redirect to home if not connected.
  // Avoid bouncing users away while wallet auto-connect is still initializing.
  useEffect(() => {
    if (publicKey) return
    if (connecting) return

    const hasRememberedWallet = (() => {
      try {
        return !!window.localStorage.getItem('walletName')
      } catch {
        return false
      }
    })()

    const redirectTimeoutMs = hasRememberedWallet ? 1500 : 500
    const timeoutId = window.setTimeout(() => {
      router.push('/')
    }, redirectTimeoutMs)

    return () => window.clearTimeout(timeoutId)
  }, [publicKey, connecting, router])

  if (publicKey === undefined) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden="true" />
      </div>
    )
  }

  // Session gating: all dashboard sub-pages require an existing verified SIWS session.
  if (!publicKey) {
    return null
  }

  if (!hasVerifiedSession) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          <header className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-light text-white">{title}</h1>
            <Link
              href={backHref}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Back
            </Link>
          </header>

          <div className="space-y-4">
            <VerificationContractCard className="p-6 bg-[#111111] border border-white/10 rounded-xl" />
            <p className="text-xs text-white/40 leading-relaxed">
              To continue, approve the “Sign to authenticate” request in your wallet. These pages
              only unlock after your SIWS session is verified.
            </p>
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-light text-white">{title}</h1>
            {description && <p className="text-sm text-white/60 mt-2">{description}</p>}
          </div>
          <Link
            href={backHref}
            className="shrink-0 text-sm text-white/60 hover:text-white transition-colors"
          >
            Back
          </Link>
        </header>

        {children}
      </main>

      <Footer />
    </div>
  )
}
