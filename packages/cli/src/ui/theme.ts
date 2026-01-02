/**
 * GhostSpeak CLI Theme
 * Matches web app brand colors: lime green (#ccff00) on dark background
 *
 * Terminal color mapping:
 * - Primary (lime): greenBright (closest to #ccff00)
 * - Success: green
 * - Error: red
 * - Warning: yellow
 * - Info: gray (subtle)
 * - Muted: gray
 */

import type { ForegroundColorName } from 'chalk'

export const THEME = {
  /**
   * Primary brand color - Electric lime (#ccff00)
   * Maps to: greenBright (closest terminal equivalent)
   */
  primary: 'greenBright' as ForegroundColorName,

  /**
   * Primary foreground (text on lime background)
   * Maps to: black
   */
  primaryForeground: 'black' as ForegroundColorName,

  /**
   * Success state
   * Maps to: green
   */
  success: 'green' as ForegroundColorName,

  /**
   * Error/destructive state
   * Maps to: red
   */
  error: 'red' as ForegroundColorName,

  /**
   * Warning state
   * Maps to: yellow
   */
  warning: 'yellow' as ForegroundColorName,

  /**
   * Info/secondary
   * Maps to: gray
   */
  info: 'gray' as ForegroundColorName,

  /**
   * Muted/subtle text
   * Maps to: gray
   */
  muted: 'gray' as ForegroundColorName,

  /**
   * Accent (used sparingly)
   * Maps to: cyan
   */
  accent: 'cyan' as ForegroundColorName,

  /**
   * Default foreground
   * Maps to: white
   */
  foreground: 'white' as ForegroundColorName,

  /**
   * Card/border color for primary elements
   * Maps to: greenBright
   */
  cardPrimary: 'greenBright' as ForegroundColorName,

  /**
   * Card/border color for secondary elements
   * Maps to: gray
   */
  cardSecondary: 'gray' as ForegroundColorName,
} as const

/**
 * Badge variants matching web app
 */
export const BADGE_COLORS = {
  elite: 'magenta' as ForegroundColorName,      // High tier
  expert: 'greenBright' as ForegroundColorName, // Brand color
  verified: 'green' as ForegroundColorName,     // Success
  emerging: 'yellow' as ForegroundColorName,    // Warning/in-progress
  novice: 'gray' as ForegroundColorName,        // Muted
  custom: 'cyan' as ForegroundColorName,        // Accent
} as const

/**
 * Status badge colors
 */
export const STATUS_COLORS = {
  success: 'green' as ForegroundColorName,
  error: 'red' as ForegroundColorName,
  warning: 'yellow' as ForegroundColorName,
  info: 'gray' as ForegroundColorName,
  loading: 'cyan' as ForegroundColorName,
} as const
