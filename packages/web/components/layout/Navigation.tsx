'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
    setIsScrolled(latest > 50)
  })

  // Check if we're on the landing page
  const isLandingPage = pathname === '/'
  
  // Hide navigation on dashboard routes - dashboard has its own sidebar
  const isDashboardPage = pathname.startsWith('/dashboard')
  
  // Don't render navigation at all on dashboard
  if (isDashboardPage) {
    return null
  }

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

  const navTransition = {
    type: 'spring',
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
          "fixed z-50 left-0 right-0 mx-auto",
          isScrolled 
            ? "glass-panel px-6 py-3 border border-white/20 dark:border-white/10 shadow-2xl shadow-lime-500/10 w-fit" 
            : cn(
                "border-b py-4 px-6 md:px-8",
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
            isScrolled ? "gap-8" : "gap-4"
          )}
        >
          
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <motion.div 
              layout
              className="relative w-8 h-8 group-hover:scale-105 transition-transform duration-300"
            >
              <Image 
                src="/ghost-logo.png"
                alt="GhostSpeak"
                width={32}
                height={32}
                className="object-contain"
              />
            </motion.div>
            <motion.span 
              layout
              animate={{ 
                opacity: isScrolled ? (mobileMenuOpen ? 1 : 0) : 1,
                width: isScrolled ? (mobileMenuOpen ? 'auto' : 0) : 'auto',
              }}
              className={cn(
                "text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 group-hover:from-lime-500 group-hover:to-lime-300 sm:block! sm:opacity-100! sm:w-auto!"
              )}
            >
              GhostSpeak
            </motion.span>
          </Link>

          {/* Desktop Navigation */}
          {!isLandingPage && !mobileMenuOpen && (
             <motion.div 
               layout
               className="hidden md:flex items-center gap-1 overflow-hidden"
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
                          : "text-gray-600 dark:text-gray-400 group-hover:text-lime-500 dark:group-hover:text-lime-200"
                      )}>
                        <Icon className="w-4 h-4 mr-1.5" />
                        {item.label}
                      </span>
                      
                      {/* Hover Pill Background */}
                      {isActive && (
                        <motion.div
                          layoutId="nav-pill"
                          className="absolute inset-0 bg-lime-100 dark:bg-lime-900/30 rounded-full"
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
             </motion.div>
          )}

          {/* Actions Section */}
          <motion.div layout className="flex items-center gap-3 shrink-0">
             <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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
                    <item.icon className="w-6 h-6 mr-4 text-lime-500" />
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
