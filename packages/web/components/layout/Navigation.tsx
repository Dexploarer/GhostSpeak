'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { Menu, X, Moon, Sun, Coins, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { ConnectWalletButton } from '@/components/auth/ConnectWalletButton'

const marketingNavItems = [
  { href: 'https://docs.ghostspeak.io', label: 'Docs', icon: FileText, external: true },
  {
    href: 'https://dexscreener.com/solana/e44xj7jyjxyermlqqwrpu4nekcphawfjf3ppn2uokgdb',
    label: '$GHOST',
    icon: Coins,
    external: true,
  },
]

export const Navigation: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()

  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsScrolled(latest > 50)
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if we're on dashboard or other authenticated pages
  const isDashboardPage =
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/caisper') ||
    pathname?.startsWith('/settings')
  const isMarketingPage = !isDashboardPage

  // Show marketing nav items only on marketing pages
  const navItems = isDashboardPage ? [] : marketingNavItems

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
                  <BrandLogo className="relative z-10 w-8 h-8 object-contain transition-transform group-hover:scale-110 duration-300" />
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
          {navItems.length > 0 && (
            <motion.div
              layout
              className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2"
            >
              {navItems.map((item) => {
                const Icon = item.icon
                const LinkComponent = item.external ? 'a' : Link

                return (
                  <LinkComponent
                    key={item.href}
                    href={item.href}
                    {...(item.external && { target: '_blank', rel: 'noopener noreferrer' })}
                    className="relative px-3 py-2 rounded-full group overflow-hidden shrink-0"
                  >
                    <span
                      className={cn(
                        'relative z-10 flex items-center text-sm font-medium transition-colors duration-200',
                        isMarketingPage && !isScrolled
                          ? 'text-white/70 group-hover:text-white'
                          : 'text-gray-600 dark:text-gray-400 group-hover:text-lime-500 dark:group-hover:text-lime-200'
                      )}
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      {item.label}
                    </span>

                    {/* Hover Effect */}
                    <div className="absolute inset-0 bg-white/10 dark:bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </LinkComponent>
                )
              })}
            </motion.div>
          )}

          {/* Actions Section */}
          <motion.div layout className="flex items-center gap-3 shrink-0">
            {/* Connect Wallet Button */}
            <div className="hidden md:block">
              <ConnectWalletButton variant="gradient" />
            </div>

            <button
              onClick={toggleDarkMode}
              className={cn(
                'p-2 rounded-full transition-colors',
                isMarketingPage && !isScrolled
                  ? 'text-white/70 hover:text-white hover:bg-white/10'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
              )}
            >
              {mounted &&
                (theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />)}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              className={cn(
                'md:hidden p-2',
                isMarketingPage && !isScrolled ? 'text-white' : 'text-gray-600 dark:text-gray-300'
              )}
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
              {/* Connect Wallet Button in Mobile Menu */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-4"
              >
                <ConnectWalletButton variant="gradient" className="w-full justify-center" />
              </motion.div>

              {navItems.map((item, idx) => {
                const LinkComponent = item.external ? 'a' : Link

                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <LinkComponent
                      href={item.href}
                      {...(item.external && { target: '_blank', rel: 'noopener noreferrer' })}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10"
                    >
                      <item.icon className="w-6 h-6 mr-4 text-lime-500" />
                      <span className="text-lg font-medium text-gray-900 dark:text-white">
                        {item.label}
                      </span>
                    </LinkComponent>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
