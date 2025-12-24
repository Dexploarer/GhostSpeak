/**
 * Format helpers for better visual output
 * Provides consistent formatting across the CLI
 * 
 * This module contains utilities for creating visually appealing and consistent
 * output in the command-line interface, including boxes, tables, status indicators,
 * and various formatting functions for addresses, amounts, and timestamps.
 * 
 * @example
 * ```typescript
 * import { infoBox, formatSOL, progressBar } from './format-helpers.js'
 * 
 * // Create an info box
 * console.log(infoBox('Status', 'Operation completed successfully'))
 * 
 * // Format SOL amounts
 * console.log(formatSOL(1500000000n)) // "1.500 SOL"
 * 
 * // Show progress
 * console.log(progressBar(75, 100)) // Progress bar at 75%
 * ```
 */

import chalk from 'chalk'
import Table from 'cli-table3'
import boxen from 'boxen'
import { shortenAddress, lamportsToSol, formatDate, formatRelativeTime } from './helpers.js'

/**
 * Create a formatted info box with title and content
 * 
 * @param title - The title to display at the top of the box
 * @param content - Content as string or array of stringhost (joined with newlines)
 * @param options - Customization options for the box appearance
 * @param options.borderColor - Color of the border (default: 'cyan')
 * @param options.padding - Internal padding in spaces (default: 1)
 * @param options.width - Fixed width of the box (optional)
 * @returns Formatted box string ready for console output
 * 
 * @example
 * ```typescript
 * // Basic info box
 * console.log(infoBox('Status', 'All systems operational'))
 * 
 * // Multi-line content
 * console.log(infoBox('Details', ['Line 1', 'Line 2']))
 * 
 * // Custom styling
 * console.log(infoBox('Warning', 'Check this!', { borderColor: 'yellow', padding: 2 }))
 * ```
 */
export function infoBox(title: string, content: string | string[], options?: {
  borderColor?: string
  padding?: number
  width?: number
}): string {
  const {
    borderColor = 'cyan',
    padding = 1,
    width
  } = options ?? {}
  
  const text = Array.isArray(content) ? content.join('\n') : content
  
  return boxen(text, {
    title,
    borderColor,
    borderStyle: 'round',
    padding,
    width,
    titleAlignment: 'left'
  })
}

/**
 * Create a success box
 */
export function successBox(message: string, details?: string[]): string {
  let content = chalk.green('✅ ' + message)
  if (details && details.length > 0) {
    content += '\n\n' + details.map(d => chalk.gray('• ' + d)).join('\n')
  }
  
  return boxen(content, {
    borderColor: 'green',
    borderStyle: 'round',
    padding: 1
  })
}

/**
 * Create a warning box
 */
export function warningBox(message: string, actions?: string[]): string {
  let content = chalk.yellow('⚠️  ' + message)
  if (actions && actions.length > 0) {
    content += '\n\n' + chalk.bold('Actions:') + '\n' + 
      actions.map((a, i) => chalk.gray(`${i + 1}. ${a}`)).join('\n')
  }
  
  return boxen(content, {
    borderColor: 'yellow',
    borderStyle: 'round',
    padding: 1
  })
}

/**
 * Create a formatted table
 */
export function createTable(headers: string[], options?: {
  colWidths?: number[]
  wordWrap?: boolean
}): Table.Table {
  const tableOptions: Table.TableConstructorOptions = {
    head: headers.map(h => chalk.bold(h)),
    style: {
      head: ['cyan']
    }
  }
  
  if (options?.colWidths) {
    tableOptions.colWidths = options.colWidths
  }
  
  if (options?.wordWrap) {
    tableOptions.wordWrap = true
  }
  
  return new Table(tableOptions)
}

/**
 * Format a status with icon
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, { icon: string; color: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'cyan' }> = {
    'active': { icon: '🟢', color: 'green' },
    'pending': { icon: '⏳', color: 'yellow' },
    'completed': { icon: '✅', color: 'green' },
    'failed': { icon: '❌', color: 'red' },
    'cancelled': { icon: '🚫', color: 'gray' },
    'disputed': { icon: '⚖️', color: 'red' },
    'open': { icon: '📋', color: 'blue' },
    'inprogress': { icon: '🔨', color: 'yellow' }, // Normalized key without underscores/dashes
    'submitted': { icon: '📝', color: 'cyan' }
  }
  
  const normalized = status.toLowerCase().replace(/[-_]/g, '')
  const config = statusMap[normalized] ?? { icon: '❓', color: 'gray' }
  
  // Create a type-safe color mapping
  const colorMap: Record<string, typeof chalk.green> = {
    green: chalk.green,
    yellow: chalk.yellow,
    red: chalk.red,
    gray: chalk.gray,
    blue: chalk.blue,
    cyan: chalk.cyan
  }
  
  const colorFn = colorMap[config.color] ?? chalk.gray
  return `${config.icon} ${colorFn(status)}`
}

/**
 * Format SOL amount with appropriate decimal precision
 * 
 * Automatically adjusts decimal places based on the amount size:
 * - Zero amounts: "0 SOL"
 * - Very small amounts: "< 0.0001 SOL"
 * - Small amounts (< 1): 4 decimal places
 * - Medium amounts (< 100): 3 decimal places
 * - Large amounts: 2 decimal places
 * 
 * @param lamports - Amount in lamports (1 SOL = 1,000,000,000 lamports) or pre-formatted string
 * @returns Formatted SOL amount string with appropriate decimals
 * 
 * @example
 * ```typescript
 * formatSOL(0) // "0 SOL"
 * formatSOL(50000) // "< 0.0001 SOL"
 * formatSOL(500000000) // "0.5000 SOL"
 * formatSOL(1500000000n) // "1.500 SOL"
 * formatSOL(150000000000n) // "150.00 SOL"
 * ```
 */
