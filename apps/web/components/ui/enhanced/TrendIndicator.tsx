'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrendIndicatorProps {
    value: number
    label?: string
    className?: string
    showIcon?: boolean
    reverse?: boolean // if true, positive is bad (e.g. latency)
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
    value,
    label,
    className,
    showIcon = true,
    reverse = false,
}) => {
    const isPositive = value > 0
    const isNeutral = value === 0

    const getVariant = () => {
        if (isNeutral) return 'neutral'
        if (reverse) return isPositive ? 'negative' : 'positive'
        return isPositive ? 'positive' : 'negative'
    }

    const variant = getVariant()

    const colors = {
        positive: 'text-lime-500 bg-lime-500/10 border-lime-500/20',
        negative: 'text-red-500 bg-red-500/10 border-red-500/20',
        neutral: 'text-white/40 bg-white/5 border-white/10',
    }

    const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown

    return (
        <div
            className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium tracking-wide',
                colors[variant],
                className
            )}
        >
            {showIcon && <Icon className="w-3 h-3" />}
            <span>
                {isNeutral ? '' : isPositive ? '+' : ''}
                {value}%
            </span>
            {label && <span className="ml-1 opacity-60 uppercase">{label}</span>}
        </div>
    )
}
