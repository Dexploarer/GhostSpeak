'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { 
  Bot, ShoppingBag, Briefcase, Shield, Gavel, 
  Menu, X, Moon, Sun, Sparkles, TrendingUp, BookOpen,
  ChevronDown, ChevronRight, LayoutDashboard, Coins
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { docsConfig } from '@/config/docs'
import { useWallet } from '@solana/wallet-adapter-react'

const WalletConnectButton = dynamic(
  () => import('@/components/wallet/WalletConnectButton').then((mod) => mod.WalletConnectButton),
  { ssr: false }
)

// Public pages - visible to everyone
const publicNavItems = [
  { href: '/docs', label: 'Docs', icon: BookOpen },
  { href: '/tokenomics', label: '$GHOST', icon: Coins },
  { href: '/x402/discover', label: 'Discover', icon: Sparkles },
]

// Authenticated pages - require wallet connection
const authenticatedNavItems = [
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { href: '/x402/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/work-orders', label: 'Orders', icon: Briefcase },
  { href: '/escrow', label: 'Escrow', icon: Shield },
  { href: '/governance', label: 'Gov', icon: Gavel },
]

export const Navigation: React.FC = () => {
  const pathname = usePathname()
  const { connected } = useWallet()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(true) // Default to dark theme
  const [isScrolled, setIsScrolled] = useState(false)
  
  const { scrollY } = useScroll()
  
  // On landing page, only show public items
  // When connected, show all items
  const isLandingPage = pathname === '/'
  const navItems = isLandingPage 
    ? publicNavItems 
    : connected 
      ? [...publicNavItems, ...authenticatedNavItems]
      : publicNavItems

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50)
  })

  // Check for saved theme preference or default to dark
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = savedTheme === 'dark' || (!savedTheme && true) // Default to dark
    setDarkMode(prefersDark)
    document.documentElement.classList.toggle('dark', prefersDark)
    
    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setDarkMode(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Hide navigation on dashboard routes - dashboard has its own sidebar
  const isDashboardPage = pathname.startsWith('/dashboard')
  
  // Don't render navigation at all on dashboard
  if (isDashboardPage) {
    return null
  }

  const toggleDarkMode = (): void => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newDarkMode)
  }

  const navTransition = {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
    mass: 1,
  }

  return (
    <>
      <motion.nav
        layout
        initial={{ y: -100, opacity: 0 }}
        animate={{ 
          y: 0, 
          opacity: 1,
          width: isScrolled ? 'auto' : '100%',
          maxWidth: isScrolled ? '95%' : '100%',
          top: isScrolled ? 20 : 0,
          borderRadius: isScrolled ? '9999px' : '0px',
        }}
        transition={navTransition}
        className={cn(
          "fixed z-50 left-0 right-0 mx-auto transition-all",
          isScrolled 
            ? "glass-panel px-4 md:px-6 py-2 md:py-3 border border-white/20 dark:border-white/10 shadow-2xl shadow-lime-500/10 w-fit" 
            : cn(
                "border-b py-4 px-4 md:px-8",
                isLandingPage
                  ? "bg-transparent border-transparent"
                  : "glass border-gray-200 dark:border-gray-800"
              )
        )}
        style={{ 
          transition: 'none'
        }}
      >
        <motion.div 
          layout
          className={cn(
            "flex items-center justify-between",
            isScrolled ? "gap-4 md:gap-8" : "gap-2 md:gap-4"
          )}
        >
          
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <motion.div 
              layout
              className="relative w-7 h-7 md:w-8 md:h-8 group-hover:scale-105 transition-transform duration-300"
            >
              {/* Light theme icon */}
              <Image 
                src="/icon.png"
                alt="GhostSpeak"
                width={32}
                height={32}
                className={cn("object-contain absolute inset-0 transition-opacity", darkMode ? "opacity-0" : "opacity-100")}
              />
              {/* Dark theme icon */}
              <Image 
                src="/2.png"
                alt="GhostSpeak"
                width={32}
                height={32}
                className={cn("object-contain absolute inset-0 transition-opacity", darkMode ? "opacity-100" : "opacity-0")}
              />
            </motion.div>
            <motion.span 
              layout
              animate={{ 
                opacity: isScrolled ? (mobileMenuOpen ? 1 : 0) : 1,
                width: isScrolled ? (mobileMenuOpen ? 'auto' : 0) : 'auto',
              }}
              className={cn(
                "text-lg md:text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 group-hover:from-lime-500 group-hover:to-lime-300 hidden sm:block!"
              )}
            >
              GhostSpeak
            </motion.span>
          </Link>

          {/* Desktop Navigation */}
          <motion.div 
            layout
            className="hidden lg:flex items-center gap-1 overflow-hidden"
          >
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.href)
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative px-3 py-2 rounded-full group overflow-hidden shrink-0"
                >
                  <span className={cn(
                    "relative z-10 flex items-center text-sm font-medium transition-colors duration-200",
                    isActive 
                      ? "text-lime-600 dark:text-lime-300" 
                      : isLandingPage
                        ? "text-white/80 group-hover:text-lime-300"
                        : "text-gray-600 dark:text-gray-400 group-hover:text-lime-500 dark:group-hover:text-lime-200"
                  )}>
                    <Icon className="w-4 h-4 mr-1.5" />
                    {item.label}
                  </span>
                  
                  {/* Hover Pill Background */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className={cn(
                        "absolute inset-0 rounded-full",
                        isLandingPage ? "bg-white/10" : "bg-lime-100 dark:bg-lime-900/30"
                      )}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  
                  {/* Hover Effect for non-active items */}
                  {!isActive && (
                    <div className={cn(
                      "absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                      isLandingPage ? "bg-white/10" : "bg-gray-100 dark:bg-white/5"
                    )} />
                  )}
                </Link>
              )
            })}
          </motion.div>

          {/* Actions Section */}
          <motion.div layout className="flex items-center gap-2 md:gap-3 shrink-0">
             <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <motion.div 
              layout
              animate={{ 
                scale: isScrolled ? 0.9 : 1,
              }}
              transition={navTransition}
              className="hidden sm:block"
            >
              <WalletConnectButton />
            </motion.div>

            {/* Mobile Menu Toggle */}
            <button
               className="p-2 text-gray-600 dark:text-gray-300 lg:hidden rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
               onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </motion.div>
        </motion.div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-40 bg-white dark:bg-[#0a0a0a] lg:hidden flex flex-col pt-24"
          >
            <div className="flex-1 overflow-y-auto px-6 pb-12 no-scrollbar">
              
              <div className="mb-8 sm:hidden">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">Account</p>
                <WalletConnectButton />
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">Main Menu</p>
                  <div className="grid grid-cols-1 gap-2">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center p-4 rounded-2xl transition-all border",
                          pathname.startsWith(item.href)
                            ? "bg-primary/10 border-primary/20 text-primary"
                            : "bg-muted/30 border-transparent text-foreground hover:bg-muted/50"
                        )}
                      >
                        <item.icon className="w-5 h-5 mr-4" />
                        <span className="font-bold">{item.label}</span>
                        {pathname.startsWith(item.href) && <ChevronRight className="ml-auto w-4 h-4" />}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Documentation Sections */}
                <div>
                  <button 
                    onClick={() => setExpandedSection(expandedSection === 'docs' ? null : 'docs')}
                    className="flex items-center w-full p-4 rounded-2xl bg-muted/30 text-foreground font-bold border border-transparent"
                  >
                    <BookOpen className="w-5 h-5 mr-4 text-sky-500" />
                    <span>Documentation</span>
                    <ChevronDown className={cn("ml-auto w-4 h-4 transition-transform", expandedSection === 'docs' && "rotate-180")} />
                  </button>
                  
                  <AnimatePresence>
                    {expandedSection === 'docs' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pl-4 mt-2 space-y-1"
                      >
                        {docsConfig.map((section) => (
                          <div key={section.title} className="py-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-4">{section.title}</p>
                            {section.items.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                  "flex items-center px-4 py-2.5 rounded-xl text-sm transition-colors",
                                  pathname === item.href 
                                    ? "bg-primary/10 text-primary font-bold" 
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {item.title}
                              </Link>
                            ))}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Connect wallet prompt for unauthenticated users */}
                {!connected && !isLandingPage && (
                  <div className="p-4 rounded-2xl bg-muted/50 border border-dashed border-muted-foreground/30">
                    <p className="text-sm text-muted-foreground mb-3">
                      Connect your wallet to access Agents, Marketplace, Analytics, and more.
                    </p>
                    <WalletConnectButton />
                  </div>
                )}

                {/* Dashboard link - only show when connected */}
                {connected && (
                  <Link
                    href="/dashboard"
                    className="flex items-center p-4 rounded-2xl bg-linear-to-r from-lime-500 to-emerald-500 text-black font-bold shadow-lg shadow-lime-500/20"
                  >
                    <LayoutDashboard className="w-5 h-5 mr-4" />
                    <span>Enter Dashboard</span>
                    <ChevronRight className="ml-auto w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-lime-500 animate-pulse" />
                  <span className="text-xs font-mono text-muted-foreground">Network: Solana Devnet</span>
                </div>
                <div className="flex gap-4">
                  <a href="#" className="p-2 rounded-full bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                    <TrendingUp className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
