/**
 * Info Row Component
 * Displays labeled information in a consistent format
 */

import React from 'react'
import { Box, Text } from 'ink'

export interface InfoRowProps {
  label: string
  value: string | number
  color?: string
  dimLabel?: boolean
}

export const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  color = 'white',
  dimLabel = true,
}) => {
  return (
    <Box>
      <Box width={25}>
        <Text dimColor={dimLabel}>{label}:</Text>
      </Box>
      <Text color={color}>{value}</Text>
    </Box>
  )
}
