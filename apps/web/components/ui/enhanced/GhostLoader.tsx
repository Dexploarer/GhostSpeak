'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface GhostLoaderProps {
    className?: string
    variant?: 'card' | 'list' | 'text' | 'circle'
    count?: number
}

export const GhostLoader: React.FC<GhostLoaderProps> = ({
    className,
    variant = 'card',
    count = 1,
}) => {
    const items = Array.from({ length: count })

    if (variant === 'card') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                {items.map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            'h-[140px] w-full bg-[#111111] border border-white/5 rounded-2xl overflow-hidden relative',
                            className
                        )}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                        <div className="p-6 space-y-4">
                            <div className="h-2 w-16 bg-white/5 rounded" />
                            <div className="h-8 w-24 bg-white/5 rounded" />
                            <div className="h-2 w-full bg-white/5 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (variant === 'list') {
        return (
            <div className="space-y-3 w-full">
                {items.map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            'h-16 w-full bg-[#111111] border border-white/5 rounded-xl overflow-hidden relative',
                            className
                        )}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                        <div className="h-full flex items-center px-4 gap-4">
                            <div className="h-8 w-8 bg-white/5 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="h-2 w-32 bg-white/5 rounded" />
                                <div className="h-2 w-24 bg-white/5 rounded" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (variant === 'circle') {
        return (
            <div className={cn('relative rounded-full bg-[#111111] border border-white/5 overflow-hidden', className)}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
            </div>
        )
    }

    return (
        <div className={cn('h-4 w-full bg-white/5 rounded animate-pulse', className)} />
    )
}
