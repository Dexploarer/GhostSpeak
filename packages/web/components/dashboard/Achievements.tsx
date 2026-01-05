'use client'

import { cn } from '@/lib/utils'
import { Award, Lock, Sparkles, Shield, Zap } from 'lucide-react'

export interface Achievement {
  id: string
  name: string
  description: string
  unlocked: boolean
  unlockedAt?: number
}

interface AchievementsProps {
  achievements: Achievement[]
  className?: string
}

// Map achievement IDs to their icons
const achievementIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  early_adopter: Sparkles,
  first_verification: Shield,
  power_user: Zap,
}

// Map achievement IDs to their colors when unlocked
const achievementColors: Record<string, string> = {
  early_adopter: 'text-primary bg-primary/10 border-primary/30',
  first_verification: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  power_user: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
}

/**
 * Achievements Component
 *
 * Displays user achievement badges with locked/unlocked states
 * Uses the dark card design with lime accents from the dashboard
 */
export function Achievements({ achievements, className }: AchievementsProps) {
  if (!achievements || achievements.length === 0) {
    return null
  }

  return (
    <div className={cn('p-6 bg-[#111111] border border-white/10 rounded-xl', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-light text-white">Achievements</h3>
      </div>

      <div className="flex flex-wrap gap-3">
        {achievements.map((achievement) => (
          <AchievementBadge key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </div>
  )
}

interface AchievementBadgeProps {
  achievement: Achievement
}

function AchievementBadge({ achievement }: AchievementBadgeProps) {
  const Icon = achievementIcons[achievement.id] || Award
  const colorClasses = achievementColors[achievement.id] || 'text-white/60 bg-white/5 border-white/10'

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300',
        achievement.unlocked
          ? cn(colorClasses, 'hover:scale-105 cursor-default')
          : 'text-white/30 bg-white/5 border-white/10 opacity-50'
      )}
    >
      {/* Icon */}
      <div className="relative">
        {achievement.unlocked ? (
          <Icon className="w-4 h-4" />
        ) : (
          <Lock className="w-4 h-4" />
        )}

        {/* Unlock animation glow */}
        {achievement.unlocked && (
          <div className="absolute inset-0 animate-ping opacity-30">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Name */}
      <span className="text-sm font-medium">{achievement.name}</span>

      {/* Tooltip on hover */}
      <div
        className={cn(
          'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg',
          'bg-[#1a1a1a] border border-white/10 text-xs text-white/80',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none',
          'whitespace-nowrap z-10 shadow-lg'
        )}
      >
        <p className="font-medium text-white mb-1">{achievement.name}</p>
        <p className="text-white/60">{achievement.description}</p>
        {achievement.unlocked && achievement.unlockedAt && (
          <p className="text-white/40 mt-1 text-[10px]">
            Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
          </p>
        )}
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
          <div className="border-4 border-transparent border-t-[#1a1a1a]" />
        </div>
      </div>
    </div>
  )
}

interface StreakDisplayProps {
  days: number
  isActive: boolean
  className?: string
}

/**
 * Streak Display Component
 *
 * Shows the user's current activity streak with flame emoji
 * Designed to be placed in the dashboard header area
 */
export function StreakDisplay({ days, isActive, className }: StreakDisplayProps) {
  if (days === 0 && !isActive) {
    return null
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-orange-500/10 border border-orange-500/30',
        'text-orange-400 text-sm font-medium',
        isActive && 'animate-pulse',
        className
      )}
    >
      <span className="text-base" role="img" aria-label="fire">
        🔥
      </span>
      <span>
        {days} day{days !== 1 ? 's' : ''} streak
      </span>
    </div>
  )
}

interface PercentileDisplayProps {
  topPercentage: number
  totalUsers: number
  className?: string
}

/**
 * Percentile Display Component
 *
 * Shows the user's ranking among all users
 * Displays "Top X%" based on Ghost Score
 */
export function PercentileDisplay({ topPercentage, totalUsers, className }: PercentileDisplayProps) {
  // Determine display color based on percentile
  const getPercentileColor = (pct: number): string => {
    if (pct <= 5) return 'text-primary bg-primary/10 border-primary/30' // Top 5%
    if (pct <= 10) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' // Top 10%
    if (pct <= 25) return 'text-blue-400 bg-blue-500/10 border-blue-500/30' // Top 25%
    return 'text-white/60 bg-white/5 border-white/10' // Others
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border',
        getPercentileColor(topPercentage),
        className
      )}
    >
      <span className="font-medium">Top {topPercentage}%</span>
      {totalUsers > 1 && (
        <span className="text-white/40">of {totalUsers.toLocaleString()} users</span>
      )}
    </div>
  )
}
