'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  ShoppingCart,
  BarChart3,
  Shield,
  Vote,
  Briefcase,
  Zap,
  Settings,
  LogOut
} from 'lucide-react'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard', exact: true },
  { label: 'AI Agents', icon: Bot, href: '/dashboard/agents' },
  { label: 'Channels', icon: MessageSquare, href: '/dashboard/channels' },
  { label: 'Marketplace', icon: ShoppingCart, href: '/dashboard/marketplace' },
  { label: 'Payments', icon: Zap, href: '/dashboard/payments' },
  { label: 'Escrow', icon: Shield, href: '/dashboard/escrow' },
  { label: 'Work Orders', icon: Briefcase, href: '/dashboard/work-orders' },
  { label: 'Governance', icon: Vote, href: '/dashboard/governance' },
  { label: 'Analytics', icon: BarChart3, href: '/dashboard/analytics' },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 hidden lg:flex flex-col h-[calc(100vh-4rem)] sticky top-16 border-r border-white/10 bg-gray-950/50 backdrop-blur-xl">
      <div className="p-4 space-y-6 flex-1 overflow-y-auto no-scrollbar">
        
        {/* Main Navigation */}
        <div className="space-y-1">
          <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Platform
          </h3>
          {navItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href
              : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-purple-500/10 text-purple-400 shadow-[0_0_20px_-5px_rgba(168,85,247,0.4)] border border-purple-500/20" 
                    : "text-gray-400 hover:text-gray-100 hover:bg-white/5"
                )}
              >
                <item.icon className={cn(
                  "w-4 h-4 transition-colors",
                  isActive ? "text-purple-400" : "text-gray-500 group-hover:text-gray-300"
                )} />
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Secondary / Bottom Section */}
        <div className="pt-4 border-t border-white/10">
          <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Settings
          </h3>
          <Link
            href="/dashboard/settings"
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 text-gray-400 hover:text-gray-100 hover:bg-white/5"
            )}
          >
            <Settings className="w-4 h-4 text-gray-500" />
            Configuration
          </Link>
        </div>
      </div>
      
      {/* User / Footer */}
      <div className="p-4 border-t border-white/10">
         {/* This could be a user profile snippet or just extra links */}
         <div className="p-3 rounded-xl bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-white/5">
            <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-purple-300">v2.0.1 Beta</span>
                <StatusBeacon status="active" size="sm" />
            </div>
         </div>
      </div>
    </aside>
  )
}

import { StatusBeacon } from '../shared/StatusBeacon'
