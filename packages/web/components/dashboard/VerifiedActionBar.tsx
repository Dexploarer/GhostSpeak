'use client'

import Link from 'next/link'
import { Eye, MessageSquare, Plus, Settings } from 'lucide-react'

type VerifiedActionBarProps = {
  className?: string
}

/**
 * Phase A: Compact, verified-only action bar.
 * Surfaces only routes that exist today.
 */
export function VerifiedActionBar({ className }: VerifiedActionBarProps) {
  return (
    <section
      data-testid="verified-action-bar"
      role="region"
      aria-labelledby="verified-actions-heading"
      className={
        className ??
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-[#111111] border border-white/10 rounded-xl'
      }
    >
      <h2 id="verified-actions-heading" className="sr-only">
        Verified session actions
      </h2>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Link
          href="/caisper"
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
        >
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          Chat with Caisper
        </Link>

        <Link
          href="/agents/register"
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm hover:bg-white/10 hover:border-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Register Agent
        </Link>

        <Link
          href="/dashboard/observe"
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm hover:bg-white/10 hover:border-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
        >
          <Eye className="w-4 h-4" aria-hidden="true" />
          Observe
        </Link>
      </div>

      <div className="flex w-full sm:w-auto items-center justify-end">
        <Link
          href="/settings"
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
        >
          <Settings className="w-3.5 h-3.5" aria-hidden="true" />
          Settings
        </Link>
      </div>
    </section>
  )
}
