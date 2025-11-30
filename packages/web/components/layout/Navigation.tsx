'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton'
import { Home, Bot, ShoppingBag, Briefcase, Shield, Gavel, Menu, X, Moon, Sun, Sparkles, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/x402/discover', label: 'Discover', icon: Sparkles },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { href: '/x402/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/work-orders', label: 'Work Orders', icon: Briefcase },
  { href: '/escrow', label: 'Escrow', icon: Shield },
  { href: '/governance', label: 'Governance', icon: Gavel },
]

export const Navigation: React.FC = () => {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [darkMode, setDarkMode] = React.useState(false)

  // Check if we're on the landing page
  const isLandingPage = pathname === '/'

  React.useEffect(() => {
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = savedTheme === 'dark' || (!savedTheme && true) // Default to dark
    setDarkMode(prefersDark)
    document.documentElement.classList.toggle('dark', prefersDark)
  }, [])

  const toggleDarkMode = (): void => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newDarkMode)
  }

  return (
    <nav className={cn(
      "backdrop-blur-xl border-b sticky top-0 z-50",
      isLandingPage
        ? "bg-white/60 dark:bg-gray-900/60 border-transparent shadow-none"
        : "bg-white/80 dark:bg-gray-900/80 border-gray-200 dark:border-gray-800 shadow-soft"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-purple-500 to-blue-500 bg-clip-text text-transparent">
                GhostSpeak
              </span>
            </Link>

            {/* Desktop Navigation - Hidden on landing page and dashboard */}
            {!isLandingPage && !pathname.startsWith('/dashboard') && (
              <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200',
                        isActive
                          ? 'text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 shadow-soft'
                          : 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/10'
                      )}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-300 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Wallet Connect */}
            <div className="hidden sm:block">
              <WalletConnectButton />
            </div>

            {/* Mobile menu button - Hidden on landing page */}
            {!isLandingPage && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2.5 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-300 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800">
          <div className="px-3 pt-3 pb-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center px-4 py-3 text-base font-medium rounded-xl transition-all duration-200',
                    isActive
                      ? 'text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 shadow-soft'
                      : 'text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/10'
                  )}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              )
            })}
            <div className="pt-2">
              <WalletConnectButton />
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
