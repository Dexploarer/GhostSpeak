'use client'

import React from 'react'
import { cn } from '@/lib/utils'

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'premium'

interface StatusBadgeProps {
    label: string
    variant?: StatusVariant
    icon?: React.ReactNode
    pulse?: boolean
    className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    label,
    variant = 'neutral',
    icon,
    pulse = false,
    className,
}) => {
    const styles = {
        success: 'text-green-500 bg-green-500/10 border-green-500/20',
        warning: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        error: 'text-red-500 bg-red-500/10 border-red-500/20',
        info: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        neutral: 'text-white/60 bg-white/5 border-white/10',
        premium: 'text-lime-500 bg-lime-500/10 border-lime-500/20 shadow-[0_0_10px_rgba(204,255,0,0.1)]',
    }

    const dotColors = {
        success: 'bg-green-500',
        warning: 'bg-amber-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        neutral: 'bg-white/40',
        premium: 'bg-lime-500',
    }

    return (
        <div
            className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all duration-300',
                styles[variant],
                className
            )}
        >
            {pulse && (
                <span className="relative flex h-1.5 w-1.5">
                    <span className={cn(
                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                        dotColors[variant]
                    )}></span>
                    <span className={cn(
                        "relative inline-flex rounded-full h-1.5 w-1.5",
                        dotColors[variant]
                    )}></span>
                </span>
            )}
            {!pulse && icon && <span className="shrink-0">{icon}</span>}
            <span>{label}</span>
        </div>
    )
}
