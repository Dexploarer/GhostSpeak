'use client'

import Link from 'next/link'
import { CheckCircle2, ExternalLink, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { isVerifiedSessionForWallet } from '@/lib/auth/verifiedSession'

type VerificationContractCardProps = {
  className?: string
  showObserveLink?: boolean
}

/**
 * Phase A: “Verified-only” framing. Explains what is surfaced on the dashboard.
 * No new features/endpoints; only links to existing verified routes.
 */
export function VerificationContractCard({
  className,
  showObserveLink = true,
}: VerificationContractCardProps) {
  const { publicKey, connected } = useWallet()
  const [hasVerifiedSession, setHasVerifiedSession] = useState(false)

  const walletAddress = useMemo(() => publicKey ?? null, [publicKey])

  useEffect(() => {
    if (!walletAddress || !connected) {
      setHasVerifiedSession(false)
      return
    }

    const check = () => setHasVerifiedSession(isVerifiedSessionForWallet(walletAddress))
    check()

    // The session is written to localStorage by ConnectWalletButton in the same tab,
    // so we poll briefly to pick up the change.
    const intervalId = window.setInterval(() => {
      const next = isVerifiedSessionForWallet(walletAddress)
      setHasVerifiedSession(next)
      if (next) window.clearInterval(intervalId)
    }, 500)

    return () => window.clearInterval(intervalId)
  }, [walletAddress, connected])

  return (
    <section
      data-testid="verification-contract-card"
      role="region"
      aria-labelledby="verification-contract-heading"
      className={className ?? 'p-5 sm:p-6 bg-[#111111] border border-white/10 rounded-xl space-y-4'}
    >
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
          Verified Session
        </p>
        <h2 id="verification-contract-heading" className="text-lg font-light text-white mt-1">
          Session status
        </h2>
        <p className="text-sm text-white/60 mt-2 leading-relaxed">
          Tools appear once your session is verified: wallet connected + signed-in SIWS session.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Checks</p>

        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-white/80">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Wallet connected <span className="text-white/50">({connected ? 'yes' : 'no'})</span>
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-white/80">
            {hasVerifiedSession ? (
              <ShieldCheck className="w-4 h-4 text-green-400 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <span>
              Signed in (SIWS){' '}
              <span className="text-white/50">({hasVerifiedSession ? 'yes' : 'no'})</span>
            </span>
          </li>
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
          Available tools
        </p>

        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-white/80">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <Link
                href="/caisper"
                className="rounded-sm text-white hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
              >
                Chat with Caisper
              </Link>{' '}
              <span className="text-white/50">(assistant)</span>
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-white/80">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <Link
                href="/agents/register"
                className="rounded-sm text-white hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
              >
                Register an Agent
              </Link>{' '}
              <span className="text-white/50">(developer onboarding)</span>
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-white/80">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <Link
                href="/settings"
                className="rounded-sm text-white hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
              >
                Settings
              </Link>{' '}
              <span className="text-white/50">(profile + preferences)</span>
            </span>
          </li>
          {showObserveLink && (
            <li className="flex items-start gap-2 text-sm text-white/80">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <Link
                  href="/dashboard/observe"
                  className="inline-flex items-center gap-1 rounded-sm text-white hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                >
                  Observe
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
                </Link>{' '}
                <span className="text-white/50">(optional)</span>
              </span>
            </li>
          )}

          <li className="pt-1" aria-hidden="true">
            <div className="h-px bg-white/10" />
          </li>

          <li className="flex items-start gap-2 text-sm text-white/80">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <Link
                href="/dashboard/analytics"
                className="rounded-sm text-white hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
              >
                Analytics
              </Link>{' '}
              <span className="text-white/50">(minimal)</span>
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-white/80">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <Link
                href="/dashboard/credentials"
                className="rounded-sm text-white hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
              >
                Credentials
              </Link>{' '}
              <span className="text-white/50">(read-only)</span>
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-white/80">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <Link
                href="/dashboard/privacy"
                className="rounded-sm text-white hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
              >
                Privacy
              </Link>{' '}
              <span className="text-white/50">(docs)</span>
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-white/80">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <Link
                href="/dashboard/api-keys"
                className="rounded-sm text-white hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
              >
                API Keys
              </Link>{' '}
              <span className="text-white/50">(docs)</span>
            </span>
          </li>
        </ul>
      </div>
    </section>
  )
}
