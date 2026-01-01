/**
 * Alert Component
 * Styled alert messages for info, success, warning, and error states
 */

import React from 'react'
import { Box, Text } from 'ink'

export type AlertType = 'info' | 'success' | 'warning' | 'error'

export interface AlertProps {
  /**
   * Alert type/severity
   * @default 'info'
   */
  type?: AlertType
  /**
   * Alert message
   */
  message: string
  /**
   * Optional title
   */
  title?: string
  /**
   * Show icon
   * @default true
   */
  showIcon?: boolean
  /**
   * Show border
   * @default true
   */
  showBorder?: boolean
  /**
   * Dismissible (shows dismiss hint)
   * @default false
   */
  dismissible?: boolean
  /**
   * On dismiss callback
   */
  onDismiss?: () => void
}

const alertConfig = {
  info: {
    icon: 'ℹ️ ',
    color: 'blue' as const,
    borderColor: 'blue' as const,
    prefix: 'INFO',
  },
  success: {
    icon: '✅',
    color: 'green' as const,
    borderColor: 'green' as const,
    prefix: 'SUCCESS',
  },
  warning: {
    icon: '⚠️ ',
    color: 'yellow' as const,
    borderColor: 'yellow' as const,
    prefix: 'WARNING',
  },
  error: {
    icon: '❌',
    color: 'red' as const,
    borderColor: 'red' as const,
    prefix: 'ERROR',
  },
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  message,
  title,
  showIcon = true,
  showBorder = true,
  dismissible = false,
  onDismiss,
}) => {
  const config = alertConfig[type]

  return (
    <Box
      flexDirection="column"
      borderStyle={showBorder ? 'round' : undefined}
      borderColor={showBorder ? config.borderColor : undefined}
      padding={1}
    >
      {/* Title or prefix */}
      <Box marginBottom={title || showIcon ? 1 : 0}>
        {showIcon && <Text>{config.icon} </Text>}
        <Text bold color={config.color}>
          {title || config.prefix}
        </Text>
      </Box>

      {/* Message */}
      <Box flexDirection="column">
        <Text>{message}</Text>
      </Box>

      {/* Dismissible hint */}
      {dismissible && (
        <Box marginTop={1}>
          <Text dimColor>
            Press <Text color="yellow">Esc</Text> to dismiss
          </Text>
        </Box>
      )}
    </Box>
  )
}
