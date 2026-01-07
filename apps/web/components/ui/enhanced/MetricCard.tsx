'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { TrendIndicator } from './TrendIndicator'

interface MetricCardProps {
    label: string
    value: string | number
    trend?: number
    className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
    label,
    value,
    trend,
    className,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                'p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-1',
                className
            )}
        >
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">{label}</span>
            <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-white font-mono">{value}</span>
                {trend !== undefined && <TrendIndicator value={trend} className="scale-75 origin-right" />}
            </div>
        </motion.div>
    )
}
