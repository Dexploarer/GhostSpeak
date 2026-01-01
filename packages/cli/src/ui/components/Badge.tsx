/**
 * Badge Component
 * Tier badges for Ghost Score and custom badges
 */

import React from 'react'
import { Box, Text } from 'ink'

export type TierType = 'platinum' | 'gold' | 'silver' | 'bronze' | 'newcomer'
export type BadgeVariant = 'tier' | 'custom'

export interface BadgeProps {
  /**
   * Variant of badge
   * @default 'tier'
   */
  variant?: BadgeVariant
  /**
   * Tier type (for tier variant)
   */
  tier?: TierType
  /**
   * Custom text (for custom variant)
   */
  text?: string
  /**
   * Custom color (for custom variant)
   */
  color?: 'cyan' | 'green' | 'yellow' | 'red' | 'magenta' | 'blue' | 'white' | 'gray'
  /**
   * Optional icon/emoji
   */
  icon?: string
  /**
   * Show as bold text
   * @default false
   */
  bold?: boolean
}

const tierConfig = {
  platinum: { text: 'PLATINUM', color: 'cyan' as const, icon: '💎' },
  gold: { text: 'GOLD', color: 'yellow' as const, icon: '🥇' },
  silver: { text: 'SILVER', color: 'white' as const, icon: '🥈' },
  bronze: { text: 'BRONZE', color: 'red' as const, icon: '🥉' },
  newcomer: { text: 'NEWCOMER', color: 'gray' as const, icon: '🆕' },
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'tier',
  tier = 'newcomer',
  text,
  color,
  icon,
  bold = false,
}) => {
  let displayText: string
  let displayColor: string
  let displayIcon: string | undefined

  if (variant === 'tier' && tier) {
    const config = tierConfig[tier]
    displayText = config.text
    displayColor = config.color
    displayIcon = icon ?? config.icon
  } else {
    displayText = text || 'BADGE'
    displayColor = color || 'cyan'
    displayIcon = icon
  }

  return (
    <Box>
      {displayIcon && (
        <Text>
          {displayIcon}
          {' '}
        </Text>
      )}
      <Text color={displayColor} bold={bold}>
        [{displayText}]
      </Text>
    </Box>
  )
}
