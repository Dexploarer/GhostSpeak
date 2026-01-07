/**
 * Error Message Mapper
 * Maps Solana/Anchor error codes to user-friendly messages
 */

export interface ErrorInfo {
  title: string
  description: string
  action?: string
  code?: string
  isRecoverable: boolean
}

// Anchor error codes (from generated IDL)
const ANCHOR_ERRORS: Record<number, ErrorInfo> = {
  // Constraint errors
  2000: {
    title: 'Account Constraint Failed',
    description: 'The account does not meet the required constraints.',
    action: 'Please check your inputs and try again.',
    isRecoverable: true,
  },
  2001: {
    title: 'Account Not Initialized',
    description: 'This account has not been initialized yet.',
    action: 'Please initialize the account first.',
    isRecoverable: true,
  },
  2003: {
    title: 'Account Already Initialized',
    description: 'This account has already been initialized.',
    action: 'Use the existing account or create a new one.',
    isRecoverable: false,
  },
  // Authorization errors
  2012: {
    title: 'Unauthorized',
    description: 'You are not authorized to perform this action.',
    action: 'Please connect with the correct wallet.',
    isRecoverable: true,
  },
  // Custom program errors
  6000: {
    title: 'Invalid Agent Type',
    description: 'The specified agent type is not valid.',
    action: 'Please select a valid agent type.',
    isRecoverable: true,
  },
  6001: {
    title: 'Agent Not Active',
    description: 'This agent is not currently active.',
    action: 'Activate the agent before performing this action.',
    isRecoverable: true,
  },
  6002: {
    title: 'Escrow Already Exists',
    description: 'An escrow for this task already exists.',
    action: 'Use the existing escrow or create a new task.',
    isRecoverable: false,
  },
  6003: {
    title: 'Escrow Not Found',
    description: 'The requested escrow could not be found.',
    action: 'Verify the escrow address and try again.',
    isRecoverable: true,
  },
  6004: {
    title: 'Insufficient Funds',
    description: 'You do not have enough funds for this transaction.',
    action: 'Add more USDC to your wallet and try again.',
    isRecoverable: true,
  },
  6005: {
    title: 'Dispute Period Expired',
    description: 'The dispute period for this escrow has ended.',
    action: 'This escrow can no longer be disputed.',
    isRecoverable: false,
  },
}

// Common Solana RPC errors
const RPC_ERRORS: Record<string, ErrorInfo> = {
  'Transaction simulation failed': {
    title: 'Transaction Failed',
    description: 'The transaction could not be processed.',
    action: 'Please try again or check your inputs.',
    isRecoverable: true,
  },
  'Blockhash not found': {
    title: 'Transaction Expired',
    description: 'The transaction took too long and expired.',
    action: 'Please try again.',
    isRecoverable: true,
  },
  'insufficient funds': {
    title: 'Insufficient Balance',
    description: 'Your wallet does not have enough SOL for transaction fees.',
    action: 'Add SOL to your wallet for transaction fees.',
    isRecoverable: true,
  },
  'Transaction was not confirmed': {
    title: 'Transaction Timeout',
    description: 'The network did not confirm the transaction in time.',
    action: 'The transaction may still be processing. Check your wallet.',
    isRecoverable: true,
  },
}

// Wallet errors
const WALLET_ERRORS: Record<string, ErrorInfo> = {
  'User rejected': {
    title: 'Transaction Cancelled',
    description: 'You cancelled the transaction.',
    action: 'Click the button again to retry.',
    isRecoverable: true,
  },
  'Wallet not connected': {
    title: 'Wallet Not Connected',
    description: 'Please connect your wallet to continue.',
    action: 'Click the Connect button in the header.',
    isRecoverable: true,
  },
  'Could not create signer': {
    title: 'Signing Error',
    description: 'Could not initialize transaction signing.',
    action: 'Please reconnect your wallet.',
    isRecoverable: true,
  },
}

/**
 * Parse an error and return user-friendly information
 */
export function getErrorInfo(error: unknown): ErrorInfo {
  const errorString = error instanceof Error ? error.message : String(error)

  // Check for Anchor error codes
  const anchorMatch = errorString.match(/custom program error: 0x([0-9a-fA-F]+)/)
  if (anchorMatch) {
    const code = parseInt(anchorMatch[1], 16)
    if (ANCHOR_ERRORS[code]) {
      return { ...ANCHOR_ERRORS[code], code: `0x${anchorMatch[1]}` }
    }
  }

  // Check for known RPC errors
  for (const [pattern, info] of Object.entries(RPC_ERRORS)) {
    if (errorString.toLowerCase().includes(pattern.toLowerCase())) {
      return info
    }
  }

  // Check for wallet errors
  for (const [pattern, info] of Object.entries(WALLET_ERRORS)) {
    if (errorString.toLowerCase().includes(pattern.toLowerCase())) {
      return info
    }
  }

  // Network errors
  if (errorString.includes('network') || errorString.includes('fetch')) {
    return {
      title: 'Network Error',
      description: 'Could not connect to the Solana network.',
      action: 'Check your internet connection and try again.',
      isRecoverable: true,
    }
  }

  // Rate limiting
  if (errorString.includes('429') || errorString.includes('rate limit')) {
    return {
      title: 'Rate Limited',
      description: 'Too many requests. Please wait a moment.',
      action: 'Wait a few seconds and try again.',
      isRecoverable: true,
    }
  }

  // Default fallback
  return {
    title: 'Something Went Wrong',
    description: truncateError(errorString),
    action: 'Please try again or contact support if the issue persists.',
    isRecoverable: true,
  }
}

/**
 * Truncate long error messages
 */
function truncateError(error: string, maxLength = 150): string {
  if (error.length <= maxLength) return error
  return `${error.substring(0, maxLength)}...`
}

/**
 * Get a simple error message for toasts
 */
export function getErrorMessage(error: unknown): string {
  const info = getErrorInfo(error)
  return info.title
}

/**
 * Check if an error is recoverable (user can retry)
 */
export function isRecoverableError(error: unknown): boolean {
  return getErrorInfo(error).isRecoverable
}
