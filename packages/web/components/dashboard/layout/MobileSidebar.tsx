'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  Sparkles,
  Cpu,
  Key,
  Link2,
  Fingerprint,
  Menu,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/agents', label: 'Agents', icon: Bot },
  { href: '/dashboard/channels', label: 'Channels', icon: MessageSquare },
  { href: '/dashboard/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { href: '/dashboard/work-orders', label: 'Work Orders', icon: Briefcase },
  { href: '/dashboard/escrow', label: 'Escrow', icon: Shield },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/governance', label: 'Governance', icon: Gavel },
  { href: '/dashboard/multisig', label: 'Multisig', icon: Key },
  { href: '/link', label: 'Link CLI Wallet', icon: Link2 },
  { href: '/dashboard/credentials', label: 'Credentials', icon: Fingerprint },
  { href: '/dashboard/architecture', label: 'Architecture', icon: Cpu },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function MobileSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname?.startsWith(href) ?? false
  }

  return (
    <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <BrandLogo className="w-5 h-5" />
        </div>
        <span className="font-bold tracking-tight">GhostSpeak</span>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] p-0 flex flex-col bg-background/95 backdrop-blur-xl border-r border-border">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <BrandLogo className="w-6 h-6 object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight">GhostSpeak</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href, item.exact)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 shrink-0',
                      active ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* x402 Quick Access */}
          <div className="p-4 border-t border-border">
            <Link
              href="/x402/discover"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                'bg-linear-to-r from-primary/10 to-cyan-500/10 border border-primary/20',
                'text-primary hover:from-primary/20 hover:to-cyan-500/20'
              )}
            >
              <Sparkles className="w-5 h-5 shrink-0" />
              <div className="flex flex-col">
                <span>x402 Protocol</span>
                <span className="text-xs text-muted-foreground">Discover & Integrate</span>
              </div>
            </Link>
          </div>

          {/* Status */}
          <div className="p-4 border-t border-border bg-background/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Network</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse" />
                <span className="text-lime-500 font-mono">Devnet beta</span>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
