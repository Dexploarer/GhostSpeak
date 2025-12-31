/**
 * Base Layout Component for Ink CLI
 * Provides consistent header, footer, and content areas
 */

import React, { type ReactNode } from 'react'
import { Box, Text } from 'ink'
import Gradient from 'ink-gradient'
import BigText from 'ink-big-text'

interface LayoutProps {
  children: ReactNode
  title?: string
  showHeader?: boolean
  showFooter?: boolean
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  showHeader = true,
  showFooter = true,
}) => {
  return (
    <Box flexDirection="column" padding={1}>
      {showHeader && (
        <Box flexDirection="column" marginBottom={1}>
          <Gradient name="rainbow">
            <BigText text="GHOST" font="tiny" />
          </Gradient>
          <Text dimColor>AI Agent Commerce Protocol</Text>
          {title && (
            <Box marginTop={1}>
              <Text bold color="cyan">
                {title}
              </Text>
            </Box>
          )}
          <Box marginY={1}>
            <Text dimColor>{'─'.repeat(60)}</Text>
          </Box>
        </Box>
      )}

      <Box flexDirection="column">{children}</Box>

      {showFooter && (
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text dimColor>{'─'.repeat(60)}</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              Press <Text color="yellow">Ctrl+C</Text> to exit
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}
