import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility functions for formatting
export function formatAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatSol(lamports: number | bigint): string {
  const sol = Number(lamports) / 1e9
  return `${sol.toFixed(4)} SOL`
}

export function formatNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
  return num.toString()
}

export function formatTokenAmount(amount: number | bigint | string, decimals = 9): string {
  const numValue = typeof amount === 'string' ? parseFloat(amount) : Number(amount)
  const value = numValue / Math.pow(10, decimals)
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

// Security: Input validation utilities

/**
 * Validates a Solana address (base58, 32-44 chars)
 * @param address - Address to validate
 * @returns True if valid, false otherwise
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false
  // Solana addresses are base58 encoded, 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  return base58Regex.test(address)
}

/**
 * Sanitizes user input to prevent XSS
 * @param input - User input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''
  // Remove any HTML tags and trim
  return input.replace(/<[^>]*>/g, '').trim()
}

/**
 * Validates prompt length
 * @param prompt - User prompt
 * @param maxLength - Maximum allowed length (default 500)
 * @returns True if valid, false otherwise
 */
export function isValidPrompt(prompt: string, maxLength = 500): boolean {
  if (!prompt || typeof prompt !== 'string') return false
  const trimmed = prompt.trim()
  return trimmed.length > 0 && trimmed.length <= maxLength
}
