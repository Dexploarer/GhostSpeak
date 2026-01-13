'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ActivityTimelineItem {
  id: string | number
  title: string
  subtitle: string
  timestamp: string | number
  type: 'action' | 'success' | 'warning' | 'error' | 'premium'
  icon?: React.ReactNode
  details?: React.ReactNode
}

interface ActivityTimelineProps {
  items: ActivityTimelineItem[]
  className?: string
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ items, className }) => {
  const dotColors = {
    action: 'bg-white/20 ring-white/10',
    success: 'bg-green-500 ring-green-500/20',
    warning: 'bg-amber-500 ring-amber-500/20',
    error: 'bg-red-500 ring-red-500/20',
    premium: 'bg-lime-500 ring-lime-500/20',
  }

  return (
    <div className={cn('space-y-0 relative', className)}>
      {/* Vertical Line */}
      <div className="absolute left-[19px] top-6 bottom-6 w-[2px] bg-white/5" />

      {items.map((item: ActivityTimelineItem, index: number) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
          className="relative pl-12 pb-8 group last:pb-0"
        >
          {/* Timeline Dot */}
          <div
            className={cn(
              'absolute left-[15px] top-1.5 w-[10px] h-[10px] rounded-full ring-4 z-10 transition-all duration-300 group-hover:scale-125',
              dotColors[item.type as keyof typeof dotColors]
            )}
          />

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white group-hover:text-primary transition-colors cursor-default">
                {item.title}
              </h4>
              <span className="text-[10px] text-white/40 font-mono">{item.timestamp}</span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">{item.subtitle}</p>
            {item.details && (
              <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/5 group-hover:bg-white/[0.07] transition-all">
                {item.details}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
