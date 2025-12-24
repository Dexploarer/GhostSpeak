'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { useTheme } from 'next-themes'

interface BrandLogoProps {
  className?: string
  width?: number
  height?: number
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  width = 32,
  height = 32,
}) => {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Default to dark mode logo (2.png) during SSR or before mount
  const src = !mounted || theme === 'dark' || resolvedTheme === 'dark' ? '/2.png' : '/3.png'

  return (
    <Image
      src={src}
      alt="GhostSpeak"
      width={width}
      height={height}
      className={className}
      priority
    />
  )
}
