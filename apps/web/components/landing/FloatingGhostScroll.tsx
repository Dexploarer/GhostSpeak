'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

/**
 * GhostSpeak Mesh Gradient Ghost - Interactive floating ghost with brand colors
 */
function MeshGradientGhost({ id = 'ghost' }: { id?: string }) {
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 })
  const [isWinking, setIsWinking] = useState(false)
  const [winkEye, setWinkEye] = useState<'left' | 'right'>('left')
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (rect) {
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2

        const deltaX = (e.clientX - centerX) * 0.08
        const deltaY = (e.clientY - centerY) * 0.08

        const maxOffset = 8
        setEyeOffset({
          x: Math.max(-maxOffset, Math.min(maxOffset, deltaX)),
          y: Math.max(-maxOffset, Math.min(maxOffset, deltaY)),
        })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    const winkInterval = setInterval(
      () => {
        setIsWinking(true)
        setWinkEye(Math.random() > 0.5 ? 'left' : 'right')
        setTimeout(() => setIsWinking(false), 300)
      },
      4000 + Math.random() * 3000
    )

    return () => clearInterval(winkInterval)
  }, [])

  const clipId = `shapeClip-${id}`
  const gradientId = `meshGradient-${id}`

  return (
    <motion.div
      className="relative w-full max-w-sm mx-auto"
      animate={{
        y: [0, -8, 0],
        scaleY: [1, 1.05, 1],
      }}
      transition={{
        duration: 2.8,
        repeat: Number.POSITIVE_INFINITY,
        ease: 'easeInOut',
      }}
      style={{ transformOrigin: 'top center' }}
    >
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        width="231"
        height="289"
        viewBox="0 0 231 289"
        className="w-full h-auto drop-shadow-[0_0_40px_rgba(204,255,0,0.3)]"
      >
        <defs>
          <clipPath id={clipId}>
            <path d="M230.809 115.385V249.411C230.809 269.923 214.985 287.282 194.495 288.411C184.544 288.949 175.364 285.718 168.26 280C159.746 273.154 147.769 273.461 139.178 280.23C132.638 285.384 124.381 288.462 115.379 288.462C106.377 288.462 98.1451 285.384 91.6055 280.23C82.912 273.385 70.9353 273.385 62.2415 280.23C55.7532 285.334 47.598 288.411 38.7246 288.462C17.4132 288.615 0 270.667 0 249.359V115.385C0 51.6667 51.6756 0 115.404 0C179.134 0 230.809 51.6667 230.809 115.385Z" />
          </clipPath>

          {/* GhostSpeak brand mesh gradient - lime glow effect */}
          <radialGradient id={gradientId} cx="50%" cy="35%" r="85%">
            <stop offset="0%" stopColor="#ccff00" /> {/* Bright lime center */}
            <stop offset="20%" stopColor="#b8e600" /> {/* Slightly darker lime */}
            <stop offset="40%" stopColor="#7ab800" /> {/* Medium lime */}
            <stop offset="60%" stopColor="#4a7a00" /> {/* Dark lime/green */}
            <stop offset="80%" stopColor="#2d4a00" /> {/* Very dark green */}
            <stop offset="100%" stopColor="#1a2e00" /> {/* Near black green */}
          </radialGradient>
        </defs>

        {/* Background with gradient */}
        <rect width="231" height="289" fill={`url(#${gradientId})`} clipPath={`url(#${clipId})`} />

        {/* Left eye */}
        <motion.ellipse
          rx={20}
          fill="#09090b"
          initial={{ cx: 80, cy: 120, ry: 30 }}
          animate={{
            cx: 80 + eyeOffset.x,
            cy: 120 + eyeOffset.y,
            ry: isWinking && winkEye === 'left' ? 3 : 30,
          }}
          transition={{ type: 'spring', stiffness: 150, damping: 15 }}
        />

        {/* Right eye */}
        <motion.ellipse
          rx={20}
          fill="#09090b"
          initial={{ cx: 150, cy: 120, ry: 30 }}
          animate={{
            cx: 150 + eyeOffset.x,
            cy: 120 + eyeOffset.y,
            ry: isWinking && winkEye === 'right' ? 3 : 30,
          }}
          transition={{ type: 'spring', stiffness: 150, damping: 15 }}
        />

        {/* Zipper mouth */}
        <motion.g
          initial={{ y: 0 }}
          animate={{
            y: eyeOffset.y * 0.5,
          }}
          transition={{ type: 'spring', stiffness: 150, damping: 15 }}
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const progress = i / 11
            const smileY = Math.sin(progress * Math.PI) * 8

            return (
              <motion.g
                key={i}
                initial={{ y: 175 + smileY }}
                animate={{
                  y: [175 + smileY, 175 + smileY - 3, 175 + smileY],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                  delay: progress * 0.3,
                }}
              >
                <rect x={55 + i * 10} y={-3} width={8} height={6} fill="#09090b" rx={1} />
                <rect x={55 + i * 10} y={3} width={8} height={6} fill="#09090b" rx={1} />
              </motion.g>
            )
          })}

          {/* Zipper pull */}
          <motion.g
            initial={{ x: 165, y: 175 + Math.sin(0.9 * Math.PI) * 8 }}
            animate={{
              x: [165, 165],
              y: [
                175 + Math.sin(0.9 * Math.PI) * 8,
                175 + Math.sin(0.9 * Math.PI) * 8 - 3,
                175 + Math.sin(0.9 * Math.PI) * 8,
              ],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
              delay: 0.27,
            }}
          >
            <circle cx="0" cy="0" r="6" fill="#09090b" />
            <rect x="-1" y="-12" width="2" height="12" fill="#09090b" />
            <ellipse cx="0" cy="-15" rx="4" ry="3" fill="#09090b" />
          </motion.g>
        </motion.g>
      </svg>
    </motion.div>
  )
}

