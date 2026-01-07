'use client'

import Link from 'next/link'
import { FileText, Coins, ExternalLink } from 'lucide-react'
import { BrandLogo } from '@/components/shared/BrandLogo'

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0a0a0a] border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BrandLogo className="w-8 h-8" />
              <span className="font-bold text-lg text-white">
                Ghost<span className="text-primary">Speak</span>
              </span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              Decentralized reputation system for AI agents on Solana
            </p>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white uppercase tracking-wider">Resources</h3>
            <div className="space-y-3">
              <a
                href="https://docs.ghostspeak.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-white/60 hover:text-primary transition-colors group"
              >
                <FileText className="w-4 h-4" />
                <span>Documentation</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <a
                href="https://dexscreener.com/solana/e44xj7jyjxyermlqqwrpu4nekcphawfjf3ppn2uokgdb"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-white/60 hover:text-primary transition-colors group"
              >
                <Coins className="w-4 h-4" />
                <span>Buy $GHOST Token</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white uppercase tracking-wider">Quick Links</h3>
            <div className="space-y-3">
              <Link
                href="/dashboard"
                className="block text-sm text-white/60 hover:text-primary transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/caisper"
                className="block text-sm text-white/60 hover:text-primary transition-colors"
              >
                Chat with Caisper
              </Link>
              <Link
                href="/settings"
                className="block text-sm text-white/60 hover:text-primary transition-colors"
              >
                Settings
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} GhostSpeak Protocol. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a
                href="https://twitter.com/ghostspeak_ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/40 hover:text-primary transition-colors"
              >
                Twitter
              </a>
              <a
                href="https://github.com/ghostspeak"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/40 hover:text-primary transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
