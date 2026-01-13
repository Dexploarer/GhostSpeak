/**
 * Global TypeScript declarations for React 19 compatibility
 *
 * Fixes type issues with Next.js Image and Lucide React icons in React 19
 */

import 'react'

declare module 'react' {
  // Fix for React 19 compatibility with forwardRef components
  // This addresses the "Property 'children' is missing in type 'ReactElement'" error
  interface ReactPortal {
    children?: ReactNode
  }
}
