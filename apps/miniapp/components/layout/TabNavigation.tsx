'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

interface Tab {
  id: string
  label: string
  icon: string
  href: string
}

const tabs: Tab[] = [
  {
    id: 'verify',
    label: 'Caisper',
    icon: '👻',
    href: '/verify',
  },
  {
    id: 'create',
    label: 'Boo',
    icon: '🎨',
    href: '/create',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: '👤',
    href: '/profile',
  },
]

export function TabNavigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card backdrop-blur-lg">
      <div className="grid grid-cols-3">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href)

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={clsx(
                'flex flex-col items-center justify-center gap-1 py-3 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground active:text-primary'
              )}
            >
              <span className="text-2xl">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
