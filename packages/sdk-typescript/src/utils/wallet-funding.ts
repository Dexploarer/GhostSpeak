/**
 * Wallet Funding Utilities
 * 
 * Provides robust wallet funding strategies that don't depend solely on unreliable devnet airdrops.
 * Supports multiple funding strategies with automatic fallback mechanisms.
 */

import type { 
  Address, 
  KeyPairSigner, 
  Commitment
} from '@solana/kit'
import { 
  generateKeyPairSigner,
  createSolanaRpc,
  createKeyPairSignerFromBytes,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction,
  lamports
} from '@solana/kit'
import { getTransferSolInstruction } from '@solana-program/system'
import { promises as fs } from 'fs'
import chalk from 'chalk'

/**
 * Funding strategy options
 */
export interface FundingStrategyOptions {
  /** Target amount in lamports */
  amount: bigint
  /** Minimum amount required (if less, will try to top up) */
  minAmount?: bigint
  /** Maximum retries for airdrop */
  maxRetries?: number
  /** Delay between retries in ms */
  retryDelay?: number
  /** Use treasury wallet if available */
  useTreasury?: boolean
  /** Treasury wallet path or signer */
  treasuryWallet?: string | KeyPairSigner
  /** Additional funded wallets to try */
  fundedWallets?: (string | KeyPairSigner)[]
  /** Log funding attempts */
  verbose?: boolean
}

/**
 * Funding result
 */
export interface FundingResult {
  /** Whether funding was successful */
  success: boolean
  /** Final balance after funding */
  balance: bigint
  /** Funding method used */
  method: 'airdrop' | 'treasury' | 'funded-wallet' | 'existing'
  /** Number of attempts made */
  attempts: number
  /** Error if funding failed */
  error?: string
  /** Transaction signature if transfer was made */
  signature?: string
}

/**
 * Wallet funding utility with multiple strategies
 */
export class WalletFundingService {
  private rpc: ReturnType<typeof createSolanaRpc>
  private commitment: Commitment = 'confirmed'
  private isDevnetUrl: boolean

  constructor(rpcUrl: string, commitment: Commitment = 'confirmed') {
    // Check if this is a devnet URL
    this.isDevnetUrl = rpcUrl.includes('devnet')
    
    // Create RPC client
    this.rpc = createSolanaRpc(rpcUrl)
    
    this.commitment = commitment
  }

