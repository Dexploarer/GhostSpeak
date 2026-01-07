'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LucideIcon, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrendIndicator } from './TrendIndicator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface StatCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    subtitle?: string
    trend?: number
    trendLabel?: string
    trendReverse?: boolean
    description?: string
    className?: string
    glowColor?: string // e.g. 'lime' | 'blue' | 'purple'
    loading?: boolean
    onClick?: () => void
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon: Icon,
    subtitle,
    trend,
    trendLabel,
    trendReverse,
    description,
    className,
    glowColor = 'lime',
    loading = false,
    onClick,
}) => {
    const [isHovered, setIsHovered] = useState(false)

    const glowStyles = {
        lime: 'group-hover:border-lime-500/40 group-hover:shadow-[0_0_20px_rgba(204,255,0,0.1)]',
        blue: 'group-hover:border-blue-500/40 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]',
        purple: 'group-hover:border-purple-500/40 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]',
        emerald: 'group-hover:border-emerald-500/40 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]',
    }

    const iconColors = {
        lime: 'text-lime-500',
        blue: 'text-blue-500',
        purple: 'text-purple-500',
        emerald: 'text-emerald-500',
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={onClick}
            className={cn(
                'group relative p-6 bg-[#111111] border border-white/5 rounded-2xl transition-all duration-300',
                glowStyles[glowColor as keyof typeof glowStyles] || glowStyles.lime,
                onClick && 'cursor-pointer active:scale-[0.98]',
                className
            )}
        >
            {/* Background Glow Effect */}
            <div
                className={cn(
                    'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none',
                    glowColor === 'lime' && 'bg-lime-500',
                    glowColor === 'blue' && 'bg-blue-500',
                    glowColor === 'purple' && 'bg-purple-500',
                    glowColor === 'emerald' && 'bg-emerald-500'
                )}
            />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-white/40">
                                {title}
                            </p>
                            {description && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="w-3 h-3 text-white/20 hover:text-white/40 transition-colors cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-[#1a1a1a] border-white/10 text-white text-[11px] max-w-[200px]">
                                            {description}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>

                        <div className="flex items-baseline gap-2">
                            <AnimatePresence mode="wait">
                                <motion.h3
                                    key={loading ? 'loading' : String(value)}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="text-3xl font-bold tracking-tight text-white font-mono"
                                >
                                    {loading ? (
                                        <div className="h-9 w-24 bg-white/5 animate-pulse rounded" />
                                    ) : (
                                        value
                                    )}
                                </motion.h3>
                            </AnimatePresence>
                        </div>
                    </div>

                    <div
                        className={cn(
                            'p-2.5 rounded-xl bg-white/5 border border-white/5 transition-all duration-300',
                            isHovered && 'bg-white/10 border-white/10 scale-110 shadow-lg'
                        )}
                    >
                        <Icon className={cn('w-5 h-5', iconColors[glowColor as keyof typeof iconColors] || iconColors.lime)} />
                    </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                    <div className="flex flex-col">
                        {subtitle && (
                            <p className="text-xs text-white/40 font-medium">{subtitle}</p>
                        )}
                    </div>

                    {trend !== undefined && (
                        <TrendIndicator
                            value={trend}
                            label={trendLabel}
                            reverse={trendReverse}
                            className="animate-in fade-in slide-in-from-right-2 duration-500"
                        />
                    )}
                </div>

                {/* Decorative elements */}
                <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Subtle Micro-Interaction: Corner light */}
            <div className="absolute -top-px -left-px w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className={cn(
                    "absolute top-0 left-0 w-full h-full rounded-tl-2xl blur-[2px]",
                    glowColor === 'lime' && 'bg-lime-500/20',
                    glowColor === 'blue' && 'bg-blue-500/20'
                )} />
            </div>
        </motion.div>
    )
}
