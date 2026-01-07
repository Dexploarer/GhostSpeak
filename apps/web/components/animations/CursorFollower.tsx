'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useSpring } from 'framer-motion'

/**
 * CursorFollower - Custom animated cursor that follows mouse movement
 *
 * Features:
 * - Smooth spring physics for natural movement
 * - Glow effect that intensifies on interactive elements
 * - Desktop-only (hidden on mobile/tablet)
 * - Magnetic pull to CTAs and buttons
 */
export function CursorFollower() {
  const [isVisible, setIsVisible] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const cursorRef = useRef<HTMLDivElement>(null)

  const cursorX = useSpring(0, { damping: 30, stiffness: 200 })
  const cursorY = useSpring(0, { damping: 30, stiffness: 200 })

  useEffect(() => {
    // Only show on desktop
    const isDesktop = window.innerWidth >= 1024
    if (!isDesktop) return

    setIsVisible(true)

    const updateCursor = (e: MouseEvent) => {
      let targetX = e.clientX
      let targetY = e.clientY

      // Check if hovering over interactive element
      const target = e.target as HTMLElement
      const isInteractive =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') !== null ||
        target.closest('a') !== null

      setIsHovering(isInteractive)

      // Magnetic pull effect for interactive elements
      if (isInteractive) {
        const rect = target.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const distance = Math.sqrt(
          Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
        )

        // Pull cursor toward center if within 60px
        if (distance < 60) {
          const pullStrength = 0.3
          targetX = e.clientX + (centerX - e.clientX) * pullStrength
          targetY = e.clientY + (centerY - e.clientY) * pullStrength
        }
      }

      cursorX.set(targetX)
      cursorY.set(targetY)
    }

    const handleMouseLeave = () => {
      setIsVisible(false)
    }

    const handleMouseEnter = () => {
      setIsVisible(true)
    }

    window.addEventListener('mousemove', updateCursor)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)

    return () => {
      window.removeEventListener('mousemove', updateCursor)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
    }
  }, [cursorX, cursorY])

  if (!isVisible) return null

  return (
    <motion.div
      ref={cursorRef}
      className="fixed top-0 left-0 pointer-events-none z-[9999] hidden lg:block mix-blend-screen"
      style={{
        x: cursorX,
        y: cursorY,
        translateX: '-50%',
        translateY: '-50%',
      }}
    >
      {/* Main cursor dot */}
      <motion.div
        animate={{
          scale: isHovering ? 1.5 : 1,
          opacity: isHovering ? 0.8 : 0.6,
        }}
        transition={{ duration: 0.2 }}
        className="w-3 h-3 rounded-full bg-primary"
      />

      {/* Glow ring */}
      <motion.div
        animate={{
          scale: isHovering ? 2 : 1.5,
          opacity: isHovering ? 0.3 : 0.15,
        }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 -m-3 w-9 h-9 rounded-full bg-primary blur-md"
      />

      {/* Outer ring */}
      <motion.div
        animate={{
          scale: isHovering ? 1.8 : 1.2,
          opacity: isHovering ? 0.5 : 0.3,
        }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 -m-2 w-7 h-7 rounded-full border border-primary/50"
      />
    </motion.div>
  )
}
