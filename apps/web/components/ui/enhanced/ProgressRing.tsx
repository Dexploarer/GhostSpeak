'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressRingProps {
    value: number
    size?: number
    strokeWidth?: number
    className?: string
    color?: 'lime' | 'blue' | 'purple' | 'red' | 'emerald'
    showValue?: boolean
    label?: string
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
    value,
    size = 120,
    strokeWidth = 8,
    className,
    color = 'lime',
    showValue = true,
    label,
}) => {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (value / 100) * circumference

    const colors = {
        lime: 'stroke-lime-500',
        blue: 'stroke-blue-500',
        purple: 'stroke-purple-500',
        red: 'stroke-red-500',
        emerald: 'stroke-emerald-500',
    }

    const glowColors = {
        lime: 'shadow-lime-500/20',
        blue: 'shadow-blue-500/20',
        purple: 'shadow-purple-500/20',
        red: 'shadow-red-500/20',
        emerald: 'shadow-emerald-500/20',
    }

    return (
        <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background Trace */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-white/5"
                />
                {/* Progress Circle */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    strokeLinecap="round"
                    fill="transparent"
                    className={cn(colors[color], 'transition-all duration-300')}
                    style={{
                        filter: `drop-shadow(0 0 4px ${color === 'lime' ? 'rgba(204, 255, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)'})`,
                    }}
                />
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {showValue && (
                    <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-2xl font-bold text-white font-mono"
                    >
                        {Math.round(value)}%
                    </motion.span>
                )}
                {label && <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">{label}</span>}
            </div>

            {/* Subtle Glow Overlay */}
            <div className={cn(
                "absolute inset-0 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none",
                glowColors[color]
            )} />
        </div>
    )
}
