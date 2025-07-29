/**
 * UI Helper utilities for enhanced console output
 */

import chalk from 'chalk'

/**
 * Create a success box with green border
 */
export function successBox(message: string): void {
  const lines = message.split('\n')
  const maxLength = Math.max(...lines.map(line => line.length))
  const padding = 2
  const width = maxLength + padding * 2
  
  console.log(chalk.green('┌' + '─'.repeat(width) + '┐'))
  lines.forEach(line => {
    const paddedLine = line.padEnd(maxLength)
    console.log(chalk.green('│') + ' ' + paddedLine + ' ' + chalk.green('│'))
  })
  console.log(chalk.green('└' + '─'.repeat(width) + '┘'))
}

/**
 * Create a warning box with yellow border
 */
export function warningBox(message: string): void {
  const lines = message.split('\n')
  const maxLength = Math.max(...lines.map(line => line.length))
  const padding = 2
  const width = maxLength + padding * 2
  
  console.log(chalk.yellow('┌' + '─'.repeat(width) + '┐'))
  lines.forEach(line => {
    const paddedLine = line.padEnd(maxLength)
    console.log(chalk.yellow('│') + ' ' + paddedLine + ' ' + chalk.yellow('│'))
  })
  console.log(chalk.yellow('└' + '─'.repeat(width) + '┘'))
}

/**
 * Create an info box with blue border
 */
export function infoBox(message: string): void {
  const lines = message.split('\n')
  const maxLength = Math.max(...lines.map(line => line.length))
  const padding = 2
  const width = maxLength + padding * 2
  
  console.log(chalk.blue('┌' + '─'.repeat(width) + '┐'))
  lines.forEach(line => {
    const paddedLine = line.padEnd(maxLength)
    console.log(chalk.blue('│') + ' ' + paddedLine + ' ' + chalk.blue('│'))
  })
  console.log(chalk.blue('└' + '─'.repeat(width) + '┘'))
}

/**
 * Create a visual divider
 */
export function divider(char: string = '─', length: number = 50): void {
  console.log(chalk.gray(char.repeat(length)))
}

/**
 * Show step indicator for multi-step processes
 */
export function stepIndicator(current: number, total: number, description: string): void {
  const progress = `[${current}/${total}]`
  console.log(chalk.cyan(progress) + ' ' + chalk.bold(description))
}