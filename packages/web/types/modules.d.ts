/**
 * Module declarations to help TypeScript resolve modules
 * This file should not normally be needed, but helps with IDE caching issues
 */

// Ensure lucide-react types are recognized
declare module 'lucide-react' {
  export * from 'lucide-react'
}

// Ensure class-variance-authority types are recognized
declare module 'class-variance-authority' {
  export * from 'class-variance-authority'
}
