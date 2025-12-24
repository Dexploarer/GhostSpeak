'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import {
  Home,
  Bot,
  ShoppingBag,
  Briefcase,
  Shield,
  Gavel,
  Menu,
  X,
  Moon,
  Sun,
  Sparkles,
  Coins,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

const WalletConnectButton = dynamic(
  () => import('@/components/wallet/WalletConnectButton').then((mod) => mod.WalletConnectButton),
  { ssr: false }
)

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { href: '/work-orders', label: 'Orders', icon: Briefcase }, // Shortened label
  { href: '/escrow', label: 'Escrow', icon: Shield },
  { href: '/governance', label: 'Gov', icon: Gavel }, // Shortened label
]

const marketingNavItems = [
  { href: 'https://docs.ghostspeak.io', label: 'Docs', icon: FileText },
  { href: '/tokenomics', label: '$GHOST', icon: Coins },
  { href: '/x402/discover', label: 'Discover', icon: Sparkles },
]

export const Navigation: React.FC = () => {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsScrolled(latest > 50)
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if we're on a marketing/landing page where we shouldn't show the main app nav
  const isMarketingPage =
    pathname === '/' || pathname === '/tokenomics' || pathname?.startsWith('/x402/discover')

  // Hide navigation on dashboard routes - dashboard has its own sidebar
  const isDashboardPage = pathname?.startsWith('/dashboard') ?? false

  // Don't render navigation at all on dashboard
  if (isDashboardPage) {
    return null
  }

  const toggleDarkMode = (): void => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
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
          maxWidth: isScrolled ? '90%' : '100%',
          top: isScrolled ? 20 : 0,
          borderRadius: isScrolled ? '9999px' : '0px',
        }}
        transition={navTransition}
        className={cn(
          'fixed z-50 left-0 right-0 mx-auto',
          isScrolled
            ? 'glass-panel px-6 py-3 border border-white/20 dark:border-white/10 shadow-2xl shadow-lime-500/10 w-fit'
            : cn(
                'border-b py-4 px-6 md:px-8',
                isMarketingPage
                  ? 'bg-transparent border-transparent'
                  : 'glass border-gray-200 dark:border-gray-800'
              )
        )}
        style={{
          transition: 'none',
        }}
      >
        <motion.div layout className="flex items-center justify-between w-full max-w-7xl mx-auto">
          {/* Logo Section */}
          <motion.div layout className="flex items-center gap-2 shrink-0">
            <Link href="/" className="relative group">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-lime-400/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Image
                    src="/ghost-logo.png"
                    alt="GhostSpeak"
                    width={32}
                    height={32}
                    className="relative z-10 w-8 h-8 object-contain transition-transform group-hover:scale-110 duration-300"
                  />
                </div>
                <span
                  className={cn(
                    'font-bold text-lg tracking-tight transition-colors',
                    isMarketingPage && !isScrolled ? 'text-white' : 'text-gray-900 dark:text-white'
                  )}
                >
                  Ghost<span className="text-lime-500">Speak</span>
                </span>
              </div>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          {!isMarketingPage ? (
            <motion.div
              layout
              className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2"
            >
              {navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href) ?? false
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative px-3 py-2 rounded-full group overflow-hidden shrink-0"
                  >
                    <span
                      className={cn(
                        'relative z-10 flex items-center text-sm font-medium transition-colors duration-200',
                        isActive
                          ? 'text-lime-600 dark:text-lime-300'
                          : 'text-gray-600 dark:text-gray-400 group-hover:text-lime-500 dark:group-hover:text-lime-200'
                      )}
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      {item.label}
                    </span>

                    {/* Hover Pill Background */}
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 bg-lime-100 dark:bg-lime-900/30 rounded-full"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}

                    {/* Hover Effect for non-active items */}
                    {!isActive && (
                      <div className="absolute inset-0 bg-gray-100 dark:bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    )}
                  </Link>
                )
              })}
            </motion.div>
          ) : (
            <motion.div
              layout
              className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2"
            >
              {marketingNavItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative px-3 py-2 rounded-full group overflow-hidden shrink-0"
                  >
                    <span
                      className={cn(
                        'relative z-10 flex items-center text-sm font-medium transition-colors duration-200',
                        isActive
                          ? 'text-lime-600 dark:text-lime-300'
                          : cn(
                              isMarketingPage && !isScrolled
                                ? 'text-white/70 group-hover:text-white'
                                : 'text-gray-600 dark:text-gray-400 group-hover:text-lime-500 dark:group-hover:text-lime-200'
                            )
                      )}
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      {item.label}
                    </span>

                    {/* Hover Pill Background */}
                    {isActive && (
                      <motion.div
                        layoutId="marketing-nav-pill"
                        className="absolute inset-0 bg-lime-100/20 dark:bg-lime-900/30 rounded-full"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}

                    {/* Hover Effect for non-active items */}
                    {!isActive && (
                      <div className="absolute inset-0 bg-white/10 dark:bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    )}
                  </Link>
                )
              })}
            </motion.div>
          )}

          {/* Actions Section */}
          <motion.div layout className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors"
            >
              {mounted &&
                (theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />)}
            </button>

            <motion.div
              layout
              animate={{
                scale: isScrolled ? 0.95 : 1,
              }}
              transition={navTransition}
            >
              <WalletConnectButton />
            </motion.div>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-gray-600 dark:text-gray-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </motion.div>
        </motion.div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-xl md:hidden pt-24 px-6"
          >
            <div className="flex flex-col space-y-4">
              {(isMarketingPage ? marketingNavItems : navItems).map((item, idx) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10"
                  >
                    <item.icon className="w-6 h-6 mr-4 text-lime-500" />
                    <span className="text-lg font-medium text-gray-900 dark:text-white">
                      {item.label}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
