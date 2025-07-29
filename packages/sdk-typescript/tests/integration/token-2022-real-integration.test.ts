/**
 * Token-2022 Real Integration Tests
 * 
 * Tests against actual Solana network (local validator or devnet)
 * with real SPL Token-2022 functionality.
 * 
 * Prerequisites:
 * - Local Solana validator running: `solana-test-validator`
 * - Or set SOLANA_RPC_URL environment variable for devnet/testnet
 * 
 * Run with: npm test -- token-2022-real-integration
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { Connection, Keypair, LAMPORTS_PER_SOL, sendAndConfirmTransaction, Transaction, SystemProgram } from '@solana/web3.js'
import type { Address, TransactionSigner } from '@solana/kit'
import { address } from '@solana/addresses'
import { generateKeyPairSigner } from '@solana/signers'
import {
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  createMint,
  mintTo,
  getAccount,
  getMint,
  getTransferFeeConfig,
  createAccount as createTokenAccount,
  transfer
} from '@solana/spl-token'

import {
  createMintWithExtensions,
  transferWithFee,
  getOrCreateAssociatedTokenAccount,
  isToken2022,
  getMintExtensions,
  calculateTransferAmountWithFee
} from '../../src/utils/spl-token-integration.js'
import { generateElGamalKeypair } from '../../src/utils/keypair.js'

// Helper to convert Keypair to TransactionSigner
function keypairToSigner(keypair: Keypair): TransactionSigner {
  return {
    address: address(keypair.publicKey.toBase58()),
    signTransactions: async (transactions) => {
      return transactions.map(tx => {
        tx.sign(keypair)
        return tx
      })
    },
    signMessages: async (messages) => {
      return messages.map(msg => keypair.sign(msg))
    }
  }
}

// Skip these tests unless explicitly running real integration tests
const describeReal = process.env.RUN_REAL_TESTS ? describe : describe.skip

describeReal('Token-2022 Real Integration', () => {
  let connection: Connection
  let payer: Keypair
  let payerSigner: TransactionSigner
  let mintAuthority: Keypair
  let mintAuthoritySigner: TransactionSigner
  
  beforeAll(async () => {
    // Connect to local validator or configured RPC
    const rpcUrl = process.env.SOLANA_RPC_URL || 'http://localhost:8899'
    connection = new Connection(rpcUrl, 'confirmed')
    
    // Generate payer and fund it
    payer = Keypair.generate()
    payerSigner = keypairToSigner(payer)
    
    // Request airdrop (only works on local/devnet)
    try {
      const airdropSignature = await connection.requestAirdrop(
        payer.publicKey,
        2 * LAMPORTS_PER_SOL
      )
      await connection.confirmTransaction(airdropSignature)
    } catch (error) {
      console.warn('Airdrop failed, ensure account is funded:', payer.publicKey.toBase58())
    }
    
    // Generate mint authority
    mintAuthority = Keypair.generate()
    mintAuthoritySigner = keypairToSigner(mintAuthority)
  })
  
  describe('Mint Creation with Real Extensions', () => {
    it('should create a real mint with transfer fee extension', async () => {
      const mintKeypair = Keypair.generate()
      const mintSigner = keypairToSigner(mintKeypair)
      
      // Create mint with transfer fee extension
      const instructions = await createMintWithExtensions(connection, {
        mint: mintSigner,
        decimals: 9,
        mintAuthority: mintAuthoritySigner.address,
        payer: payerSigner,
        extensions: {
          transferFeeConfig: {
            transferFeeBasisPoints: 50, // 0.5%
            maximumFee: 5000000n, // 0.005 tokens max
            transferFeeConfigAuthority: mintAuthoritySigner.address,
            withdrawWithheldAuthority: mintAuthoritySigner.address
          }
        }
      })
      
      // Send transaction
      const transaction = new Transaction().add(...instructions)
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, mintKeypair],
        { commitment: 'confirmed' }
      )
      
      console.log('Mint created with transfer fee:', signature)
      
      // Verify mint was created
      const mintInfo = await getMint(
        connection,
        mintKeypair.publicKey,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      )
      
      expect(mintInfo.decimals).toBe(9)
      expect(mintInfo.mintAuthority?.toBase58()).toBe(mintAuthoritySigner.address)
      
      // Verify transfer fee extension
      const transferFeeConfig = getTransferFeeConfig(mintInfo)
      expect(transferFeeConfig).toBeTruthy()
      expect(transferFeeConfig?.newerTransferFee.transferFeeBasisPoints).toBe(50)
      expect(transferFeeConfig?.newerTransferFee.maximumFee).toBe(5000000n)
    })
    
    it('should create mint with multiple extensions', async () => {
      const mintKeypair = Keypair.generate()
      const mintSigner = keypairToSigner(mintKeypair)
      
      // Create mint with multiple extensions
      const instructions = await createMintWithExtensions(connection, {
        mint: mintSigner,
        decimals: 6,
        mintAuthority: mintAuthoritySigner.address,
        freezeAuthority: mintAuthoritySigner.address,
        payer: payerSigner,
        extensions: {
          transferFeeConfig: {
            transferFeeBasisPoints: 100, // 1%
            maximumFee: 1000000n
          },
          defaultAccountState: 'initialized',
          mintCloseAuthority: mintAuthoritySigner.address,
          permanentDelegate: mintAuthoritySigner.address
        }
      })
      
      // Send transaction
      const transaction = new Transaction().add(...instructions)
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, mintKeypair],
        { commitment: 'confirmed' }
      )
      
      console.log('Mint created with multiple extensions:', signature)
      
      // Verify extensions
      const extensions = await getMintExtensions(connection, mintSigner.address)
      expect(extensions).toContain(ExtensionType.TransferFeeConfig)
      expect(extensions).toContain(ExtensionType.DefaultAccountState)
      expect(extensions).toContain(ExtensionType.MintCloseAuthority)
      expect(extensions).toContain(ExtensionType.PermanentDelegate)
    })
  })
  
  describe('Real Transfer Operations with Fees', () => {
    let mintWithFee: Keypair
    let sourceAccount: Keypair
    let destinationAccount: Keypair
    let sourceOwner: Keypair
    let destinationOwner: Keypair
    
    beforeEach(async () => {
      // Create mint with transfer fee
      mintWithFee = Keypair.generate()
      const mintSigner = keypairToSigner(mintWithFee)
      
      // Create owners
      sourceOwner = Keypair.generate()
      destinationOwner = Keypair.generate()
      
      // Create mint with 1% transfer fee
      const createMintInstructions = await createMintWithExtensions(connection, {
        mint: mintSigner,
        decimals: 9,
        mintAuthority: mintAuthoritySigner.address,
        payer: payerSigner,
        extensions: {
          transferFeeConfig: {
            transferFeeBasisPoints: 100, // 1%
            maximumFee: 10000000n // 0.01 tokens max
          }
        }
      })
      
      const mintTx = new Transaction().add(...createMintInstructions)
      await sendAndConfirmTransaction(
        connection,
        mintTx,
        [payer, mintWithFee],
        { commitment: 'confirmed' }
      )
      
      // Create token accounts
      sourceAccount = Keypair.generate()
      const createSourceAcctIx = SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: sourceAccount.publicKey,
        lamports: await connection.getMinimumBalanceForRentExemption(165),
        space: 165,
        programId: TOKEN_2022_PROGRAM_ID
      })
      
      const initSourceAcctIx = createTokenAccount(
        connection,
        payer,
        mintWithFee.publicKey,
        sourceOwner.publicKey,
        sourceAccount,
        { commitment: 'confirmed' },
        TOKEN_2022_PROGRAM_ID
      )
      
      destinationAccount = Keypair.generate()
      const createDestAcctIx = SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: destinationAccount.publicKey,
        lamports: await connection.getMinimumBalanceForRentExemption(165),
        space: 165,
        programId: TOKEN_2022_PROGRAM_ID
      })
      
      const initDestAcctIx = createTokenAccount(
        connection,
        payer,
        mintWithFee.publicKey,
        destinationOwner.publicKey,
        destinationAccount,
        { commitment: 'confirmed' },
        TOKEN_2022_PROGRAM_ID
      )
      
      // Wait for account creation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mint tokens to source account
      await mintTo(
        connection,
        payer,
        mintWithFee.publicKey,
        sourceAccount.publicKey,
        mintAuthority,
        1000000000, // 1 token
        [],
        { commitment: 'confirmed' },
        TOKEN_2022_PROGRAM_ID
      )
    })
    
    it('should transfer tokens with automatic fee deduction', async () => {
      const transferAmount = 100000000n // 0.1 tokens
      
      // Get initial balances
      const sourceBalanceBefore = await getAccount(
        connection,
        sourceAccount.publicKey,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      )
      const destBalanceBefore = await getAccount(
        connection,
        destinationAccount.publicKey,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      )
      
      // Create transfer with fee
      const transferInstruction = await transferWithFee(connection, {
        source: address(sourceAccount.publicKey.toBase58()),
        destination: address(destinationAccount.publicKey.toBase58()),
        authority: keypairToSigner(sourceOwner),
        mint: address(mintWithFee.publicKey.toBase58()),
        amount: transferAmount,
        decimals: 9
      })
      
      // Send transfer
      const transferTx = new Transaction().add(transferInstruction)
      await sendAndConfirmTransaction(
        connection,
        transferTx,
        [sourceOwner],
        { commitment: 'confirmed' }
      )
      
      // Get final balances
      const sourceBalanceAfter = await getAccount(
        connection,
        sourceAccount.publicKey,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      )
      const destBalanceAfter = await getAccount(
        connection,
        destinationAccount.publicKey,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      )
      
      // Calculate expected fee (1% of transfer)
      const expectedFee = transferAmount / 100n
      
      // Verify balances
      expect(sourceBalanceAfter.amount).toBe(
        sourceBalanceBefore.amount - BigInt(transferAmount)
      )
      expect(destBalanceAfter.amount).toBe(
        destBalanceBefore.amount + BigInt(transferAmount) - expectedFee
      )
      
      console.log(`Transferred ${transferAmount} with fee ${expectedFee}`)
    })
    
    it('should calculate transfer fees correctly', async () => {
      const result = await calculateTransferAmountWithFee(
        connection,
        address(mintWithFee.publicKey.toBase58()),
        500000000n // 0.5 tokens
      )
      
      expect(result.amount).toBe(500000000n)
      expect(result.fee).toBe(5000000n) // 1% of 0.5 tokens
    })
  })
  
  describe('Real Associated Token Account Management', () => {
    let testMint: Keypair
    let tokenOwner: Keypair
    
    beforeEach(async () => {
      // Create a test mint
      testMint = Keypair.generate()
      await createMint(
        connection,
        payer,
        mintAuthority.publicKey,
        null,
        9,
        testMint,
        { commitment: 'confirmed' },
        TOKEN_2022_PROGRAM_ID
      )
      
      tokenOwner = Keypair.generate()
    })
    
    it('should create and retrieve associated token accounts', async () => {
      // First call should create the account
      const result1 = await getOrCreateAssociatedTokenAccount(
        connection,
        payerSigner,
        address(testMint.publicKey.toBase58()),
        address(tokenOwner.publicKey.toBase58())
      )
      
      expect(result1.address).toBeTruthy()
      expect(result1.instruction).toBeTruthy()
      
      // Send the creation transaction
      if (result1.instruction) {
        const tx = new Transaction().add(result1.instruction)
        await sendAndConfirmTransaction(
          connection,
          tx,
          [payer],
          { commitment: 'confirmed' }
        )
      }
      
      // Second call should return existing account
      const result2 = await getOrCreateAssociatedTokenAccount(
        connection,
        payerSigner,
        address(testMint.publicKey.toBase58()),
        address(tokenOwner.publicKey.toBase58())
      )
      
      expect(result2.address).toBe(result1.address)
      expect(result2.instruction).toBeUndefined()
    })
    
    it('should correctly identify Token-2022 mints', async () => {
      // Test with our Token-2022 mint
      const isToken2022Mint = await isToken2022(
        connection,
        address(testMint.publicKey.toBase58())
      )
      expect(isToken2022Mint).toBe(true)
      
      // Test with non-existent mint
      const fakeMint = Keypair.generate()
      const isFakeToken2022 = await isToken2022(
        connection,
        address(fakeMint.publicKey.toBase58())
      )
      expect(isFakeToken2022).toBe(false)
    })
  })
  
  describe('Real Extension Detection', () => {
    it('should detect real extensions on mints', async () => {
      // Create mint with known extensions
      const mintKeypair = Keypair.generate()
      const mintSigner = keypairToSigner(mintKeypair)
      
      const instructions = await createMintWithExtensions(connection, {
        mint: mintSigner,
        decimals: 6,
        mintAuthority: mintAuthoritySigner.address,
        payer: payerSigner,
        extensions: {
          transferFeeConfig: {
            transferFeeBasisPoints: 25, // 0.25%
            maximumFee: 1000000n
          },
          mintCloseAuthority: mintAuthoritySigner.address
        }
      })
      
      const tx = new Transaction().add(...instructions)
      await sendAndConfirmTransaction(
        connection,
        tx,
        [payer, mintKeypair],
        { commitment: 'confirmed' }
      )
      
      // Detect extensions
      const extensions = await getMintExtensions(
        connection,
        address(mintKeypair.publicKey.toBase58())
      )
      
      expect(extensions).toContain(ExtensionType.TransferFeeConfig)
      expect(extensions).toContain(ExtensionType.MintCloseAuthority)
      expect(extensions.length).toBe(2)
    })
  })
})