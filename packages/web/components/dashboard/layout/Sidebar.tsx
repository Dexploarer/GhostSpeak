'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { BrandLogo } from '@/components/shared/BrandLogo'
import {
  LayoutDashboard,
  Bot,
  ShoppingBag,
  Briefcase,
  Shield,
  Gavel,
  Settings,
  BarChart3,
  MessageSquare,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Cpu,
  Key,
  Link2,
  Fingerprint,
  Code,
  TrendingUp,
  Star,
  Coins,
  BookOpen,
  Users,
  DollarSign,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/agents', label: 'Agents', icon: Bot },
  { href: '/dashboard/ghost-score', label: 'Ghost Score', icon: Star },
  { href: '/dashboard/credentials', label: 'Credentials', icon: Fingerprint },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/staking', label: 'Staking', icon: Coins },
  { href: '/dashboard/transparency', label: 'Transparency', icon: DollarSign },
  { href: '/dashboard/privacy', label: 'Privacy', icon: Shield },
  { href: '/dashboard/multisig', label: 'Multisig', icon: Key },
  { href: '/link', label: 'Link CLI Wallet', icon: Link2 },
  { href: '/dashboard/api-keys', label: 'API Keys', icon: Code },
  { href: '/dashboard/api-usage', label: 'API Usage', icon: TrendingUp },
  { href: '/api-docs', label: 'API Docs', icon: BookOpen },
  { href: '/dashboard/team', label: 'Team', icon: Users },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname?.startsWith(href) ?? false
  }

  return (
    <aside
      className={cn(
        'sticky top-0 h-screen hidden lg:flex flex-col border-r border-border bg-background/80 backdrop-blur-xl transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo Section */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <BrandLogo className="object-contain" />
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold text-foreground tracking-tight">GhostSpeak</span>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors hidden lg:block"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
              )}

              <Icon
                className={cn(
                  'w-5 h-5 shrink-0',
                  active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
              />

              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Protocol Status */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Network</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse" />
              <span className="text-lime-500 font-mono">Devnet beta</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
