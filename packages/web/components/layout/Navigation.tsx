'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { 
  Home, Bot, ShoppingBag, Briefcase, Shield, Gavel, 
  Menu, X, Moon, Sun, Sparkles, TrendingUp 
} from 'lucide-react'
import { cn } from '@/lib/utils'

const WalletConnectButton = dynamic(
  () => import('@/components/wallet/WalletConnectButton').then((mod) => mod.WalletConnectButton),
  { ssr: false }
)

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/x402/discover', label: 'Discover', icon: Sparkles },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { href: '/x402/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/work-orders', label: 'Orders', icon: Briefcase }, // Shortened label
  { href: '/escrow', label: 'Escrow', icon: Shield },
  { href: '/governance', label: 'Gov', icon: Gavel }, // Shortened label
]

export const Navigation: React.FC = () => {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() || 0
    if (latest > 50 && latest > previous) {
      setIsScrolled(true)
    } else if (latest < 20) {
      setIsScrolled(false)
    }
  })

  // Check if we're on the landing page
  const isLandingPage = pathname === '/'

  useEffect(() => {
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
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ 
          y: 0, 
          opacity: 1,
          width: isScrolled ? 'fit-content' : '100%',
          top: isScrolled ? 20 : 0,
          borderRadius: isScrolled ? '9999px' : '0px',
        }}
        transition={{ duration: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
        className={cn(
          "fixed z-50 left-0 right-0 mx-auto transition-all duration-300",
          isScrolled 
            ? "glass-panel px-6 py-3 border border-white/20 dark:border-white/10 shadow-2xl shadow-purple-500/10" 
            : cn(
                "border-b py-4 px-6 md:px-8",
                isLandingPage
                  ? "bg-transparent border-transparent"
                  : "glass border-gray-200 dark:border-gray-800"
              )
        )}
        style={{ maxWidth: isScrolled ? '90%' : '100%' }}
      >
        <div className={cn("flex items-center justify-between", isScrolled ? "gap-6" : "")}>
          
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-105 transition-transform duration-300">
               <span className="text-white font-bold text-lg">G</span>
            </div>
            <span className={cn(
              "text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 group-hover:from-purple-500 group-hover:to-blue-500 transition-all duration-300",
              isScrolled && "hidden sm:block"
            )}>
              GhostSpeak
            </span>
          </Link>

          {/* Desktop Navigation */}
          {!isLandingPage && !mobileMenuOpen && (
             <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname.startsWith(item.href)
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="relative px-3 py-2 rounded-full group overflow-hidden"
                    >
                      <span className={cn(
                        "relative z-10 flex items-center text-sm font-medium transition-colors duration-200",
                        isActive 
                          ? "text-purple-600 dark:text-purple-300" 
                          : "text-gray-600 dark:text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-200"
                      )}>
                        <Icon className="w-4 h-4 mr-1.5" />
                        {item.label}
                      </span>
                      
                      {/* Hover Pill Background */}
                      {isActive && (
                        <motion.div
                          layoutId="nav-pill"
                          className="absolute inset-0 bg-purple-100 dark:bg-purple-900/30 rounded-full"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      
                      {/* Hover Effect for non-active items */}
                      {!isActive && (
                        <div className="absolute inset-0 bg-gray-100 dark:bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      )}
                    </Link>
                  )
                })}
             </div>
          )}

          {/* Actions Section */}
          <div className="flex items-center gap-3">
             <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className={cn("transition-all duration-300", isScrolled ? "scale-90" : "scale-100")}>
              <WalletConnectButton />
            </div>

            {/* Mobile Menu Toggle */}
            <button
               className="md:hidden p-2 text-gray-600 dark:text-gray-300"
               onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
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
              {navItems.map((item, idx) => (
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
                    <item.icon className="w-6 h-6 mr-4 text-purple-500" />
                    <span className="text-lg font-medium text-gray-900 dark:text-white">{item.label}</span>
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