export function formatSOL(lamports: bigint | number | string): string {
  const sol = typeof lamports === 'string' ? lamports : lamportsToSol(BigInt(lamports))
  const num = parseFloat(sol)
  
  if (num === 0) return '0 SOL'
  if (num < 0.0001) return '< 0.0001 SOL'
  if (num < 1) return `${num.toFixed(4)} SOL`
  if (num < 100) return `${num.toFixed(3)} SOL`
  return `${num.toFixed(2)} SOL`
}

/**
 * Format an address with copy hint
 */
export function formatAddress(address: string, options?: {
  shorten?: boolean
  copyHint?: boolean
}): string {
  const { shorten = true, copyHint = true } = options ?? {}
  
  const display = shorten ? shortenAddress(address, 6) : address
  const formatted = chalk.cyan(display)
  
  if (copyHint) {
    return `${formatted} ${chalk.gray('(click to copy)')}`
  }
  
  return formatted
}

/**
 * Format a transaction signature
 */
export function formatSignature(signature: string): string {
  return chalk.cyan(shortenAddress(signature, 8))
}

/**
 * Format a timestamp
 */
export function formatTimestamp(timestamp: number | bigint, relative = false): string {
  const ts = Number(timestamp)
  
  if (relative) {
    return chalk.gray(formatRelativeTime(ts))
  }
  
  return chalk.gray(formatDate(ts))
}

/**
 * Create a progress bar
 */
export function progressBar(current: number, total: number, width = 30): string {
  const percentage = Math.round((current / total) * 100)
  const filled = Math.round((current / total) * width)
  const empty = width - filled
  
  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty))
  
  return `${bar} ${percentage}%`
}

/**
 * Format a list with bullets
 */
export function bulletList(items: string[], options?: {
  indent?: number
  bullet?: string
}): string {
  const { indent = 2, bullet = '•' } = options ?? {}
  const spaces = ' '.repeat(indent)
  
  return items.map(item => `${spaces}${chalk.gray(bullet)} ${item}`).join('\n')
}

/**
 * Create a summary card
 */
export function summaryCard(title: string, items: Array<{ label: string; value: string }>): string {
  const maxLabelLength = Math.max(...items.map(i => i.label.length))
  
  const content = items.map(({ label, value }) => {
    const paddedLabel = label.padEnd(maxLabelLength)
    return `${chalk.gray(paddedLabel)} : ${chalk.white(value)}`
  }).join('\n')
  
  return infoBox(title, content)
}

/**
 * Format a QR code placeholder (actual QR generation would require additional library)
 */
export function formatQRPlaceholder(data: string, label?: string): string {
  const placeholder = `
┌─────────────┐
│ ▄▄▄▄▄ █▀█ █ │
│ █   █ █▄█ █ │
│ █▄▄▄█ ▀▀▀ █ │
│ ▄▄▄▄▄▄▄ █▄█ │
│ ▀▀▀▀▀▀▀ ▀▀▀ │
└─────────────┘`
  
  if (label) {
    return `${placeholder}\n${chalk.gray(label)}`
  }
  
  return placeholder
}

/**
 * Create a divider line
 */
export function divider(length = 50, char = '─'): string {
  return chalk.gray(char.repeat(length))
}

/**
 * Format key-value pairs
 */
export function keyValue(key: string, value: string, options?: {
  keyColor?: string
  valueColor?: string
  separator?: string
}): string {
  const {
    keyColor = 'gray',
    valueColor = 'white',
    separator = ':'
  } = options ?? {}
  
  // Create a type-safe color mapping
  const colorMap: Record<string, typeof chalk.green> = {
    green: chalk.green,
    yellow: chalk.yellow,
    red: chalk.red,
    gray: chalk.gray,
    blue: chalk.blue,
    cyan: chalk.cyan,
    white: chalk.white,
    black: chalk.black,
    magenta: chalk.magenta
  }
  
  const keyColorFn = colorMap[keyColor] ?? chalk.gray
  const valueColorFn = colorMap[valueColor] ?? chalk.white
  
  return `${keyColorFn(key)}${separator} ${valueColorFn(value)}`
}

/**
 * Create a step indicator
 */
export function stepIndicator(current: number, total: number, label?: string): string {
  const steps = Array.from({ length: total }, (_, i) => {
    if (i < current - 1) return chalk.green('●')
    if (i === current - 1) return chalk.yellow('◉')
    return chalk.gray('○')
  }).join(' ')
  
  const text = `Step ${current} of ${total}`
  
  if (label) {
    return `${steps}  ${chalk.bold(text)} - ${label}`
  }
  
  return `${steps}  ${chalk.bold(text)}`
}