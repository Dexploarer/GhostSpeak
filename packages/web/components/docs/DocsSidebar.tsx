'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Search, ChevronRight } from 'lucide-react'
import { docsConfig } from '@/config/docs'

export function DocsSidebar({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname()

  const sidebarClasses = isMobile 
    ? "w-full" 
    : "fixed top-16 left-0 z-30 hidden h-[calc(100vh-4rem)] w-64 overflow-y-auto border-r border-border bg-background/50 backdrop-blur-xl md:block"

  return (
    <aside className={sidebarClasses}>
      <div className={cn("py-6 px-4 lg:py-8", isMobile && "py-0 px-0")}>
        {!isMobile && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search docs..."
              className="w-full rounded-md border border-border bg-muted/50 py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
        
        {docsConfig.map((section, idx) => (
          <div key={idx} className="mb-8 last:mb-0">
            <h4 className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-foreground">
              {section.title}
            </h4>
            <div className="grid grid-flow-row auto-rows-max text-sm">
              {section.items.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className={cn(
                    "group flex w-full items-center rounded-md border border-transparent px-2 py-1.5 transition-colors hover:bg-muted/50",
                    pathname === item.href
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.icon && (
                    <span className="mr-2 flex h-4 w-4 items-center justify-center">
                      <item.icon className="w-4 h-4" />
                    </span>
                  )}
                  {item.title}
                  {pathname === item.href && (
                    <ChevronRight className="ml-auto h-3 w-3" />
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
