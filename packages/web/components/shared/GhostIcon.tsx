'use client'

import React from 'react'

interface GhostIconProps {
  className?: string
  variant?: 'logo' | 'circuit' | 'brain' | 'simple' | 'outline'
  size?: number
}

export const GhostIcon: React.FC<GhostIconProps> = ({
  className = '',
  variant = 'logo',
  size = 48,
}) => {
  const getPaths = () => {
    switch (variant) {
      case 'circuit':
        return (
          <>
            <path
              d="M50 10 C25 10 10 30 10 60 L10 85 C10 90 20 95 30 90 C40 85 45 95 50 90 C55 85 60 95 70 90 C80 85 90 90 90 85 L90 60 C90 30 75 10 50 10 Z"
              fill="currentColor"
            />
            <circle cx="35" cy="45" r="6" fill="#000" />
            <circle cx="65" cy="45" r="6" fill="#000" />
            <path
              d="M35 15 L35 25 M65 15 L65 25 M20 40 L30 40 M70 40 L80 40 M50 20 L50 30"
              stroke="#ccff00"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.5"
            />
            <circle cx="35" cy="25" r="1.5" fill="#ccff00" opacity="0.8" />
            <circle cx="65" cy="25" r="1.5" fill="#ccff00" opacity="0.8" />
            <circle cx="50" cy="30" r="1.5" fill="#ccff00" opacity="0.8" />
          </>
        )
      case 'brain':
        return (
          <>
            <path
              d="M50 10 C25 10 10 30 10 60 L10 85 C10 90 20 95 30 90 C40 85 45 95 50 90 C55 85 60 95 70 90 C80 85 90 90 90 85 L90 60 C90 30 75 10 50 10 Z"
              fill="currentColor"
            />
            <circle cx="35" cy="55" r="6" fill="#000" />
            <circle cx="65" cy="55" r="6" fill="#000" />
            <path
              d="M50 20 C42 20 38 24 38 28 C38 32 42 34 46 34 L54 34 C58 34 62 32 62 28 C62 24 58 20 50 20"
              fill="none"
              stroke="#ccff00"
              strokeWidth="2"
              opacity="0.6"
            />
            <path d="M50 20 L50 34" stroke="#ccff00" strokeWidth="1" opacity="0.4" />
          </>
        )
      case 'outline':
        return (
          <>
            <path
              d="M50 10 C25 10 10 30 10 60 L10 85 C10 90 20 95 30 90 C40 85 45 95 50 90 C55 85 60 95 70 90 C80 85 90 90 90 85 L90 60 C90 30 75 10 50 10 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="35" cy="45" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="65" cy="45" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
          </>
        )
      case 'logo':
      default:
        return (
          <>
            <path
              d="M50 10 C25 10 10 30 10 60 L10 85 C10 90 20 95 30 90 C40 85 45 95 50 90 C55 85 60 95 70 90 C80 85 90 90 90 85 L90 60 C90 30 75 10 50 10 Z"
              fill="currentColor"
            />
            <circle cx="35" cy="45" r="6" fill="#ccff00" />
            <circle cx="65" cy="45" r="6" fill="#ccff00" />
            <rect x="30" y="60" width="40" height="4" rx="2" fill="#ccff00" opacity="0.8" />
            <path
              d="M35 60 L35 64 M40 60 L40 64 M45 60 L45 64 M50 60 L50 64 M55 60 L55 64 M60 60 L60 64 M65 60 L65 64"
              stroke="#000"
              strokeWidth="1"
            />
          </>
        )
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {getPaths()}
    </svg>
  )
}
