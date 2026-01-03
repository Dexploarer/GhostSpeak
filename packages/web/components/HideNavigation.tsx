'use client'

import { useEffect } from 'react'

export function HideNavigation() {
  useEffect(() => {
    // Hide the navigation on mount
    const nav = document.querySelector('nav')
    if (nav) {
      nav.style.display = 'none'
    }

    // Restore on unmount
    return () => {
      const nav = document.querySelector('nav')
      if (nav) {
        nav.style.display = ''
      }
    }
  }, [])

  return null
}
