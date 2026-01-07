import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

/**
 * useScrollReveal - Hook for scroll-triggered reveal animations
 *
 * @param threshold - Intersection threshold (0-1)
 * @param once - Whether to animate only once
 * @returns ref to attach to element and boolean indicating if in view
 */
export function useScrollReveal(threshold = 0.2, once = true) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, amount: threshold })

  return { ref, isInView }
}

/**
 * useMouseParallax - Hook for mouse-based parallax effect
 *
 * @param strength - Parallax strength multiplier
 * @returns x and y offset values
 */
export function useMouseParallax(strength = 0.03) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) * strength
      const y = (e.clientY - window.innerHeight / 2) * strength
      setOffset({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [strength])

  return offset
}

/**
 * useReducedMotion - Hook to detect user's motion preference
 *
 * @returns boolean indicating if user prefers reduced motion
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

/**
 * useScrollProgress - Hook to track scroll progress on a specific element
 *
 * @returns scroll progress value between 0 and 1
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrolled = window.scrollY
      const progress = scrollHeight > 0 ? scrolled / scrollHeight : 0
      setProgress(Math.min(Math.max(progress, 0), 1))
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return progress
}
