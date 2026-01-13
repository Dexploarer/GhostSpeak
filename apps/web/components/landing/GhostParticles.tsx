'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

/**
 * Particle data structure for the ghost animation
 */
interface Particle {
  x: number
  y: number
  targetX: number
  targetY: number
  size: number
  baseOpacity: number
  opacity: number
  phase: number
  vx: number
  vy: number
}

interface GhostParticlesProps {
  scrollProgress?: number
}

// Ghost shape path (normalized 0-1 coordinates) - defined once for performance
const GHOST_SHAPE_PATH = (() => {
  const centerX = 0.5
  const centerY = 0.5
  const scale = 0.35
  const path: { x: number; y: number }[] = []

  // Head (circular top)
  for (let angle = 0; angle <= Math.PI; angle += Math.PI / 20) {
    path.push({
      x: centerX + Math.cos(angle + Math.PI) * scale * 0.6,
      y: centerY - 0.1 + Math.sin(angle + Math.PI) * scale * 0.6,
    })
  }

  // Body sides
  const bodyHeight = 0.5
  const bodyPoints = 15
  for (let i = 0; i <= bodyPoints; i++) {
    const t = i / bodyPoints
    const y = centerY - 0.1 + t * bodyHeight
    path.push({ x: centerX - scale * 0.6, y })
  }

  // Bottom waves
  const waveCount = 3
  for (let i = 0; i <= waveCount * 2; i++) {
    const t = i / (waveCount * 2)
    const waveY = centerY + bodyHeight - 0.1
    path.push({
      x: centerX - scale * 0.6 + t * (scale * 1.2),
      y: waveY + Math.sin(t * Math.PI * waveCount) * 0.08,
    })
  }

  // Right side
  for (let i = bodyPoints; i >= 0; i--) {
    const t = i / bodyPoints
    const y = centerY - 0.1 + t * bodyHeight
    path.push({ x: centerX + scale * 0.6, y })
  }

  // Eyes
  const eyes = [
    { x: centerX - 0.12, y: centerY - 0.05 },
    { x: centerX + 0.12, y: centerY - 0.05 },
  ]
  eyes.forEach((eye: any) => {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const radius = 0.03
      path.push({
        x: eye.x + Math.cos(angle) * radius,
        y: eye.y + Math.sin(angle) * radius,
      })
    }
  })

  return path
})()

// Theme colors
const THEME_COLORS = {
  dark: { r: 204, g: 255, b: 0 }, // #ccff00
  light: { r: 163, g: 230, b: 53 }, // #a3e635
}

/**
 * GhostParticles - Animated particle system forming ghost shape
 *
 * Creates an animated ghost shape using Canvas and hundreds of lime-green particles.
 * Features include:
 * - Responsive particle count (reduced on mobile for performance)
 * - Theme-aware colors (adapts to light/dark mode)
 * - Scroll-based dispersion effect
 * - 60 FPS throttling for optimal performance
 * - Organic pulsing and breathing animations
 *
 * @param scrollProgress - Value from 0-1 controlling particle dispersion
 */
export function GhostParticles({ scrollProgress = 0 }: GhostParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useRef<Particle[]>([])
  const animationFrameId = useRef<number | undefined>(undefined)
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Get the effective theme (null safe)
  const effectiveTheme = mounted ? resolvedTheme || theme || 'dark' : 'dark'

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      ctx.scale(dpr, dpr)
      initParticles()
    }

    // Initialize particles
    const initParticles = () => {
      const rect = canvas.getBoundingClientRect()
      particles.current = []

      // Reduce particle count on mobile for performance
      const isMobile = rect.width < 768
      const particlesPerPoint = isMobile ? 2 : 3
      const particleSize = isMobile ? { min: 2, max: 4 } : { min: 1.5, max: 4.5 }

      // Create particles along the ghost path
      GHOST_SHAPE_PATH.forEach((point: any) => {
        // Create multiple particles around each path point for density
        for (let i = 0; i < particlesPerPoint; i++) {
          const spreadX = (Math.random() - 0.5) * 60
          const spreadY = (Math.random() - 0.5) * 60

          particles.current.push({
            x: Math.random() * rect.width,
            y: Math.random() * rect.height,
            targetX: point.x * rect.width + spreadX,
            targetY: point.y * rect.height + spreadY,
            size: Math.random() * (particleSize.max - particleSize.min) + particleSize.min,
            baseOpacity: Math.random() * 0.4 + 0.3,
            opacity: 0,
            phase: Math.random() * Math.PI * 2,
            vx: 0,
            vy: 0,
          })
        }
      })
    }

    // Animation loop with throttling for performance
    let lastFrameTime = 0
    const targetFPS = 60
    const frameInterval = 1000 / targetFPS

    const animate = (time: number) => {
      // Throttle animation to target FPS
      if (time - lastFrameTime < frameInterval) {
        animationFrameId.current = requestAnimationFrame(animate)
        return
      }
      lastFrameTime = time

      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      // Determine particle color based on theme
      const primaryColor = THEME_COLORS[effectiveTheme as 'dark' | 'light'] || THEME_COLORS.dark

      particles.current.forEach((particle: any) => {
        // Ease toward target position
        const dx = particle.targetX - particle.x
        const dy = particle.targetY - particle.y
        particle.vx += dx * 0.0002
        particle.vy += dy * 0.0002
        particle.vx *= 0.95
        particle.vy *= 0.95
        particle.x += particle.vx
        particle.y += particle.vy

        // Pulse effect
        particle.opacity = particle.baseOpacity + Math.sin(time * 0.001 + particle.phase) * 0.15

        // Disperse based on scroll
        if (scrollProgress > 0) {
          const disperseAmount = scrollProgress * 100
          particle.x += (Math.random() - 0.5) * disperseAmount * 0.1
          particle.y += (Math.random() - 0.5) * disperseAmount * 0.1
          particle.opacity *= 1 - scrollProgress * 0.7
        }

        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${particle.opacity})`
        ctx.fill()

        // Add subtle glow
        if (particle.opacity > 0.5) {
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${particle.opacity * 0.1})`
          ctx.fill()
        }
      })

      animationFrameId.current = requestAnimationFrame(animate)
    }

    // Initialize
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Start animation
    animationFrameId.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [scrollProgress, effectiveTheme])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ mixBlendMode: 'screen' }}
    />
  )
}
