/**
 * Status Badge Component
 * Visual status indicator with icon and color
 */

import React from 'react'
import { Box, Text } from 'ink'

export type StatusType = 'success' | 'error' | 'warning' | 'info' | 'pending'

export interface StatusBadgeProps {
  status: StatusType
  text: string
}

const statusConfig = {
  success: { icon: '✅', color: 'green' as const },
  error: { icon: '❌', color: 'red' as const },
  warning: { icon: '⚠️ ', color: 'yellow' as const },
  info: { icon: 'ℹ️ ', color: 'blue' as const },
  pending: { icon: '⏳', color: 'gray' as const },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text }) => {
  const config = statusConfig[status]

  return (
    <Box>
      <Text>{config.icon} </Text>
      <Text color={config.color}>{text}</Text>
    </Box>
  )
}
