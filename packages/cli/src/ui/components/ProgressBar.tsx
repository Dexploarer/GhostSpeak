/**
 * Progress Bar Component
 * Beautiful progress bar with percentage and custom styling
 */

import React from 'react'
import { Box, Text } from 'ink'
import { ProgressBar as InkProgressBar } from '@inkjs/ui'

export interface ProgressBarProps {
  /**
   * Current progress value (0-100)
   */
  value: number
  /**
   * Label to display above the progress bar
   */
  label?: string
  /**
   * Show percentage text
   * @default true
   */
  showPercentage?: boolean
  /**
   * Color of the progress bar
   * @default 'cyan'
   */
  color?: 'cyan' | 'green' | 'yellow' | 'red' | 'magenta' | 'blue'
  /**
   * Width of the progress bar in characters
   * @default 40
   */
  width?: number
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  showPercentage = true,
  color = 'cyan',
  width = 40,
}) => {
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value))

  return (
    <Box flexDirection="column">
      {label && (
        <Box marginBottom={1}>
          <Text bold>{label}</Text>
        </Box>
      )}
      <Box>
        <InkProgressBar value={clampedValue} />
        {showPercentage && (
          <Box marginLeft={2}>
            <Text color={color} bold>
              {clampedValue.toFixed(0)}%
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  )
}
