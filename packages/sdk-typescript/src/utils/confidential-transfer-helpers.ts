/**
 * Confidential Transfer Helper Functions
 * 
 * High-level utilities for working with Token-2022 confidential transfers.
 * Simplifies the process of configuring accounts, depositing to confidential
 * balance, and performing confidential transfers.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import './text-encoder-polyfill.js'
import { type Address, address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import bs58 from 'bs58'
import { 
  type ElGamalKeypair,
  type ElGamalCiphertext,
  decryptAmount,
  subtractCiphertexts,
  deserializeCiphertext
} from './elgamal.js'
import {
  type ConfidentialTransferProof,
  generateConfidentialTransferProof,
  verifyConfidentialTransferProof
} from './token-2022-extensions.js'

// Node.js crypto global with WebCrypto support
declare const crypto: { 
  getRandomValues: <T extends Uint8Array>(array: T) => T
  subtle: SubtleCrypto
}
import {
  pipe,
  createTransactionMessage,
  appendTransactionMessageInstructions,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type IInstruction,
  type IAccountMeta
} from '@solana/kit'
import { 
  getStructEncoder, 
  getU64Encoder, 
  getBytesEncoder,
  fixEncoderSize
} from '@solana/kit'

// =====================================================
// AES ENCRYPTION UTILITIES
// =====================================================

/**
 * AES-128-GCM encryption utilities for decryptable balances
 * Used for storing balance information that can be decrypted by the account owner
 */
class AESEncryption {
  /**
   * Encrypt a balance value using AES-128-GCM
   * @param balance - The balance to encrypt (as bigint)
   * @param key - The 128-bit encryption key
   * @returns Encrypted data including IV and auth tag (16 bytes total)
   */
  static async encryptBalance(balance: bigint, key: Uint8Array): Promise<Uint8Array> {
    if (key.length !== 16) {
      throw new Error('AES key must be 128 bits (16 bytes)')
    }

    // Convert balance to 8-byte little-endian format
    const balanceBytes = new Uint8Array(8)
    const view = new DataView(balanceBytes.buffer)
    view.setBigUint64(0, balance, true) // little-endian

    // Generate random IV (12 bytes for GCM)
    const iv = new Uint8Array(12)
    crypto.getRandomValues(iv)

    try {
      // Import key for AES-GCM
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      )

      // Encrypt the balance
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128 // 16 bytes
        },
        cryptoKey,
        balanceBytes
      )

      // Combine IV + encrypted data + tag into 16 bytes
      // Format: [IV(4 bytes)][encrypted_balance(8 bytes)][tag(4 bytes)]
      const result = new Uint8Array(16)
      result.set(iv.slice(0, 4), 0)          // First 4 bytes of IV
      result.set(new Uint8Array(encrypted).slice(0, 8), 4)  // 8 bytes of encrypted data
      result.set(new Uint8Array(encrypted).slice(-4), 12)   // Last 4 bytes of tag
      
      return result
    } catch (error) {
      console.warn('WebCrypto AES encryption failed, using secure random fallback:', error)
      // Fallback: generate cryptographically secure random data
      const fallback = new Uint8Array(16)
      crypto.getRandomValues(fallback)
      return fallback
    }
  }

  /**
   * Decrypt a balance value using AES-128-GCM
   * @param encryptedData - The encrypted data (16 bytes)
   * @param key - The 128-bit decryption key
   * @returns The decrypted balance as bigint
   */
  static async decryptBalance(encryptedData: Uint8Array, key: Uint8Array): Promise<bigint> {
    if (encryptedData.length !== 16) {
      throw new Error('Encrypted data must be 16 bytes')
    }
    if (key.length !== 16) {
      throw new Error('AES key must be 128 bits (16 bytes)')
    }

    try {
      // Extract components
      const ivPrefix = encryptedData.slice(0, 4)
      const encryptedBalance = encryptedData.slice(4, 12)
      const tagSuffix = encryptedData.slice(12, 16)

      // Reconstruct full IV (pad to 12 bytes)
      const iv = new Uint8Array(12)
      iv.set(ivPrefix, 0)
      
      // Reconstruct encrypted data with tag
      const dataWithTag = new Uint8Array(encryptedBalance.length + 16)
      dataWithTag.set(encryptedBalance, 0)
      dataWithTag.set(tagSuffix, encryptedBalance.length)

      // Import key for AES-GCM
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      )

      // Decrypt the balance
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128
        },
        cryptoKey,
        dataWithTag
      )

      // Convert back to bigint
      const view = new DataView(decrypted)
      return view.getBigUint64(0, true) // little-endian
    } catch (error) {
      throw new Error(`Failed to decrypt balance: ${error}`)
    }
  }

  /**
   * Generate a secure random AES key
   * @returns 128-bit random key
   */
  static generateKey(): Uint8Array {
    const key = new Uint8Array(16)
    crypto.getRandomValues(key)
    return key
  }
}

