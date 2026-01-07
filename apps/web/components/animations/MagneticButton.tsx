'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef, type ReactNode } from 'react'

interface MagneticButtonProps {
  children: ReactNode
  className?: string
  strength?: number
}

/**
 * MagneticButton - Button with magnetic pull effect on hover
 *
 * Creates a smooth attraction effect where the button follows the cursor
 * when the mouse is nearby, creating an engaging micro-interaction.
 *
 * @param strength - Magnetic pull strength (0-1, default 0.3)
 */
export function MagneticButton({ children, className = '', strength = 0.3 }: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springConfig = { damping: 20, stiffness: 200 }
  const springX = useSpring(x, springConfig)
  const springY = useSpring(y, springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const distanceX = e.clientX - centerX
    const distanceY = e.clientY - centerY

    x.set(distanceX * strength)
    y.set(distanceY * strength)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      style={{
        x: springX,
        y: springY,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  )
}
