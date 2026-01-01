/**
 * Chart Component
 * ASCII bar and line charts for analytics
 */

import React from 'react'
import { Box, Text } from 'ink'

export type ChartType = 'bar' | 'line'

export interface ChartDataPoint {
  label: string
  value: number
  color?: 'cyan' | 'green' | 'yellow' | 'red' | 'magenta' | 'blue' | 'white' | 'gray'
}

export interface ChartProps {
  /**
   * Chart type
   * @default 'bar'
   */
  type?: ChartType
  /**
   * Data points to display
   */
  data: ChartDataPoint[]
  /**
   * Maximum height of bars (in characters)
   * @default 10
   */
  maxHeight?: number
  /**
   * Width of each bar (in characters)
   * @default 3
   */
  barWidth?: number
  /**
   * Show grid lines
   * @default false
   */
  showGrid?: boolean
  /**
   * Show values on bars
   * @default true
   */
  showValues?: boolean
  /**
   * Chart title
   */
  title?: string
  /**
   * Default bar color
   * @default 'cyan'
   */
  defaultColor?: 'cyan' | 'green' | 'yellow' | 'red' | 'magenta' | 'blue' | 'white' | 'gray'
}

export const Chart: React.FC<ChartProps> = ({
  type = 'bar',
  data,
  maxHeight = 10,
  barWidth = 3,
  showGrid = false,
  showValues = true,
  title,
  defaultColor = 'cyan',
}) => {
  if (data.length === 0) {
    return (
      <Box>
        <Text dimColor>No data to display</Text>
      </Box>
    )
  }

  // Find max value for scaling
  const maxValue = Math.max(...data.map(d => d.value), 1)

  // Calculate bar heights
  const bars = data.map(point => {
    const height = Math.max(1, Math.round((point.value / maxValue) * maxHeight))
    const color = point.color || defaultColor
    return { ...point, height, color }
  })

  if (type === 'bar') {
    return (
      <Box flexDirection="column">
        {title && (
          <Box marginBottom={1}>
            <Text bold>{title}</Text>
          </Box>
        )}

        {/* Chart area */}
        <Box flexDirection="column">
          {/* Render bars from top to bottom */}
          {Array.from({ length: maxHeight }).map((_, rowIndex) => {
            const row = maxHeight - rowIndex - 1
            return (
              <Box key={rowIndex}>
                {showGrid && (
                  <Box width={3}>
                    <Text dimColor>{row === 0 ? '  0' : '   '}</Text>
                  </Box>
                )}
                {bars.map((bar, barIndex) => (
                  <Box key={barIndex} width={barWidth + 1}>
                    <Text color={bar.height > row ? bar.color : undefined}>
                      {bar.height > row ? '█'.repeat(barWidth) : ' '.repeat(barWidth)}
                    </Text>
                  </Box>
                ))}
              </Box>
            )
          })}

          {/* Bottom line */}
          <Box>
            {showGrid && <Box width={3}><Text dimColor>   </Text></Box>}
            {bars.map((_, index) => (
              <Text key={index} dimColor>
                {'─'.repeat(barWidth)}{' '}
              </Text>
            ))}
          </Box>

          {/* Labels */}
          <Box>
            {showGrid && <Box width={3}><Text> </Text></Box>}
            {bars.map((bar, index) => (
              <Box key={index} width={barWidth + 1}>
                <Text>{bar.label.slice(0, barWidth)}</Text>
              </Box>
            ))}
          </Box>

          {/* Values */}
          {showValues && (
            <Box marginTop={1}>
              {showGrid && <Box width={3}><Text> </Text></Box>}
              {bars.map((bar, index) => (
                <Box key={index} width={barWidth + 1}>
                  <Text dimColor>{bar.value}</Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    )
  }

  // Line chart (simple ASCII representation)
  return (
    <Box flexDirection="column">
      {title && (
        <Box marginBottom={1}>
          <Text bold>{title}</Text>
        </Box>
      )}

      {data.map((point, index) => {
        const barLength = Math.max(1, Math.round((point.value / maxValue) * 40))
        return (
          <Box key={index} marginBottom={1}>
            <Box width={15}>
              <Text>{point.label}: </Text>
            </Box>
            <Text color={point.color || defaultColor}>
              {'━'.repeat(barLength)}
            </Text>
            {showValues && (
              <Box marginLeft={1}>
                <Text dimColor>({point.value})</Text>
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  )
}
