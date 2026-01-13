/**
 * GhostSpeak Color Constants
 *
 * Central reference for all brand colors and design tokens.
 * See DESIGN_SYSTEM.md for comprehensive documentation.
 */

export const COLORS = {
  // Primary Brand Color
  PRIMARY: {
    LIGHT: '#a3e635',
    DARK: '#ccff00',
    FOREGROUND: '#000000',
    RGB: { LIGHT: '163, 230, 53', DARK: '204, 255, 0' }
  },

  // Core Theme Colors
  THEME: {
    BACKGROUND: { LIGHT: '#f8fafc', DARK: '#0a0a0a' },
    FOREGROUND: { LIGHT: '#020617', DARK: '#f8fafc' },
    CARD: { LIGHT: '#ffffff', DARK: '#111111' },
    MUTED: { LIGHT: '#f1f5f9', DARK: '#1a1a1a' },
    BORDER: { LIGHT: '#e2e8f0', DARK: '#262626' }
  },

  // Status Colors
  STATUS: {
    DESTRUCTIVE: '#ef4444',
    DESTRUCTIVE_FOREGROUND: '#ffffff'
  }
} as const

/**
 * Quick Reference - Most Used Colors
 */
export const PRIMARY_COLOR = '#ccff00' // Electric lime (brand color)
export const PRIMARY_LIGHT = '#a3e635' // Softer lime for light theme
export const DARK_BACKGROUND = '#0a0a0a' // Pure dark
export const CARD_BACKGROUND = '#111111' // Card background (dark)
export const TEXT_COLOR = '#f8fafc' // Main text color (dark)

/**
 * CSS Custom Property Names
 *
 * Use these with var() in CSS/JS
 */
export const CSS_VARS = {
  PRIMARY: '--primary',
  PRIMARY_FOREGROUND: '--primary-foreground',
  PRIMARY_RGB: '--primary-rgb',
  BACKGROUND: '--background',
  FOREGROUND: '--foreground',
  CARD: '--card',
  BORDER: '--border',
  MUTED: '--muted',
  ACCENT: '--accent'
} as const

/**
 * Tailwind Classes Reference
 */
export const TAILWIND_CLASSES = {
  PRIMARY: 'bg-primary text-primary-foreground',
  CARD: 'bg-card text-card-foreground border border-border',
  MUTED: 'bg-muted text-muted-foreground',
  ACCENT: 'bg-accent text-accent-foreground',
  DESTRUCTIVE: 'bg-destructive text-destructive-foreground'
} as const