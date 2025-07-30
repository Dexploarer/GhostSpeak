/**
 * Discriminator Validation Utilities
 * 
 * Handles discriminator validation and provides fallback mechanisms
 * for accounts with mismatched discriminators
 */

import type { Address } from '@solana/addresses'
import type { EncodedAccount, MaybeEncodedAccount } from '@solana/kit'

interface RpcResponse {
  value: {
    data: [string, string]
    executable: boolean
    lamports: number
    owner: string
    rentEpoch: number
  } | null
}

interface RpcInterface {
  getAccountInfo: (address: Address, options: { encoding: string }) => {
    send: () => Promise<RpcResponse>
  }
}

export interface DiscriminatorValidationResult {
  isValid: boolean
  expectedLength: number
  actualLength: number
  canDecode: boolean
  needsMigration: boolean
  errorMessage?: string
}

export interface AccountInspectionResult {
  address: string
  dataLength: number
  discriminator: Uint8Array | null
  discriminatorLength: number
  isAgentAccount: boolean
  needsMigration: boolean
  rawData: Uint8Array
}

/**
 * Validates account discriminator before attempting to decode
 */
export function validateAccountDiscriminator(
  accountData: Uint8Array,
  expectedDiscriminator: Uint8Array
): DiscriminatorValidationResult {
  // Check if we have enough data for a discriminator
  if (accountData.length < expectedDiscriminator.length) {
    return {
      isValid: false,
      expectedLength: expectedDiscriminator.length,
      actualLength: accountData.length,
      canDecode: false,
      needsMigration: true,
      errorMessage: `Account too small. Expected at least ${expectedDiscriminator.length} bytes, got ${accountData.length}`
    }
  }

  // Extract the discriminator from account data
  const actualDiscriminator = accountData.slice(0, expectedDiscriminator.length)

  // Check if discriminators match
  const isValid = actualDiscriminator.every((byte, index) => byte === expectedDiscriminator[index])

  if (isValid) {
    return {
      isValid: true,
      expectedLength: expectedDiscriminator.length,
      actualLength: actualDiscriminator.length,
      canDecode: true,
      needsMigration: false
    }
  }

  // Check for common legacy discriminator patterns
  if (actualDiscriminator.length >= 2) {
    const first2Bytes = actualDiscriminator.slice(0, 2)
    // If first 2 bytes are non-zero, might be legacy format
    if (first2Bytes[0] !== 0 || first2Bytes[1] !== 0) {
      return {
        isValid: false,
        expectedLength: expectedDiscriminator.length,
        actualLength: 2, // Legacy format
        canDecode: false,
        needsMigration: true,
        errorMessage: `Legacy discriminator format detected. Account needs migration.`
      }
    }
  }

  return {
    isValid: false,
    expectedLength: expectedDiscriminator.length,
    actualLength: actualDiscriminator.length,
    canDecode: false,
    needsMigration: true,
    errorMessage: `Discriminator mismatch. Expected [${Array.from(expectedDiscriminator).join(', ')}], got [${Array.from(actualDiscriminator).join(', ')}]`
  }
}

/**
 * Safe account decoding with discriminator validation
 */
