'use client'

import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell'
import { ExternalLink, Shield } from 'lucide-react'

export default function DashboardPrivacyPage() {
  return (
    <DashboardPageShell
      title="Privacy"
      description="Privacy settings are not implemented in the web dashboard yet."
    >
      <div className="space-y-4">
        <section className="p-5 sm:p-6 bg-[#111111] border border-white/10 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-medium text-white">Not available in web yet</h2>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            The web dashboard does not currently persist privacy settings on-chain. Use the SDK/CLI documentation
            for the intended flow.
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href="https://docs.ghostspeak.io/dashboard/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:border-white/20 transition-all"
            >
              Privacy docs <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
            <a
              href="https://docs.ghostspeak.io/sdk/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:border-white/20 transition-all"
            >
              SDK privacy docs <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
          <div className="mt-3 text-xs text-white/40">
            CLI: <span className="font-mono text-white/70">ghostspeak privacy</span>
          </div>
        </section>
      </div>
    </DashboardPageShell>
  )
}

