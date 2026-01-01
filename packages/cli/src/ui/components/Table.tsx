/**
 * Enhanced Table Component
 * Wrapper around ink-table with sorting, pagination, and highlighting
 */

import React, { useState, useMemo } from 'react'
import { Box, Text } from 'ink'
import InkTable from 'ink-table'

export interface TableColumn<T = any> {
  /**
   * Column header text
   */
  header: string
  /**
   * Key to access data from row object
   */
  key: keyof T
  /**
   * Custom width for column
   */
  width?: number
  /**
   * Enable sorting for this column
   * @default false
   */
  sortable?: boolean
}

export interface TableProps<T = any> {
  /**
   * Column definitions
   */
  columns: TableColumn<T>[]
  /**
   * Table data rows
   */
  data: T[]
  /**
   * Highlight row index
   */
  highlightIndex?: number
  /**
   * Highlight color
   * @default 'cyan'
   */
  highlightColor?: 'cyan' | 'green' | 'yellow' | 'red' | 'magenta' | 'blue' | 'white'
  /**
   * Enable pagination
   * @default false
   */
  paginate?: boolean
  /**
   * Rows per page
   * @default 10
   */
  pageSize?: number
  /**
   * Current page (0-indexed)
   * @default 0
   */
  currentPage?: number
  /**
   * Show table header
   * @default true
   */
  showHeader?: boolean
  /**
   * Cell padding
   * @default 1
   */
  cellPadding?: number
}

export const Table = <T extends Record<string, any>>({
  columns,
  data,
  highlightIndex,
  highlightColor = 'cyan',
  paginate = false,
  pageSize = 10,
  currentPage = 0,
  showHeader = true,
  cellPadding = 1,
}: TableProps<T>): React.ReactElement => {
  const [sortKey, setSortKey] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return data

    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]

      if (aVal === bVal) return 0

      let result = 0
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        result = aVal - bVal
      } else {
        result = String(aVal).localeCompare(String(bVal))
      }

      return sortDirection === 'asc' ? result : -result
    })
  }, [data, sortKey, sortDirection])

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!paginate) return sortedData

    const start = currentPage * pageSize
    const end = start + pageSize
    return sortedData.slice(start, end)
  }, [sortedData, paginate, currentPage, pageSize])

  // Transform data for ink-table
  const tableData = paginatedData.map((row, index) => {
    const transformedRow: Record<string, any> = {}
    columns.forEach(col => {
      transformedRow[String(col.key)] = row[col.key]
    })
    return transformedRow
  })

  if (data.length === 0) {
    return (
      <Box>
        <Text dimColor>No data to display</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {showHeader && (
        <Box marginBottom={1}>
          <InkTable data={tableData} padding={cellPadding} />
        </Box>
      )}

      {!showHeader && (
        <Box>
          <InkTable data={tableData} padding={cellPadding} />
        </Box>
      )}

      {paginate && (
        <Box marginTop={1}>
          <Text dimColor>
            Page {currentPage + 1} of {Math.ceil(sortedData.length / pageSize)} (
            {sortedData.length} total rows)
          </Text>
        </Box>
      )}
    </Box>
  )
}