export async function safeDecodeAccount<T>(
  rpc: unknown,
  address: Address,
  decoder: (data: Uint8Array) => T,
  expectedDiscriminator: Uint8Array,
  accountType = 'account'
): Promise<{ account: T | null; validation: DiscriminatorValidationResult; needsAttention: boolean }> {
  try {
    // Fetch raw account data using compatible RPC interface
    const rpcClient = rpc as RpcInterface
    const response = await rpcClient.getAccountInfo(address, { encoding: 'base64' }).send()
    
    if (!response.value) {
      return {
        account: null,
        validation: {
          isValid: false,
          expectedLength: expectedDiscriminator.length,
          actualLength: 0,
          canDecode: false,
          needsMigration: false,
          errorMessage: `${accountType} account not found`
        },
        needsAttention: false
      }
    }

    // Decode base64 data
    const rawData = response.value.data[0]
    if (typeof rawData !== 'string') {
      throw new Error('Expected base64 string from RPC response')
    }
    const accountData = Buffer.from(rawData, 'base64')
    
    // Validate discriminator
    const validation = validateAccountDiscriminator(accountData, expectedDiscriminator)
    
    if (validation.canDecode) {
      // Try to decode the account
      try {
        const account = decoder(accountData)
        return { account, validation, needsAttention: false }
      } catch (decodeError) {
        return {
          account: null,
          validation: {
            ...validation,
            canDecode: false,
            errorMessage: `Decoding failed: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`
          },
          needsAttention: true
        }
      }
    }

    return {
      account: null,
      validation,
      needsAttention: validation.needsMigration
    }

  } catch (error) {
    return {
      account: null,
      validation: {
        isValid: false,
        expectedLength: expectedDiscriminator.length,
        actualLength: 0,
        canDecode: false,
        needsMigration: false,
        errorMessage: `Failed to fetch account: ${error instanceof Error ? error.message : String(error)}`
      },
      needsAttention: true
    }
  }
}

/**
 * Create user-friendly error message for discriminator issues
 */
export function createDiscriminatorErrorMessage(
  validation: DiscriminatorValidationResult,
  accountType: string,
  address: string
): string {
  if (validation.needsMigration) {
    return [
      `⚠️  ${accountType} account needs attention: ${address}`,
      `   Issue: ${validation.errorMessage}`,
      `   Resolution: Account may need to be recreated with current program version`,
      `   Use 'ghost diagnose account ${address}' for detailed analysis`
    ].join('\n')
  }

  if (!validation.canDecode) {
    return [
      `❌ Failed to decode ${accountType} account: ${address}`,
      `   Issue: ${validation.errorMessage}`,
      `   This may indicate a corrupt or incompatible account`
    ].join('\n')
  }

  return `✅ ${accountType} account is valid: ${address}`
}

/**
 * Safe Agent account decoding with discriminator validation
 * Returns a compatibility result with exists property
 */
export async function safeDecodeAgent(
  encodedAccount: { address: Address; data: Uint8Array }
): Promise<{ exists: boolean; data?: unknown } | null> {
  try {
    // Import Agent discriminator and decoder
    const { AGENT_DISCRIMINATOR, getAgentDecoder } = await import('../generated/accounts/agent.js')
    
    // Validate discriminator
    const validation = validateAccountDiscriminator(encodedAccount.data, AGENT_DISCRIMINATOR)
    
    if (validation.canDecode) {
      try {
        const decoder = getAgentDecoder()
        const data = decoder.decode(encodedAccount.data)
        return { exists: true, data }
      } catch (decodeError) {
        console.warn(`Failed to decode Agent account ${encodedAccount.address}:`, decodeError)
        return { exists: false }
      }
    }
    
    // Account exists but can't be decoded due to discriminator issues
    return { exists: false }
  } catch (error) {
    console.warn(`Safe decode failed for ${encodedAccount.address}:`, error)
    return null
  }
}

/**
 * Inspects account data and extracts useful information about discriminator
 */
export function inspectAccountData(
  encodedAccount: EncodedAccount | MaybeEncodedAccount,
  address: string
): AccountInspectionResult {
  if (!('exists' in encodedAccount) || !encodedAccount.exists) {
    return {
      address,
      dataLength: 0,
      discriminator: null,
      discriminatorLength: 0,
      isAgentAccount: false,
      needsMigration: false,
      rawData: new Uint8Array(0)
    }
  }

  const data = 'data' in encodedAccount ? encodedAccount.data : new Uint8Array(0)
  
  // Extract discriminator (first 8 bytes if available)
  const discriminatorLength = Math.min(data.length, 8)
  const discriminator = discriminatorLength > 0 ? data.slice(0, discriminatorLength) : null

  return {
    address,
    dataLength: data.length,
    discriminator,
    discriminatorLength,
    isAgentAccount: false, // Would need more logic to determine this
    needsMigration: discriminatorLength > 0 && discriminatorLength < 8,
    rawData: data
  }
}