'use client'

import React, { ReactNode } from 'react'
import { SDKErrorBoundary } from './SDKErrorBoundary'
import { QueryErrorBoundary } from './QueryErrorBoundary'

interface GhostSpeakErrorBoundaryProps {
  children: ReactNode
  level?: 'page' | 'component' | 'query'
}

/**
 * Comprehensive Error Boundary for GhostSpeak App
 *
 * Provides layered error handling:
 * 1. SDK Error Boundary - Catches wallet, transaction, and SDK errors
 * 2. Query Error Boundary - Catches React Query errors
 *
 * Usage:
 * - Wrap entire pages with level="page"
 * - Wrap individual components with level="component"
 * - Wrap query-heavy sections with level="query"
 */
export function GhostSpeakErrorBoundary({
  children,
  level = 'component',
}: GhostSpeakErrorBoundaryProps) {
  // For page-level errors, use the full SDK error boundary
  if (level === 'page') {
    return (
      <SDKErrorBoundary>
        <QueryErrorBoundary>{children}</QueryErrorBoundary>
      </SDKErrorBoundary>
    )
  }

  // For query-level errors, focus on query error handling
  if (level === 'query') {
    return <QueryErrorBoundary>{children}</QueryErrorBoundary>
  }

  // For component-level errors, use lightweight error handling
  return (
    <SDKErrorBoundary
      fallback={
        <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
          <p className="text-sm text-muted-foreground">
            This component encountered an error. Please try refreshing the page.
          </p>
        </div>
      }
    >
      {children}
    </SDKErrorBoundary>
  )
}

export default GhostSpeakErrorBoundary