/**
 * FloatingGhostScroll - Fixed ghosts that float across the screen as user scrolls
 *
 * Creates an immersive effect where ghosts drift across sections,
 * appearing and disappearing based on scroll position.
 */
export function FloatingGhostScroll() {
  const containerRef = useRef<HTMLDivElement>(null)
  const ghost1Ref = useRef<HTMLDivElement>(null)
  const ghost2Ref = useRef<HTMLDivElement>(null)
  const ghost3Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const ctx = gsap.context(() => {
      // First ghost - floats from left to right (appears in top third of page)
      if (ghost1Ref.current) {
        gsap.fromTo(
          ghost1Ref.current,
          {
            x: '-20vw',
            y: '10vh',
            rotation: -15,
            scale: 0.6,
            opacity: 0,
          },
          {
            x: '110vw',
            y: '15vh',
            rotation: 20,
            scale: 0.8,
            opacity: 1,
            scrollTrigger: {
              trigger: 'body',
              start: 'top top',
              end: '35% top',
              scrub: 1.5,
            },
          }
        )
      }

      // Second ghost - floats from right to left (appears in middle of page)
      if (ghost2Ref.current) {
        gsap.fromTo(
          ghost2Ref.current,
          {
            x: '110vw',
            y: '30vh',
            rotation: 15,
            scale: 0.5,
            opacity: 0,
          },
          {
            x: '-20vw',
            y: '25vh',
            rotation: -25,
            scale: 0.7,
            opacity: 1,
            scrollTrigger: {
              trigger: 'body',
              start: '25% top',
              end: '65% top',
              scrub: 2,
            },
          }
        )
      }

      // Third ghost - floats from left to right (appears in bottom third)
      if (ghost3Ref.current) {
        gsap.fromTo(
          ghost3Ref.current,
          {
            x: '-20vw',
            y: '50vh',
            rotation: 10,
            scale: 0.55,
            opacity: 0,
          },
          {
            x: '110vw',
            y: '40vh',
            rotation: -15,
            scale: 0.65,
            opacity: 1,
            scrollTrigger: {
              trigger: 'body',
              start: '55% top',
              end: '95% top',
              scrub: 1.8,
            },
          }
        )
      }
    })

    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-5 overflow-hidden">
      {/* Ghost 1 - Top section */}
      <div ref={ghost1Ref} className="absolute w-32 md:w-48 opacity-0" style={{ top: 0, left: 0 }}>
        <MeshGradientGhost id="scroll-ghost-1" />
      </div>

      {/* Ghost 2 - Middle section */}
      <div ref={ghost2Ref} className="absolute w-28 md:w-40 opacity-0" style={{ top: 0, left: 0 }}>
        <MeshGradientGhost id="scroll-ghost-2" />
      </div>

      {/* Ghost 3 - Bottom section */}
      <div ref={ghost3Ref} className="absolute w-24 md:w-36 opacity-0" style={{ top: 0, left: 0 }}>
        <MeshGradientGhost id="scroll-ghost-3" />
      </div>
    </div>
  )
}
