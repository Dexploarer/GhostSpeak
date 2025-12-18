'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
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
  X,
  Menu,
  BookOpen,
  Sparkles,
  Sun,
  Moon,
  Home,
  ArrowUpRight
} from 'lucide-react'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard', exact: true },
  { label: 'AI Agents', icon: Bot, href: '/dashboard/agents' },
  { label: 'Channels', icon: MessageSquare, href: '/dashboard/channels' },
  { label: 'Marketplace', icon: ShoppingCart, href: '/dashboard/marketplace' },
  { label: 'Payments', icon: Zap, href: '/dashboard/payments' },
  { label: 'Escrow', icon: Shield, href: '/dashboard/escrow', badge: 'Soon' },
  { label: 'Work Orders', icon: Briefcase, href: '/dashboard/work-orders', badge: 'Soon' },
  { label: 'Governance', icon: Vote, href: '/dashboard/governance', badge: 'Soon' },
  { label: 'Analytics', icon: BarChart3, href: '/dashboard/analytics', badge: 'Soon' },
]

const quickLinks = [
  { label: 'Discover Agents', href: '/x402/discover', icon: Sparkles },
  { label: 'Documentation', href: '/docs', icon: BookOpen },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    // Check if dark mode is enabled
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDarkMode()
    
    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const toggleTheme = () => {
    const newDark = !isDark
    setIsDark(newDark)
    localStorage.setItem('theme', newDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newDark)
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(204,255,0,0.3)] group-hover:shadow-[0_0_30px_rgba(204,255,0,0.5)] transition-shadow">
            {/* Light theme icon */}
            <Image 
              src="/icon.png"
              alt="GhostSpeak"
              width={40}
              height={40}
              className={cn("object-cover absolute inset-0 transition-opacity", isDark ? "opacity-0" : "opacity-100")}
            />
            {/* Dark theme icon */}
            <Image 
              src="/2.png"
              alt="GhostSpeak"
              width={40}
              height={40}
              className={cn("object-cover absolute inset-0 transition-opacity", isDark ? "opacity-100" : "opacity-0")}
            />
          </div>
          <div>
            <span className="font-black text-lg tracking-tight text-foreground">GhostSpeak</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-mono text-primary uppercase">Devnet</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Links */}
      <div className="px-4 pb-2">
        <div className="flex gap-1.5">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors"
            >
              <link.icon className="w-3 h-3" />
              <span className="truncate">{link.label.split(' ')[0]}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <span className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Platform</span>
        <div className="mt-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href
              : pathname.startsWith(item.href) && pathname !== '/dashboard'

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(204,255,0,0.3)]" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive && "text-primary-foreground")} />
                <span className="flex-1">{item.label}</span>
                {item.badge && !isActive && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        <div className="pt-6">
          <span className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Settings</span>
          <div className="mt-2">
            <Link
              href="/dashboard/settings"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <Settings className="w-4 h-4" />
              <span className="flex-1">Configuration</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Soon</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Theme Toggle & Home */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-xs font-medium">{isDark ? 'Light' : 'Dark'}</span>
          </button>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="text-xs font-medium">Home</span>
          </Link>
        </div>

        {/* Version */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground">v0.1.0</span>
          </div>
          <span className="text-[10px] font-bold text-primary uppercase">MVP</span>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[30%] -right-[20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[150px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden">
            <Image 
              src="/icon.png"
              alt="GhostSpeak"
              width={32}
              height={32}
              className={cn("object-cover absolute inset-0 transition-opacity", isDark ? "opacity-0" : "opacity-100")}
            />
            <Image 
              src="/2.png"
              alt="GhostSpeak"
              width={32}
              height={32}
              className={cn("object-cover absolute inset-0 transition-opacity", isDark ? "opacity-100" : "opacity-0")}
            />
          </div>
          <span className="font-black text-foreground">GhostSpeak</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary">DEVNET</span>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border lg:hidden flex flex-col"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-card/50 backdrop-blur-xl border-r border-border">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        {/* Desktop Header */}
        <div className="hidden lg:flex sticky top-0 z-20 h-16 bg-background/80 backdrop-blur-xl border-b border-border items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Dashboard</span>
            <span className="text-muted-foreground/30">/</span>
            <span className="text-sm font-bold text-foreground capitalize">
              {pathname === '/dashboard' ? 'Overview' : pathname.split('/').pop()?.replace('-', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-6xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