  /**
   * Fund a wallet using multiple strategies
   */
  async fundWallet(
    targetWallet: Address,
    options: FundingStrategyOptions
  ): Promise<FundingResult> {
    const {
      amount,
      minAmount = amount,
      maxRetries = 3,
      retryDelay = 2000,
      useTreasury = true,
      treasuryWallet,
      fundedWallets = [],
      verbose = false
    } = options

    const log = (message: string) => {
      if (verbose) {
        console.log(chalk.gray(`[WalletFunding] ${message}`))
      }
    }

    let attempts = 0

    try {
      // First check existing balance
      const currentBalance = await this.getBalance(targetWallet)
      log(`Current balance: ${this.formatSol(currentBalance)} SOL`)

      if (currentBalance >= minAmount) {
        log(`Wallet already has sufficient balance`)
        return {
          success: true,
          balance: currentBalance,
          method: 'existing',
          attempts: 0
        }
      }

      const needed = amount - currentBalance
      log(`Need to fund: ${this.formatSol(needed)} SOL`)

      // Strategy 1: Try devnet airdrop first
      if (this.isDevnetUrl && 'requestAirdrop' in this.rpc) {
        log(`Attempting devnet airdrop...`)
        const airdropResult = await this.tryAirdrop(
          targetWallet,
          needed,
          maxRetries,
          retryDelay,
          verbose
        )
        
        if (airdropResult.success) {
          const finalBalance = await this.getBalance(targetWallet)
          return {
            success: true,
            balance: finalBalance,
            method: 'airdrop',
            attempts: airdropResult.attempts,
            signature: airdropResult.signature
          }
        }
        
        attempts += airdropResult.attempts
        log(`Airdrop failed after ${airdropResult.attempts} attempts`)
      }

      // Strategy 2: Try treasury wallet
      if (useTreasury && treasuryWallet) {
        log(`Attempting treasury wallet funding...`)
        const treasuryResult = await this.tryTreasuryFunding(
          targetWallet,
          needed,
          treasuryWallet,
          verbose
        )
        
        if (treasuryResult.success) {
          const finalBalance = await this.getBalance(targetWallet)
          return {
            success: true,
            balance: finalBalance,
            method: 'treasury',
            attempts: attempts + 1,
            signature: treasuryResult.signature
          }
        }
        
        attempts++
        log(`Treasury funding failed: ${treasuryResult.error}`)
      }

      // Strategy 3: Try other funded wallets
      for (const fundedWallet of fundedWallets) {
        log(`Attempting funding from additional wallet...`)
        const fundedResult = await this.tryFundedWalletTransfer(
          targetWallet,
          needed,
          fundedWallet,
          verbose
        )
        
        if (fundedResult.success) {
          const finalBalance = await this.getBalance(targetWallet)
          return {
            success: true,
            balance: finalBalance,
            method: 'funded-wallet',
            attempts: attempts + 1,
            signature: fundedResult.signature
          }
        }
        
        attempts++
        log(`Funded wallet transfer failed: ${fundedResult.error}`)
      }

      // All strategies failed
      throw new Error('All funding strategies failed')

    } catch (error) {
      return {
        success: false,
        balance: await this.getBalance(targetWallet),
        method: 'airdrop',
        attempts,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Try to fund using devnet airdrop with retries
   */
  private async tryAirdrop(
    targetWallet: Address,
    amount: bigint,
    maxRetries: number,
    retryDelay: number,
    verbose: boolean
  ): Promise<{ success: boolean; attempts: number; signature?: string; error?: string }> {
    // Type guard to ensure we have a devnet RPC
    if (!('requestAirdrop' in this.rpc)) {
      return {
        success: false,
        attempts: 0,
        error: 'Airdrop not available on this network'
      }
    }

    let attempts = 0

    for (let i = 0; i < maxRetries; i++) {
      attempts++
      
      try {
        const airdropResponse = await this.rpc
          .requestAirdrop(targetWallet, lamports(amount), { commitment: this.commitment })
          .send()
        
        // The response is the signature directly
        const signature = airdropResponse
        
        if (verbose) {
          console.log(chalk.gray(`[WalletFunding] Airdrop requested: ${signature}`))
        }

        // Get latest blockhash for confirmation
        await this.rpc.getLatestBlockhash().send()

        // Wait for confirmation using getSignatureStatuses
        let confirmed = false
        const maxAttempts = 30
        for (let i = 0; i < maxAttempts; i++) {
          const statusResponse = await this.rpc
            .getSignatureStatuses([signature])
            .send()
          
          const status = statusResponse.value[0]
          if (status && status.confirmationStatus === 'confirmed') {
            confirmed = true
            break
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        // Additional wait to ensure balance is updated
        await new Promise(resolve => setTimeout(resolve, 1000))

        if (!confirmed) {
          throw new Error('Airdrop confirmation timeout')
        }

        return {
          success: true,
          attempts,
          signature
        }
      } catch (error) {
        if (verbose) {
          console.log(chalk.gray(`[WalletFunding] Airdrop attempt ${attempts} failed: ${error}`))
        }
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }

    return {
      success: false,
      attempts,
      error: 'Max retries exceeded'
    }
  }

  /**
   * Try to fund from treasury wallet
   */
  private async tryTreasuryFunding(
    targetWallet: Address,
    amount: bigint,
    treasuryWallet: string | KeyPairSigner,
    verbose: boolean
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      const treasurySigner = await this.loadWallet(treasuryWallet)
      const treasuryBalance = await this.getBalance(treasurySigner.address)

      if (verbose) {
        console.log(chalk.gray(`[WalletFunding] Treasury balance: ${this.formatSol(treasuryBalance)} SOL`))
      }

      if (treasuryBalance < amount + 5000n) { // Keep 5000 lamports for fees
        return {
          success: false,
          error: 'Insufficient treasury balance'
        }
      }

      const signature = await this.transferSol(
        treasurySigner,
        targetWallet,
        amount,
        verbose
      )

      return {
        success: true,
        signature
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Try to fund from another funded wallet
   */
  private async tryFundedWalletTransfer(
    targetWallet: Address,
    amount: bigint,
    fundedWallet: string | KeyPairSigner,
    verbose: boolean
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      const signer = await this.loadWallet(fundedWallet)
      const balance = await this.getBalance(signer.address)

      if (verbose) {
        console.log(chalk.gray(`[WalletFunding] Funded wallet balance: ${this.formatSol(balance)} SOL`))
      }

      if (balance < amount + 5000n) { // Keep 5000 lamports for fees
        return {
          success: false,
          error: 'Insufficient wallet balance'
        }
      }

      const signature = await this.transferSol(
        signer,
        targetWallet,
        amount,
        verbose
      )

      return {
        success: true,
        signature
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Transfer SOL from one wallet to another
   */
  private async transferSol(
    from: KeyPairSigner,
    to: Address,
    amount: bigint,
    verbose: boolean
  ): Promise<string> {
    const { value: latestBlockhash } = await this.rpc.getLatestBlockhash().send()
    
    const transferInstruction = getTransferSolInstruction({
      source: from,
      destination: to,
      amount
    })

    const message = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayer(from.address, tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx => appendTransactionMessageInstructions([transferInstruction], tx)
    )

    const signedTransaction = await signTransactionMessageWithSigners(message)
    const base64Transaction = getBase64EncodedWireTransaction(signedTransaction)
    
    const sendResult = await this.rpc
      .sendTransaction(base64Transaction, { 
        skipPreflight: false,
        preflightCommitment: this.commitment,
        maxRetries: 5n
      })
      .send()
      
    // sendTransaction returns the signature directly
    const signature = sendResult

    if (verbose) {
      console.log(chalk.gray(`[WalletFunding] Transfer sent: ${signature}`))
    }

    // Wait for confirmation using getSignatureStatuses
    let confirmed = false
    const maxAttempts = 30
    for (let i = 0; i < maxAttempts; i++) {
      const statusResponse = await this.rpc
        .getSignatureStatuses([signature])
        .send()
      
      const status = statusResponse.value[0]
      if (status && status.confirmationStatus === 'confirmed') {
        confirmed = true
        break
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    if (!confirmed) {
      throw new Error('Transaction confirmation timeout')
    }

    return signature
  }

  /**
   * Load wallet from path or return existing signer
   */
  private async loadWallet(walletSource: string | KeyPairSigner): Promise<KeyPairSigner> {
    if (typeof walletSource !== 'string') {
      return walletSource
    }

    // Check if it's an environment variable
    const envValue = process.env[walletSource]
    if (envValue) {
      // Try to parse as JSON array
      try {
        const walletData = JSON.parse(envValue) as number[]
        return await createKeyPairSignerFromBytes(new Uint8Array(walletData))
      } catch {
        // Try as base58 private key
        throw new Error('Base58 private key loading not implemented')
      }
    }

    // Load from file
    const walletData = JSON.parse(await fs.readFile(walletSource, 'utf-8')) as number[]
    return createKeyPairSignerFromBytes(new Uint8Array(walletData))
  }

  /**
   * Get wallet balance
   */
  async getBalance(wallet: Address): Promise<bigint> {
    const response = await this.rpc
      .getBalance(wallet, { commitment: this.commitment })
      .send()
    return response.value
  }

  /**
   * Check if connected to devnet
   */
  private async isDevnet(): Promise<boolean> {
    try {
      const response = await this.rpc.getGenesisHash().send()
      // Devnet genesis hash - response is the hash string directly
      return await Promise.resolve(response === 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG')
    } catch {
      return false
    }
  }

  /**
   * Format lamports as SOL
   */
  private formatSol(lamports: bigint): string {
    return (Number(lamports) / 1_000_000_000).toFixed(4)
  }

  /**
   * Create and fund multiple test wallets
   */
  async createAndFundTestWallets(
    count: number,
    amountPerWallet: bigint,
    options: Omit<FundingStrategyOptions, 'amount'>
  ): Promise<KeyPairSigner[]> {
    const wallets: KeyPairSigner[] = []

    console.log(chalk.cyan(`Creating and funding ${count} test wallets...`))

    for (let i = 0; i < count; i++) {
      const wallet = await generateKeyPairSigner()
      
      console.log(chalk.gray(`Wallet ${i + 1}: ${wallet.address}`))
      
      const result = await this.fundWallet(wallet.address, {
        ...options,
        amount: amountPerWallet
      })

      if (result.success) {
        wallets.push(wallet)
        console.log(chalk.green(`✅ Funded with ${this.formatSol(result.balance)} SOL via ${result.method}`))
      } else {
        console.log(chalk.red(`❌ Failed to fund: ${result.error}`))
      }
    }

    return wallets
  }

  /**
   * Ensure minimum balance for a wallet
   */
  async ensureMinimumBalance(
    wallet: Address,
    minBalance: bigint,
    options?: Partial<FundingStrategyOptions>
  ): Promise<FundingResult> {
    const currentBalance = await this.getBalance(wallet)
    
    if (currentBalance >= minBalance) {
      return {
        success: true,
        balance: currentBalance,
        method: 'existing',
        attempts: 0
      }
    }

    const needed = minBalance - currentBalance
    return this.fundWallet(wallet, {
      amount: needed,
      minAmount: minBalance,
      ...options
    })
  }
}

/**
 * Default funding service instance for devnet
 */
export const defaultFundingService = new WalletFundingService(
  process.env.GHOSTSPEAK_RPC_URL ?? 'https://api.devnet.solana.com'
)

/**
 * Quick helper to fund a wallet with default settings
 */
export async function fundWallet(
  wallet: Address,
  amountInSol: number,
  options?: Partial<FundingStrategyOptions>
): Promise<FundingResult> {
  return defaultFundingService.fundWallet(wallet, {
    amount: BigInt(Math.floor(amountInSol * 1_000_000_000)),
    ...options
  })
}

/**
 * Quick helper to ensure minimum balance
 */
export async function ensureMinimumBalance(
  wallet: Address,
  minBalanceInSol: number,
  options?: Partial<FundingStrategyOptions>
): Promise<FundingResult> {
  return defaultFundingService.ensureMinimumBalance(
    wallet,
    BigInt(Math.floor(minBalanceInSol * 1_000_000_000)),
    options
  )
}