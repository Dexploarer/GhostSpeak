'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
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
  Sparkles
} from 'lucide-react'

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
        'sticky top-0 h-screen flex flex-col border-r border-white/10 bg-gray-950/50 backdrop-blur-xl transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo Section */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-lime-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Image 
              src="/ghost-logo.png" 
              alt="GhostSpeak" 
              width={32} 
              height={32}
              className="object-contain"
            />
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold text-white tracking-tight">
              GhostSpeak
            </span>
          )}
        </Link>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors hidden lg:block"
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
                  ? 'bg-lime-500/10 text-lime-400' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-lime-500 rounded-r-full" />
              )}
              
              <Icon className={cn(
                'w-5 h-5 shrink-0',
                active ? 'text-lime-400' : 'text-gray-500 group-hover:text-gray-300'
              )} />
              
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>
      
      {/* x402 Quick Access */}
      <div className="p-3 border-t border-white/5">
        <Link
          href="/x402/discover"
          className={cn(
            'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200',
            'bg-linear-to-r from-lime-500/10 to-cyan-500/10 border border-lime-500/20',
            'text-lime-400 hover:from-lime-500/20 hover:to-cyan-500/20'
          )}
        >
          <Sparkles className="w-5 h-5 shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span>x402 Protocol</span>
              <span className="text-xs text-gray-500">Discover & Integrate</span>
            </div>
          )}
        </Link>
      </div>
      
      {/* Protocol Status */}
      {!isCollapsed && (
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Network</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 font-mono">Mainnet</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
