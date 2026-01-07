'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Bot, Shield, Trophy } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'

export default function AgentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const address = params.address as string

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/40 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="bg-[#111111] border border-white/10 rounded-xl p-8">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-white/5 rounded-2xl">
              <Bot className="w-12 h-12 text-white/60" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-light text-white font-mono">{address}</h1>
                <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-white/40">
                  Agent
                </div>
              </div>

              <p className="text-white/60 mb-6 max-w-2xl">
                Agent details and statistics will appear here. This page is currently under
                development.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/10 pt-6">
                <div className="p-4 bg-black/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-white/40" />
                    <span className="text-xs text-white/40 uppercase tracking-wider">Status</span>
                  </div>
                  <p className="text-white font-medium">Verified</p>
                </div>

                <div className="p-4 bg-black/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4 text-primary/60" />
                    <span className="text-xs text-white/40 uppercase tracking-wider">
                      Ghost Score
                    </span>
                  </div>
                  <p className="text-primary font-medium">Pending</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
