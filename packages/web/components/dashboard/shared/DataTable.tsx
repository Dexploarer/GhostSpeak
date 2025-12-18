'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

interface Column<T> {
  header: string
  accessorKey?: keyof T
  cell?: (item: T) => React.ReactNode
  className?: string
  sortable?: boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  title?: string
  description?: string
  actions?: React.ReactNode
  isLoading?: boolean
  emptyMessage?: string
  onRowClick?: (item: T) => void
  keyExtractor?: (item: T, index: number) => string
}

type SortDirection = 'asc' | 'desc' | null

export function DataTable<T>({
  data,
  columns,
  title,
  description,
  actions,
  isLoading,
  emptyMessage = 'No data available',
  onRowClick,
  keyExtractor = (_, i) => String(i)
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const handleSort = (key: keyof T | undefined) => {
    if (!key) return
    
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortKey(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDirection) return data
    
    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      
      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      
      const comparison = aVal < bVal ? -1 : 1
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortKey, sortDirection])

  const getSortIcon = (key: keyof T | undefined) => {
    if (!key || sortKey !== key) {
      return <ChevronsUpDown className="w-4 h-4 text-muted-foreground/50" />
    }
    if (sortDirection === 'asc') {
      return <ChevronUp className="w-4 h-4 text-primary" />
    }
    return <ChevronDown className="w-4 h-4 text-primary" />
  }

  return (
    <div className="rounded-2xl bg-card/50 backdrop-blur-xl border border-border overflow-hidden">
      {/* Header */}
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border bg-muted/30">
          <div>
            {title && (
              <h3 className="text-base font-bold text-foreground">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={cn(
                    'px-6 py-3 font-bold text-left',
                    col.sortable && col.accessorKey && 'cursor-pointer hover:text-foreground transition-colors',
                    col.className
                  )}
                  onClick={() => col.sortable && handleSort(col.accessorKey)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && col.accessorKey && getSortIcon(col.accessorKey)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              // Skeleton Loading
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <p className="text-muted-foreground">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              sortedData.map((item, i) => (
                <tr
                  key={keyExtractor(item, i)}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-primary/5',
                    !onRowClick && 'hover:bg-muted/30'
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col, j) => (
                    <td key={j} className={cn('px-6 py-4 text-foreground', col.className)}>
                      {col.cell
                        ? col.cell(item)
                        : col.accessorKey
                          ? String(item[col.accessorKey] ?? '-')
                          : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