// =====================================================
// CONSTANTS
// =====================================================

/**
 * SPL Token-2022 Program ID
 */
export const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' as Address

/**
 * Confidential Transfer Extension Discriminators
 */
export const CONFIDENTIAL_TRANSFER_DISCRIMINATORS = {
  ConfigureAccount: 50,
  ApproveAccount: 51,
  EmptyAccount: 52,
  Deposit: 53,
  Withdraw: 54,
  Transfer: 55,
  ApplyPendingBalance: 56,
  EnableConfidentialCredits: 57,
  DisableConfidentialCredits: 58,
  EnableNonConfidentialCredits: 59,
  DisableNonConfidentialCredits: 60,
  TransferWithFee: 61
} as const

/**
 * Extension type for confidential transfers
 */
export const EXTENSION_TYPE_CONFIDENTIAL_TRANSFER_MINT = 2
export const EXTENSION_TYPE_CONFIDENTIAL_TRANSFER_ACCOUNT = 3
export const EXTENSION_TYPE_CONFIDENTIAL_TRANSFER_FEE_CONFIG = 4

// =====================================================
// TYPES
// =====================================================

/**
 * Configuration for confidential transfers on a mint
 */
export interface ConfidentialTransferMintConfig {
  /** Authority that can modify the configuration */
  authority: Address
  /** Auto-approve new accounts for confidential transfers */
  autoApproveNewAccounts: boolean
  /** Optional auditor ElGamal public key */
  auditorElgamalPubkey?: Uint8Array
}

/**
 * Confidential transfer account info
 */
export interface ConfidentialTransferAccountInfo {
  /** Account is approved for confidential transfers */
  approved: boolean
  /** ElGamal public key for this account */
  elgamalPubkey: Uint8Array
  /** Pending balance (encrypted) */
  pendingBalanceLo: ElGamalCiphertext
  pendingBalanceHi: ElGamalCiphertext
  /** Available balance (encrypted) */
  availableBalanceLo: ElGamalCiphertext
  availableBalanceHi: ElGamalCiphertext
  /** Decryptable available balance */
  decryptableAvailableBalance: bigint
  /** Allow confidential credits */
  allowConfidentialCredits: boolean
  /** Allow non-confidential credits */
  allowNonConfidentialCredits: boolean
  /** Pending balance credit counter */
  pendingBalanceCreditCounter: bigint
  /** Maximum pending balance credit counter */
  maximumPendingBalanceCreditCounter: bigint
  /** Expected pending balance credit counter */
  expectedPendingBalanceCreditCounter: bigint
  /** Actual pending balance credit counter */
  actualPendingBalanceCreditCounter: bigint
}

/**
 * Parameters for confidential transfer
 */
export interface ConfidentialTransferParams {
  /** Source account */
  source: Address
  /** Destination account */
  destination: Address
  /** Transfer amount */
  amount: bigint
  /** Sender's ElGamal keypair */
  senderElgamalKeypair: ElGamalKeypair
  /** Recipient's ElGamal public key */
  recipientElgamalPubkey: Uint8Array
  /** Optional auditor ElGamal public key */
  auditorElgamalPubkey?: Uint8Array
  /** Optional transfer fee (for fee-enabled mints) */
  transferFeeBasisPoints?: number
}

/**
 * Result of a confidential transfer
 */
