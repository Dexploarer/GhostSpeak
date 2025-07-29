/**
 * Format helpers for better visual output
 * Provides consistent formatting across the CLI
 */

import chalk from 'chalk'
import Table from 'cli-table3'
import boxen from 'boxen'
import { shortenAddress, lamportsToSol, formatDate, formatRelativeTime } from './helpers.js'

/**
 * Create a formatted info box
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
  } = options || {}
  
  const text = Array.isArray(content) ? content.join('\n') : content
  
  return boxen(text, {
    title,
    borderColor: borderColor as any,
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
  const statusMap: Record<string, { icon: string; color: string }> = {
    'active': { icon: '🟢', color: 'green' },
    'pending': { icon: '⏳', color: 'yellow' },
    'completed': { icon: '✅', color: 'green' },
    'failed': { icon: '❌', color: 'red' },
    'cancelled': { icon: '🚫', color: 'gray' },
    'disputed': { icon: '⚖️', color: 'red' },
    'open': { icon: '📋', color: 'blue' },
    'in_progress': { icon: '🔨', color: 'yellow' },
    'submitted': { icon: '📝', color: 'cyan' }
  }
  
  const normalized = status.toLowerCase().replace(/[-_]/g, '')
  const config = statusMap[normalized] || { icon: '❓', color: 'gray' }
  
  return `${config.icon} ${chalk[config.color](status)}`
}

/**
 * Format SOL amount with proper decimals
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
  const { shorten = true, copyHint = true } = options || {}
  
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
export function formatTimestamp(timestamp: number | bigint, relative: boolean = false): string {
  const ts = Number(timestamp)
  
  if (relative) {
    return chalk.gray(formatRelativeTime(ts))
  }
  
  return chalk.gray(formatDate(ts))
}

/**
 * Create a progress bar
 */
export function progressBar(current: number, total: number, width: number = 30): string {
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
  const { indent = 2, bullet = '•' } = options || {}
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
export function divider(length: number = 50, char: string = '─'): string {
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
  } = options || {}
  
  return `${chalk[keyColor](key)}${separator} ${chalk[valueColor](value)}`
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