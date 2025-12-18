'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface TocItem {
  id: string
  text: string
  level: number
}

export function DocsTableOfContents() {
  const [items, setItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const headings = Array.from(document.querySelectorAll('h2, h3'))
      .map((heading) => ({
        id: heading.id,
        text: heading.textContent || '',
        level: parseInt(heading.tagName[1]),
      }))
      .filter((item) => item.id)

    setItems(headings)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '0% 0% -80% 0%' }
    )

    headings.forEach((item) => {
      const element = document.getElementById(item.id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  if (items.length === 0) return null

  return (
    <div className="hidden xl:block fixed top-16 right-0 z-30 h-[calc(100vh-4rem)] w-64 overflow-y-auto px-6 py-12">
      <div className="space-y-2">
        <p className="text-sm font-bold uppercase tracking-wider text-foreground">
          On this page
        </p>
        <div className="flex flex-col space-y-3 pt-4">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={cn(
                "text-sm transition-colors hover:text-primary",
                item.level === 3 && "pl-4",
                activeId === item.id
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              {item.text}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
