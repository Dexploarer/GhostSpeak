'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { docsConfig } from '@/config/docs'

export function DocsBreadcrumbs() {
  const pathname = usePathname()
  
  const section = docsConfig.find(s => s.items.some(i => i.href === pathname))
  const item = section?.items.find(i => i.href === pathname)

  if (!item) return null

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
      <Link href="/docs" className="hover:text-primary transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      <ChevronRight className="h-3.5 w-3.5" />
      {section && (
        <>
          <span className="font-medium">{section.title}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </>
      )}
      <span className="text-foreground font-bold">{item.title}</span>
    </nav>
  )
}
