/**
 * Enhanced Spinner Component
 * Multi-state loading spinner with icons and labels
 */

import React from 'react'
import { Box, Text } from 'ink'
import InkSpinner from 'ink-spinner'

export type SpinnerState = 'loading' | 'success' | 'error' | 'warning'
export type SpinnerType = 'dots' | 'line' | 'arc' | 'bouncingBar'

export interface SpinnerProps {
  /**
   * Current state of the spinner
   * @default 'loading'
   */
  state?: SpinnerState
  /**
   * Type of spinner animation
   * @default 'dots'
   */
  type?: SpinnerType
  /**
   * Label text to display next to spinner
   */
  label?: string
  /**
   * Custom color (overrides state color)
   */
  color?: 'cyan' | 'green' | 'yellow' | 'red' | 'magenta' | 'blue' | 'white' | 'gray'
}

const stateConfig = {
  loading: { icon: null, color: 'cyan' as const, spinning: true },
  success: { icon: '✅', color: 'green' as const, spinning: false },
  error: { icon: '❌', color: 'red' as const, spinning: false },
  warning: { icon: '⚠️ ', color: 'yellow' as const, spinning: false },
}

export const Spinner: React.FC<SpinnerProps> = ({
  state = 'loading',
  type = 'dots',
  label,
  color,
}) => {
  const config = stateConfig[state]
  const finalColor = color || config.color

  return (
    <Box>
      {config.spinning ? (
        <Text color={finalColor}>
          <InkSpinner type={type} />
        </Text>
      ) : (
        <Text>{config.icon}</Text>
      )}
      {label && (
        <Box marginLeft={1}>
          <Text color={finalColor}>{label}</Text>
        </Box>
      )}
    </Box>
  )
}
