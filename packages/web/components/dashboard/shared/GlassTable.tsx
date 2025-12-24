import React from 'react'
import { GlassCard } from './GlassCard'
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
    <GlassCard className="p-0 overflow-hidden flex flex-col">
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
          {title && <h3 className="font-semibold text-gray-200">{title}</h3>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-black/20 border-b border-white/5">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={cn('px-6 py-3 font-medium', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              // Skeleton Loading Rows
              [1, 2, 3].map((i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-white/5 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  {columns.map((col, j) => (
                    <td key={j} className={cn('px-6 py-4', col.className)}>
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
    </GlassCard>
  )
}
