/**
 * Card Component
 * Info card with border, header, and footer support
 */

import React, { type ReactNode } from 'react'
import { Box, Text } from 'ink'

export interface CardProps {
  /**
   * Card content
   */
  children: ReactNode
  /**
   * Optional title for header
   */
  title?: string
  /**
   * Optional footer content
   */
  footer?: ReactNode
  /**
   * Border color
   * @default 'cyan'
   */
  borderColor?: 'cyan' | 'green' | 'yellow' | 'red' | 'magenta' | 'blue' | 'white' | 'gray'
  /**
   * Border style
   * @default 'single'
   */
  borderStyle?: 'single' | 'double' | 'round' | 'bold'
  /**
   * Padding inside the card
   * @default 1
   */
  padding?: number
  /**
   * Width of the card
   */
  width?: number
  /**
   * Show border
   * @default true
   */
  showBorder?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  footer,
  borderColor = 'cyan',
  borderStyle = 'single',
  padding = 1,
  width,
  showBorder = true,
}) => {
  return (
    <Box
      flexDirection="column"
      borderStyle={showBorder ? borderStyle : undefined}
      borderColor={showBorder ? borderColor : undefined}
      padding={padding}
      width={width}
    >
      {title && (
        <Box marginBottom={1} flexDirection="column">
          <Text bold color={borderColor}>
            {title}
          </Text>
          <Box marginTop={1}>
            <Text dimColor>{'─'.repeat(width ? width - padding * 2 - 2 : 50)}</Text>
          </Box>
        </Box>
      )}

      <Box flexDirection="column">{children}</Box>

      {footer && (
        <Box marginTop={1} flexDirection="column">
          <Box marginBottom={1}>
            <Text dimColor>{'─'.repeat(width ? width - padding * 2 - 2 : 50)}</Text>
          </Box>
          {footer}
        </Box>
      )}
    </Box>
  )
}
