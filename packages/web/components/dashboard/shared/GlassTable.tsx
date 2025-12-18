'use client'

import React from 'react'
import { DashboardCard } from './DashboardCard'
import { cn } from '@/lib/utils'

interface Column<T> {
  header: string
  accessorKey?: keyof T
  cell?: (item: T) => React.ReactNode
  className?: string
}

interface GlassTableProps<T> {
  data: T[]
  columns: Column<T>[]
  title?: string
  actions?: React.ReactNode
  isLoading?: boolean
}

export function GlassTable<T>({ data, columns, title, actions, isLoading }: GlassTableProps<T>) {
  return (
    <DashboardCard title={title} actions={actions} noPadding>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={cn("px-6 py-3 font-medium", col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              // Skeleton Loading Rows
              [1, 2, 3].map((i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-muted-foreground">
                  No data available
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  {columns.map((col, j) => (
                    <td key={j} className={cn("px-6 py-4 text-foreground", col.className)}>
                      {col.cell 
                        ? col.cell(item) 
                        : col.accessorKey 
                          ? String(item[col.accessorKey]) 
                          : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  )
}
