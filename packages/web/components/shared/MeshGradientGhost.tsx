"use client"

import { motion } from "framer-motion"
import { useState, useEffect, useRef } from "react"

interface MeshGradientGhostProps {
  className?: string
  animated?: boolean
  interactive?: boolean
  variant?: 'default' | 'yellow' | 'caisper'
}

export function MeshGradientGhost({
  className = "",
  animated = true,
  interactive = true,
  variant = 'default'
}: MeshGradientGhostProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 })
  const [isWinking, setIsWinking] = useState(false)
  const [winkEye, setWinkEye] = useState<"left" | "right">("left")
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!interactive) return

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [interactive])

  useEffect(() => {
    if (!interactive || !svgRef.current) return

    const rect = svgRef.current.getBoundingClientRect()
    if (rect) {
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const deltaX = (mousePosition.x - centerX) * 0.08
      const deltaY = (mousePosition.y - centerY) * 0.08

      const maxOffset = 8
      setEyeOffset({
        x: Math.max(-maxOffset, Math.min(maxOffset, deltaX)),
        y: Math.max(-maxOffset, Math.min(maxOffset, deltaY)),
      })
    }
  }, [mousePosition, interactive])

  useEffect(() => {
    if (!animated) return

    const winkInterval = setInterval(
      () => {
        setIsWinking(true)
        setWinkEye(Math.random() > 0.5 ? "left" : "right")
        setTimeout(() => setIsWinking(false), 300)
      },
      4000 + Math.random() * 3000,
    )

    return () => clearInterval(winkInterval)
  }, [animated])

  const floatAnimation = animated ? {
    y: [0, -8, 0],
    scaleY: [1, 1.08, 1],
  } : {}

  const floatTransition = animated ? {
    duration: 2.8,
    repeat: Number.POSITIVE_INFINITY,
    ease: "easeInOut" as const,
  } : undefined

  return (
    <motion.div
      className={`relative w-full max-w-sm mx-auto p-8 rounded-lg ${className}`}
      animate={floatAnimation}
      transition={floatTransition}
      style={{ transformOrigin: "top center" }}
    >
      <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" width="231" height="289" viewBox="0 0 231 289" className="w-full h-auto">
        <defs>
          <clipPath id="shapeClip">
            <path d="M230.809 115.385V249.411C230.809 269.923 214.985 287.282 194.495 288.411C184.544 288.949 175.364 285.718 168.26 280C159.746 273.154 147.769 273.461 139.178 280.23C132.638 285.384 124.381 288.462 115.379 288.462C106.377 288.462 98.1451 285.384 91.6055 280.23C82.912 273.385 70.9353 273.385 62.2415 280.23C55.7532 285.334 47.598 288.411 38.7246 288.462C17.4132 288.615 0 270.667 0 249.359V115.385C0 51.6667 51.6756 0 115.404 0C179.134 0 230.809 51.6667 230.809 115.385Z" />
          </clipPath>

          {variant === 'caisper' ? (
            /* Caisper variant: dark transparent body with subtle gradient */
            <radialGradient id="meshGradient" cx="50%" cy="30%" r="90%">
              <stop offset="0%" stopColor="rgba(30, 30, 30, 0.9)" />
              <stop offset="30%" stopColor="rgba(20, 20, 20, 0.85)" />
              <stop offset="60%" stopColor="rgba(15, 15, 15, 0.8)" />
              <stop offset="100%" stopColor="rgba(10, 10, 10, 0.75)" />
            </radialGradient>
          ) : variant === 'yellow' ? (
            <radialGradient id="meshGradient" cx="50%" cy="40%" r="80%">
              <stop offset="0%" stopColor="#FFEB3B" />
              <stop offset="25%" stopColor="#FDD835" />
              <stop offset="50%" stopColor="#CDDC39" />
              <stop offset="75%" stopColor="#9E9D24" />
              <stop offset="100%" stopColor="#827717" />
            </radialGradient>
          ) : (
            <radialGradient id="meshGradient" cx="50%" cy="40%" r="80%">
              <stop offset="0%" stopColor="#FFB3D9" />
              <stop offset="25%" stopColor="#87CEEB" />
              <stop offset="50%" stopColor="#4A90E2" />
              <stop offset="75%" stopColor="#2C3E50" />
              <stop offset="100%" stopColor="#1A1A2E" />
            </radialGradient>
          )}
        </defs>

        {/* Background with gradient */}
        <rect width="231" height="289" fill="url(#meshGradient)" clipPath="url(#shapeClip)" />

        {/* Neon lime color for caisper variant, black for others */}
        <motion.ellipse
          rx={20}
          fill={variant === 'caisper' ? "#ccff00" : "#000000"}
          initial={{ cx: 80, cy: 120, ry: 30 }}
          animate={{
            cx: 80 + (interactive ? eyeOffset.x : 0),
            cy: 120 + (interactive ? eyeOffset.y : 0),
            ry: isWinking && winkEye === "left" ? 3 : 30,
          }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          style={variant === 'caisper' ? { filter: 'drop-shadow(0 0 8px #ccff00)' } : {}}
        />
        <motion.ellipse
          rx={20}
          fill={variant === 'caisper' ? "#ccff00" : "#000000"}
          initial={{ cx: 150, cy: 120, ry: 30 }}
          animate={{
            cx: 150 + (interactive ? eyeOffset.x : 0),
            cy: 120 + (interactive ? eyeOffset.y : 0),
            ry: isWinking && winkEye === "right" ? 3 : 30,
          }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          style={variant === 'caisper' ? { filter: 'drop-shadow(0 0 8px #ccff00)' } : {}}
        />

        <motion.g
          initial={{ y: 0 }}
          animate={{
            y: interactive ? eyeOffset.y * 0.5 : 0,
          }}
          transition={{ type: "spring", stiffness: 150, damping: 15 }}
        >
          {/* Zipper teeth in pairs (zipped together) with smile curve */}
          {Array.from({ length: 12 }).map((_, i) => {
            const progress = i / 11
            const smileY = Math.sin(progress * Math.PI) * 8
            const toothColor = variant === 'caisper' ? "#ccff00" : "#000000"

            return (
              <motion.g
                key={i}
                initial={{ y: 175 + smileY }}
                animate={animated ? {
                  y: [175 + smileY, 175 + smileY - 3, 175 + smileY],
                } : { y: 175 + smileY }}
                transition={animated ? {
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  delay: progress * 0.3,
                } : {}}
                style={variant === 'caisper' ? { filter: 'drop-shadow(0 0 4px #ccff00)' } : {}}
              >
                {/* Top tooth */}
                <rect x={55 + i * 10} y={-3} width={8} height={6} fill={toothColor} rx={1} />
                {/* Bottom tooth */}
                <rect x={55 + i * 10} y={3} width={8} height={6} fill={toothColor} rx={1} />
              </motion.g>
            )
          })}

          <motion.g
            initial={{ x: 165, y: 175 + Math.sin(0.9 * Math.PI) * 8 }}
            animate={animated ? {
              x: [165, 165],
              y: [
                175 + Math.sin(0.9 * Math.PI) * 8,
                175 + Math.sin(0.9 * Math.PI) * 8 - 3,
                175 + Math.sin(0.9 * Math.PI) * 8,
              ],
            } : { x: 165, y: 175 + Math.sin(0.9 * Math.PI) * 8 }}
            transition={animated ? {
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: 0.27,
            } : {}}
            style={variant === 'caisper' ? { filter: 'drop-shadow(0 0 6px #ccff00)' } : {}}
          >
            <circle cx="0" cy="0" r="6" fill={variant === 'caisper' ? "#ccff00" : "#000000"} stroke={variant === 'caisper' ? "#ccff00" : "#000000"} strokeWidth="1.5" />
            <rect x="-1" y="-12" width="2" height="12" fill={variant === 'caisper' ? "#ccff00" : "#000000"} />
            <ellipse cx="0" cy="-15" rx="4" ry="3" fill={variant === 'caisper' ? "#ccff00" : "#000000"} />
          </motion.g>
        </motion.g>
      </svg>
    </motion.div>
  )
}
