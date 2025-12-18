'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { flatDocsConfig } from '@/config/docs'

export function DocsPager() {
  const pathname = usePathname()
  const activeIndex = flatDocsConfig.findIndex((item) => item.href === pathname)
  
  const prev = activeIndex > 0 ? flatDocsConfig[activeIndex - 1] : null
  const next = activeIndex < flatDocsConfig.length - 1 ? flatDocsConfig[activeIndex + 1] : null

  if (!prev && !next) return null

  return (
    <div className="flex flex-row items-center justify-between pt-12">
      {prev && (
        <Link
          href={prev.href}
          className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 min-w-[140px]"
        >
          <div className="flex items-center text-xs text-muted-foreground group-hover:text-primary">
            <ChevronLeft className="mr-1 h-3 w-3" />
            Previous
          </div>
          <div className="text-sm font-bold text-foreground">
            {prev.title}
          </div>
        </Link>
      )}
      <div className="flex-1" />
      {next && (
        <Link
          href={next.href}
          className="group flex flex-col items-end gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 min-w-[140px]"
        >
          <div className="flex items-center text-xs text-muted-foreground group-hover:text-primary">
            Next
            <ChevronRight className="ml-1 h-3 w-3" />
          </div>
          <div className="text-sm font-bold text-foreground">
            {next.title}
          </div>
        </Link>
      )}
    </div>
  )
}
