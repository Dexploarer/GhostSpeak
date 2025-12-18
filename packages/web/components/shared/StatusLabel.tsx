'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface StatusLabelProps {
  label: string
  value: string
  className?: string
  variant?: 'primary' | 'white' | 'gray' | 'dim'
  align?: 'left' | 'right' | 'center'
  animate?: boolean
  glitch?: boolean
}

export const StatusLabel: React.FC<StatusLabelProps> = ({
  label,
  value,
  className,
  variant = 'white',
  align = 'left',
  animate = false,
  glitch = false,
}) => {
  const variantStyles = {
    primary: 'text-primary',
    white: 'text-foreground', // Changed to text-foreground
    gray: 'text-muted-foreground', // Changed to text-muted-foreground
    dim: 'text-foreground/40', // Changed to text-foreground/40
  }

  const labelStyles = {
    primary: 'text-primary/50',
    white: 'text-muted-foreground/60', // Changed to text-muted-foreground/60
    gray: 'text-muted-foreground/40', // Changed to text-muted-foreground/40
    dim: 'text-foreground/20', // Changed to text-foreground/20
  }

  return (
    <div className={cn(
      "flex flex-col gap-1",
      align === 'right' ? 'items-end text-right' : align === 'center' ? 'items-center text-center' : 'items-start text-left',
      className
    )}>
      <span className={cn(
        "text-[10px] font-mono uppercase tracking-[0.2em] leading-none",
        labelStyles[variant]
      )}>
        {label}
      </span>
      <motion.span 
        initial={animate ? { opacity: 0, y: 5 } : false}
        animate={animate ? { opacity: 1, y: 0 } : false}
        className={cn(
          "text-xl font-black italic tracking-tighter leading-none",
          variantStyles[variant],
          animate && "animate-pulse"
        )}
      >
        {value}
      </motion.span>
    </div>
  )
}