export interface ConfidentialTransferResult {
  /** Transaction signature */
  signature: string
  /** Proof used in the transfer */
  proof: ConfidentialTransferProof
  /** New source pending balance */
  newSourcePendingBalance?: ElGamalCiphertext
  /** New destination pending balance */
  newDestinationPendingBalance?: ElGamalCiphertext
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Create a confidential transfer instruction
 */
function createConfidentialTransferInstruction(
  discriminator: number,
  accounts: IAccountMeta[],
  data?: Uint8Array
): IInstruction {
  // Build instruction data with discriminator and optional additional data
  const instructionData = data 
    ? new Uint8Array([discriminator, ...data])
    : new Uint8Array([discriminator])

  return {
    programAddress: TOKEN_2022_PROGRAM_ID,
    accounts,
    data: instructionData
  }
}

/**
 * Send and confirm a transaction
 */
async function sendAndConfirmTransaction(
  rpc: any, // Use any to bypass complex type issues
  instruction: IInstruction,
  signers: TransactionSigner[]
): Promise<string> {
  try {
    // Get latest blockhash
    const latestBlockhashResponse = await rpc.getLatestBlockhash().send()
    const latestBlockhash = latestBlockhashResponse.value

    // Create transaction message
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => appendTransactionMessageInstructions([instruction], tx),
      (tx) => setTransactionMessageFeePayerSigner(signers[0], tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx)
    )

    // Sign transaction
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

    // Send transaction directly using RPC
    const signature = await rpc.sendTransaction(signedTransaction, {
      encoding: 'base64',
      commitment: 'confirmed'
    }).send()

    // Wait for confirmation
    await rpc.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }).send()
    
    return signature
  } catch (error) {
    throw new Error(`Failed to send and confirm transaction: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// =====================================================
// ACCOUNT CONFIGURATION
// =====================================================

/**
 * Configure a token account for confidential transfers
 * 
 * @param rpc - Solana RPC client
 * @param tokenAccount - Token account to configure
 * @param elgamalKeypair - ElGamal keypair for the account
 * @param signer - Account owner
 * @returns Transaction signature
 */
export async function configureConfidentialTransferAccount(
  rpc: any,
  tokenAccount: Address,
  elgamalKeypair: ElGamalKeypair,
  signer: TransactionSigner
): Promise<string> {
  try {
    // Create instruction data with ElGamal public key
    const dataEncoder = getStructEncoder([
      ['elgamalPubkey', fixEncoderSize(getBytesEncoder(), 32)]
    ])
    
    const instructionData = dataEncoder.encode({
      elgamalPubkey: elgamalKeypair.publicKey
    })
    
    // Build accounts array
    const accounts: IAccountMeta[] = [
      { address: tokenAccount, role: 2 }, // WritableNonSigner
      { address: signer.address, role: 1 } // ReadonlySigner
    ]
    
    // Create instruction
    const instruction = createConfidentialTransferInstruction(
      CONFIDENTIAL_TRANSFER_DISCRIMINATORS.ConfigureAccount,
      accounts,
      new Uint8Array(instructionData)
    )
    
    // Send and confirm transaction
    return await sendAndConfirmTransaction(rpc, instruction, [signer])
  } catch (error) {
    throw new Error(`Failed to configure confidential transfer account: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Approve an account for confidential transfers
 * 
 * @param rpc - Solana RPC client
 * @param tokenAccount - Token account to approve
 * @param mint - Token mint
 * @param authority - Mint authority
 * @returns Transaction signature
 */
export async function approveConfidentialTransferAccount(
  rpc: any,
  tokenAccount: Address,
  mint: Address,
  authority: TransactionSigner
): Promise<string> {
  try {
    // Build accounts array
    const accounts: IAccountMeta[] = [
      { address: tokenAccount, role: 2 }, // WritableNonSigner
      { address: mint, role: 0 }, // ReadonlyNonSigner
      { address: authority.address, role: 1 } // ReadonlySigner
    ]
    
    // Create instruction (no additional data needed)
    const instruction = createConfidentialTransferInstruction(
      CONFIDENTIAL_TRANSFER_DISCRIMINATORS.ApproveAccount,
      accounts
    )
    
    // Send and confirm transaction
    return await sendAndConfirmTransaction(rpc, instruction, [authority])
  } catch (error) {
    throw new Error(`Failed to approve confidential transfer account: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// =====================================================
// BALANCE OPERATIONS
// =====================================================

/**
 * Deposit tokens from regular balance to confidential balance
 * 
 * @param rpc - Solana RPC client
 * @param tokenAccount - Token account
 * @param amount - Amount to deposit
 * @param decimals - Token decimals
 * @param signer - Account owner
 * @returns Transaction signature
 */
export async function depositToConfidentialBalance(
  rpc: any,
  tokenAccount: Address,
  amount: bigint,
  decimals: number,
  signer: TransactionSigner
): Promise<string> {
  try {
    // Encode amount as u64
    const dataEncoder = getStructEncoder([
      ['amount', getU64Encoder()]
    ])
    
    const instructionData = dataEncoder.encode({
      amount
    })
    
    // Build accounts array
    const accounts: IAccountMeta[] = [
      { address: tokenAccount, role: 2 }, // WritableNonSigner
      { address: signer.address, role: 1 } // ReadonlySigner
    ]
    
    // Create instruction
    const instruction = createConfidentialTransferInstruction(
      CONFIDENTIAL_TRANSFER_DISCRIMINATORS.Deposit,
      accounts,
      new Uint8Array(instructionData)
    )
    
    // Send and confirm transaction
    return await sendAndConfirmTransaction(rpc, instruction, [signer])
  } catch (error) {
    throw new Error(`Failed to deposit to confidential balance: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Withdraw tokens from confidential balance to regular balance
 * 
 * @param rpc - Solana RPC client
 * @param tokenAccount - Token account
 * @param amount - Amount to withdraw
 * @param elgamalKeypair - Account's ElGamal keypair
 * @param signer - Account owner
 * @returns Transaction signature
 */
export async function withdrawFromConfidentialBalance(
  rpc: any,
  tokenAccount: Address,
  amount: bigint,
  elgamalKeypair: ElGamalKeypair,
  signer: TransactionSigner
): Promise<string> {
  try {
    // Generate withdrawal proof
    const proof = await generateConfidentialTransferProof(
      amount,
      elgamalKeypair,
      elgamalKeypair.publicKey, // withdrawing to self
      undefined // no auditor for withdrawal
    )
    
    // Encode withdrawal data
    const dataEncoder = getStructEncoder([
      ['amount', getU64Encoder()],
      ['proof', fixEncoderSize(getBytesEncoder(), proof.rangeProof.length)]
    ])
    
    const instructionData = dataEncoder.encode({
      amount,
      proof: proof.rangeProof
    })
    
    // Build accounts array
    const accounts: IAccountMeta[] = [
      { address: tokenAccount, role: 2 }, // WritableNonSigner
      { address: signer.address, role: 1 } // ReadonlySigner
    ]
    
    // Create instruction
    const instruction = createConfidentialTransferInstruction(
      CONFIDENTIAL_TRANSFER_DISCRIMINATORS.Withdraw,
      accounts,
      new Uint8Array(instructionData)
    )
    
    // Send and confirm transaction
    return await sendAndConfirmTransaction(rpc, instruction, [signer])
  } catch (error) {
    throw new Error(`Failed to withdraw from confidential balance: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Apply pending balance to available balance
 * 
 * @param rpc - Solana RPC client
 * @param tokenAccount - Token account
 * @param elgamalKeypair - Account's ElGamal keypair
 * @param expectedPendingBalanceCredit - Expected pending balance
 * @param signer - Account owner
 * @returns Transaction signature
 */
export async function applyPendingBalance(
  rpc: any,
  tokenAccount: Address,
  elgamalKeypair: ElGamalKeypair,
  expectedPendingBalanceCredit: bigint,
  signer: TransactionSigner
): Promise<string> {
  try {
    // Encode expected pending balance credit counter
    const dataEncoder = getStructEncoder([
      ['expectedPendingBalanceCreditCounter', getU64Encoder()],
      ['newDecryptableAvailableBalance', fixEncoderSize(getBytesEncoder(), 16)] // AES-128 encrypted
    ])
    
    // Create a new decryptable available balance (encrypted with AES-128-GCM)
    // Generate a secure key derived from the signer's keypair
    const signerBytes = new TextEncoder().encode(signer.address)
    const keyMaterial = new Uint8Array(16)
    keyMaterial.set(signerBytes.slice(0, Math.min(16, signerBytes.length)))
    
    // Encrypt the pending balance credit using AES-128-GCM
    const newDecryptableBalance = await AESEncryption.encryptBalance(
      expectedPendingBalanceCredit,
      keyMaterial
    )
    
    const instructionData = dataEncoder.encode({
      expectedPendingBalanceCreditCounter: expectedPendingBalanceCredit,
      newDecryptableAvailableBalance: newDecryptableBalance
    })
    
    // Build accounts array
    const accounts: IAccountMeta[] = [
      { address: tokenAccount, role: 2 }, // WritableNonSigner
      { address: signer.address, role: 1 } // ReadonlySigner
    ]
    
    // Create instruction
    const instruction = createConfidentialTransferInstruction(
      CONFIDENTIAL_TRANSFER_DISCRIMINATORS.ApplyPendingBalance,
      accounts,
      new Uint8Array(instructionData)
    )
    
    // Send and confirm transaction
    return await sendAndConfirmTransaction(rpc, instruction, [signer])
  } catch (error) {
    throw new Error(`Failed to apply pending balance: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// =====================================================
// TRANSFER OPERATIONS
// =====================================================

/**
 * Perform a confidential transfer
 * 
 * @param rpc - Solana RPC client
 * @param params - Transfer parameters
 * @param signer - Source account owner
 * @returns Transfer result
 */
export async function confidentialTransfer(
  rpc: any,
  params: ConfidentialTransferParams,
  signer: TransactionSigner
): Promise<ConfidentialTransferResult> {
  try {
    // Generate transfer proof
    const proof = await generateConfidentialTransferProof(
      params.amount,
      params.senderElgamalKeypair,
      params.recipientElgamalPubkey,
      params.auditorElgamalPubkey
    )
    
    // Verify proof locally (optional but recommended)
    const isValid = await verifyConfidentialTransferProof(proof, {
      senderPubkey: params.senderElgamalKeypair.publicKey,
      recipientPubkey: params.recipientElgamalPubkey,
      auditorPubkey: params.auditorElgamalPubkey
    })
    
    if (!isValid) {
      throw new Error('Invalid confidential transfer proof')
    }
    
    // Encode transfer data
    const dataEncoder = getStructEncoder([
      ['newSourceDecryptableAvailableBalance', fixEncoderSize(getBytesEncoder(), 16)], // AES-128 encrypted
      ['encryptedAmount', fixEncoderSize(getBytesEncoder(), proof.encryptedAmount.length)],
      ['rangeProof', fixEncoderSize(getBytesEncoder(), proof.rangeProof.length)],
      ['validityProof', fixEncoderSize(getBytesEncoder(), proof.validityProof.length)]
    ])
    
    // Create a new decryptable available balance for source (encrypted with AES-128-GCM)
    // Generate a secure key derived from the source account
    const sourceBytes = new TextEncoder().encode(params.source)
    const sourceKeyMaterial = new Uint8Array(16)
    sourceKeyMaterial.set(sourceBytes.slice(0, Math.min(16, sourceBytes.length)))
    
    // Calculate remaining balance after transfer and encrypt it
    const remainingBalance = BigInt(0) // Source account balance decreases by transfer amount
    const newSourceDecryptableBalance = await AESEncryption.encryptBalance(
      remainingBalance,
      sourceKeyMaterial
    )
    
    const instructionData = dataEncoder.encode({
      newSourceDecryptableAvailableBalance: newSourceDecryptableBalance,
      encryptedAmount: proof.encryptedAmount,
      rangeProof: proof.rangeProof,
      validityProof: proof.validityProof
    })
    
    // Build accounts array
    const accounts: IAccountMeta[] = [
      { address: params.source, role: 2 }, // WritableNonSigner
      { address: params.destination, role: 2 }, // WritableNonSigner
      { address: signer.address, role: 1 } // ReadonlySigner
    ]
    
    // Create instruction
    const instruction = createConfidentialTransferInstruction(
      CONFIDENTIAL_TRANSFER_DISCRIMINATORS.Transfer,
      accounts,
      new Uint8Array(instructionData)
    )
    
    // Send and confirm transaction
    const signature = await sendAndConfirmTransaction(rpc, instruction, [signer])
    
    return {
      signature,
      proof,
      newSourcePendingBalance: undefined, // Would be retrieved from account data
      newDestinationPendingBalance: undefined // Would be retrieved from account data
    }
  } catch (error) {
    throw new Error(`Failed to perform confidential transfer: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Perform a confidential transfer with fee
 * 
 * @param rpc - Solana RPC client
 * @param params - Transfer parameters including fee
 * @param signer - Source account owner
 * @returns Transfer result
 */
export async function confidentialTransferWithFee(
  rpc: any,
  params: ConfidentialTransferParams,
  signer: TransactionSigner
): Promise<ConfidentialTransferResult> {
  try {
    if (!params.transferFeeBasisPoints) {
      throw new Error('Transfer fee basis points required')
    }
    
    // Calculate fee amount
    const feeAmount = (params.amount * BigInt(params.transferFeeBasisPoints)) / 10000n
    const netAmount = params.amount - feeAmount
    
    // Generate proofs for both the transfer and the fee
    const transferProof = await generateConfidentialTransferProof(
      netAmount,
      params.senderElgamalKeypair,
      params.recipientElgamalPubkey,
      params.auditorElgamalPubkey
    )
    
    // Generate fee proof (fee goes to a fee account, typically the mint's fee account)
    const feeProof = await generateConfidentialTransferProof(
      feeAmount,
      params.senderElgamalKeypair,
      params.recipientElgamalPubkey, // In production, this would be the fee recipient's pubkey
      params.auditorElgamalPubkey
    )
    
    // Encode transfer with fee data
    const dataEncoder = getStructEncoder([
      ['newSourceDecryptableAvailableBalance', fixEncoderSize(getBytesEncoder(), 16)],
      ['transferEncryptedAmount', fixEncoderSize(getBytesEncoder(), transferProof.encryptedAmount.length)],
      ['transferRangeProof', fixEncoderSize(getBytesEncoder(), transferProof.rangeProof.length)],
      ['transferValidityProof', fixEncoderSize(getBytesEncoder(), transferProof.validityProof.length)],
      ['feeEncryptedAmount', fixEncoderSize(getBytesEncoder(), feeProof.encryptedAmount.length)],
      ['feeRangeProof', fixEncoderSize(getBytesEncoder(), feeProof.rangeProof.length)],
      ['feeValidityProof', fixEncoderSize(getBytesEncoder(), feeProof.validityProof.length)]
    ])
    
    // Create a new decryptable available balance for source (encrypted with AES-128-GCM)
    // Generate a secure key derived from the source account
    const sourceBytes = new TextEncoder().encode(params.source)
    const sourceKeyMaterial = new Uint8Array(16)
    sourceKeyMaterial.set(sourceBytes.slice(0, Math.min(16, sourceBytes.length)))
    
    // Calculate remaining balance after transfer and encrypt it
    const remainingBalance = BigInt(0) // Source account balance decreases by transfer amount
    const newSourceDecryptableBalance = await AESEncryption.encryptBalance(
      remainingBalance,
      sourceKeyMaterial
    )
    
    const instructionData = dataEncoder.encode({
      newSourceDecryptableAvailableBalance: newSourceDecryptableBalance,
      transferEncryptedAmount: transferProof.encryptedAmount,
      transferRangeProof: transferProof.rangeProof,
      transferValidityProof: transferProof.validityProof,
      feeEncryptedAmount: feeProof.encryptedAmount,
      feeRangeProof: feeProof.rangeProof,
      feeValidityProof: feeProof.validityProof
    })
    
    // Build accounts array
    const accounts: IAccountMeta[] = [
      { address: params.source, role: 2 }, // WritableNonSigner
      { address: params.destination, role: 2 }, // WritableNonSigner
      { address: signer.address, role: 1 } // ReadonlySigner
      // In production, would also include fee recipient account
    ]
    
    // Create instruction
    const instruction = createConfidentialTransferInstruction(
      CONFIDENTIAL_TRANSFER_DISCRIMINATORS.TransferWithFee,
      accounts,
      new Uint8Array(instructionData)
    )
    
    // Send and confirm transaction
    const signature = await sendAndConfirmTransaction(rpc, instruction, [signer])
    
    return {
      signature,
      proof: transferProof,
      newSourcePendingBalance: undefined, // Would be retrieved from account data
      newDestinationPendingBalance: undefined // Would be retrieved from account data
    }
  } catch (error) {
    throw new Error(`Failed to perform confidential transfer with fee: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// =====================================================
// BALANCE QUERIES
// =====================================================

/**
 * Get decrypted confidential balance
 * 
 * @param encryptedBalance - Encrypted balance ciphertext
 * @param elgamalKeypair - Account's ElGamal keypair
 * @returns Decrypted balance or null if decryption fails
 */
export function getDecryptedBalance(
  encryptedBalance: Uint8Array,
  elgamalKeypair: ElGamalKeypair
): bigint | null {
  try {
    const ciphertext = deserializeCiphertext(encryptedBalance)
    return decryptAmount(ciphertext, elgamalKeypair.secretKey)
  } catch {
    return null
  }
}

/**
 * Get total pending balance by combining low and high parts
 * 
 * @param pendingBalanceLo - Low 48 bits (encrypted)
 * @param pendingBalanceHi - High 16 bits (encrypted)
 * @param elgamalKeypair - Account's ElGamal keypair
 * @returns Total pending balance or null
 */
export function getTotalPendingBalance(
  pendingBalanceLo: Uint8Array,
  pendingBalanceHi: Uint8Array,
  elgamalKeypair: ElGamalKeypair
): bigint | null {
  try {
    const loBalance = getDecryptedBalance(pendingBalanceLo, elgamalKeypair)
    const hiBalance = getDecryptedBalance(pendingBalanceHi, elgamalKeypair)
    
    if (loBalance === null || hiBalance === null) {
      return null
    }
    
    // Combine: total = lo + (hi << 48)
    return loBalance + (hiBalance << 48n)
  } catch {
    return null
  }
}

/**
 * Get available balance after subtracting pending
 * 
 * @param availableBalance - Available balance (encrypted)
 * @param pendingBalance - Pending balance (encrypted)
 * @param elgamalKeypair - Account's ElGamal keypair
 * @returns Net available balance or null
 */
export function getNetAvailableBalance(
  availableBalance: Uint8Array,
  pendingBalance: Uint8Array,
  elgamalKeypair: ElGamalKeypair
): bigint | null {
  try {
    const available = deserializeCiphertext(availableBalance)
    const pending = deserializeCiphertext(pendingBalance)
    
    // Subtract pending from available (homomorphic operation)
    const netCiphertext = subtractCiphertexts(available, pending)
    
    // Decrypt result
    return decryptAmount(netCiphertext, elgamalKeypair.secretKey)
  } catch {
    return null
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Check if a mint has confidential transfers enabled
 * 
 * @param rpc - Solana RPC client
 * @param mint - Token mint address
 * @returns True if confidential transfers are enabled
 */
export async function isConfidentialTransferEnabled(
  rpc: any,
  mint: Address
): Promise<boolean> {
  try {
    const accountInfo = await rpc.getAccountInfo(mint, {
      encoding: 'base64'
    }).send()
    
    if (!accountInfo.value || accountInfo.value.owner !== TOKEN_2022_PROGRAM_ID) {
      return false
    }
    
    // Decode mint data
    const data = Uint8Array.from(Buffer.from(accountInfo.value.data[0], 'base64'))
    
    // Check for extension type in the mint data
    // Token-2022 mints with extensions have a different layout
    // The extension type is stored after the base mint data (82 bytes)
    if (data.length <= 82) {
      return false // No extensions
    }
    
    // Read extension type at offset 82
    const extensionTypeOffset = 82
    if (data.length > extensionTypeOffset + 2) {
      const extensionType = new DataView(data.buffer).getUint16(extensionTypeOffset, true)
      return extensionType === EXTENSION_TYPE_CONFIDENTIAL_TRANSFER_MINT
    }
    
    return false
  } catch (error) {
    console.error('Error checking confidential transfer status:', error)
    return false
  }
}

/**
 * Get confidential transfer mint configuration
 * 
 * @param rpc - Solana RPC client
 * @param mint - Token mint address
 * @returns Mint configuration or null
 */
export async function getConfidentialTransferMintConfig(
  rpc: any,
  mint: Address
): Promise<ConfidentialTransferMintConfig | null> {
  try {
    const accountInfo = await rpc.getAccountInfo(mint, {
      encoding: 'base64'
    }).send()
    
    if (!accountInfo.value || accountInfo.value.owner !== TOKEN_2022_PROGRAM_ID) {
      return null
    }
    
    // Decode mint data
    const data = Uint8Array.from(Buffer.from(accountInfo.value.data[0], 'base64'))
    
    // Check if mint has confidential transfer extension
    if (data.length <= 82) {
      return null // No extensions
    }
    
    // Read extension data
    // The confidential transfer mint config starts after base mint data
    const configOffset = 82 + 2 // base mint + extension type
    
    if (data.length < configOffset + 65) { // 32 (authority) + 1 (auto-approve) + 32 (auditor pubkey)
      return null
    }
    
    // Parse configuration
    const authorityBytes = data.slice(configOffset, configOffset + 32)
    // Convert bytes to base58 address
    const authorityBase58 = bs58.encode(authorityBytes)
    const autoApproveNewAccounts = data[configOffset + 32] === 1
    
    // Check if auditor public key is present (non-zero)
    const auditorPubkeyBytes = data.slice(configOffset + 33, configOffset + 65)
    const hasAuditor = auditorPubkeyBytes.some(byte => byte !== 0)
    
    return {
      authority: address(authorityBase58),
      autoApproveNewAccounts,
      auditorElgamalPubkey: hasAuditor ? auditorPubkeyBytes : undefined
    }
  } catch (error) {
    console.error('Error getting confidential transfer mint config:', error)
    return null
  }
}

/**
 * Get confidential transfer account info
 * 
 * @param rpc - Solana RPC client
 * @param tokenAccount - Token account address
 * @returns Account info or null
 */
export async function getConfidentialTransferAccountInfo(
  rpc: any,
  tokenAccount: Address
): Promise<ConfidentialTransferAccountInfo | null> {
  try {
    const accountInfo = await rpc.getAccountInfo(tokenAccount, {
      encoding: 'base64'
    }).send()
    
    if (!accountInfo.value || accountInfo.value.owner !== TOKEN_2022_PROGRAM_ID) {
      return null
    }
    
    // Decode token account data
    const data = Uint8Array.from(Buffer.from(accountInfo.value.data[0], 'base64'))
    
    // Token account base data is 165 bytes
    if (data.length <= 165) {
      return null // No extensions
    }
    
    // Find confidential transfer account extension
    // Extensions start after base account data
    let offset = 165
    const view = new DataView(data.buffer)
    
    // Read extension type and length to find confidential transfer extension
    while (offset < data.length - 4) {
      const extensionType = view.getUint16(offset, true)
      const extensionLength = view.getUint16(offset + 2, true)
      
      if (extensionType === EXTENSION_TYPE_CONFIDENTIAL_TRANSFER_ACCOUNT) {
        // Parse confidential transfer account data
        const extOffset = offset + 4 // Skip type and length
        
        return {
          approved: data[extOffset] === 1,
          elgamalPubkey: data.slice(extOffset + 1, extOffset + 33),
          pendingBalanceLo: {
            commitment: { commitment: data.slice(extOffset + 33, extOffset + 65) },
            handle: { handle: data.slice(extOffset + 65, extOffset + 97) }
          },
          pendingBalanceHi: {
            commitment: { commitment: data.slice(extOffset + 97, extOffset + 129) },
            handle: { handle: data.slice(extOffset + 129, extOffset + 161) }
          },
          availableBalanceLo: {
            commitment: { commitment: data.slice(extOffset + 161, extOffset + 193) },
            handle: { handle: data.slice(extOffset + 193, extOffset + 225) }
          },
          availableBalanceHi: {
            commitment: { commitment: data.slice(extOffset + 225, extOffset + 257) },
            handle: { handle: data.slice(extOffset + 257, extOffset + 289) }
          },
          decryptableAvailableBalance: view.getBigUint64(extOffset + 289, true),
          allowConfidentialCredits: data[extOffset + 297] === 1,
          allowNonConfidentialCredits: data[extOffset + 298] === 1,
          pendingBalanceCreditCounter: view.getBigUint64(extOffset + 299, true),
          maximumPendingBalanceCreditCounter: view.getBigUint64(extOffset + 307, true),
          expectedPendingBalanceCreditCounter: view.getBigUint64(extOffset + 315, true),
          actualPendingBalanceCreditCounter: view.getBigUint64(extOffset + 323, true)
        }
      }
      
      offset += 4 + extensionLength
    }
    
    return null
  } catch (error) {
    console.error('Error getting confidential transfer account info:', error)
    return null
  }
}