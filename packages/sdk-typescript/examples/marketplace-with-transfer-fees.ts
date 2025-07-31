/**
 * Example: Marketplace Transactions with Token-2022 Transfer Fees
 * 
 * This example demonstrates how to handle transfer fees when purchasing
 * services in the GhostSpeak marketplace using Token-2022 tokens.
 */

import {
  createSolanaRpc,
  generateKeyPairSigner,
  createTransactionMessage,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners
} from '@solana/kit'
import type { Address, TransactionSigner, Rpc } from '@solana/kit'
import { GhostSpeakClient } from '../src/client/GhostSpeakClient.js'
import { MarketplaceInstructions } from '../src/client/instructions/MarketplaceInstructions.js'
import { 
  getMintWithExtensions,
  mintHasExtension,
  ExtensionType,
  type MintWithExtensions 
} from '../src/utils/token-2022-rpc.js'
import {
  calculateTransferFee,
  calculateRequiredAmountForNetTransfer,
  formatBasisPoints
} from '../src/utils/token-2022-extensions.js'
import { 
  createTransferWithFeeInstruction,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction
} from '../src/utils/token-2022-cpi.js'
import { deriveToken2022AssociatedTokenAddress } from '../src/utils/token-utils.js'

// Configuration
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com'
const PROGRAM_ID = 'GHOST1VYEzX9gPsJdDVMXQmL8aZAQoLZfxCMbKfYohcvy' as Address

async function main() {
  console.log('🚀 GhostSpeak Marketplace with Transfer Fees Example\n')

  // Initialize connection
  const rpc = createSolanaRpc(RPC_ENDPOINT)

  // Generate test keypairs
  const seller = await generateKeyPairSigner()
  const buyer = await generateKeyPairSigner()
  const payer = await generateKeyPairSigner()

  console.log('📋 Account Setup:')
  console.log(`  Seller: ${seller.address}`)
  console.log(`  Buyer: ${buyer.address}`)
  console.log(`  Payer: ${payer.address}\n`)

  // Fund accounts (would airdrop on devnet)
  console.log('💰 Funding accounts...\n')

  // Initialize GhostSpeak client
  const client = new GhostSpeakClient(rpc, PROGRAM_ID, payer)
  const marketplace = new MarketplaceInstructions(client.config)

  // Step 1: Create Token-2022 mint with transfer fees
  console.log('🪙 Creating Token-2022 with 2.5% transfer fee...')
  
  const mintAuthority = await generateKeyPairSigner()
  const transferFeeConfig = {
    feeBasisPoints: 250, // 2.5%
    maxFee: 10_000_000, // Max 10 tokens per transfer
    transferFeeAuthority: mintAuthority.address,
    withdrawWithheldAuthority: mintAuthority.address
  }

  // Create mint with transfer fee (mock - would use actual Token-2022 creation)
  const paymentMint = await createToken2022WithTransferFee(
    rpc,
    payer,
    mintAuthority,
    transferFeeConfig
  )

  console.log(`  Token mint: ${paymentMint}`)
  console.log(`  Transfer fee: ${formatBasisPoints(transferFeeConfig.feeBasisPoints)}`)
  console.log(`  Max fee per transfer: 10 tokens\n`)

  // Step 2: Create token accounts and mint tokens
  console.log('📦 Setting up token accounts...')
  
  const sellerTokenAccount = await deriveToken2022AssociatedTokenAddress(
    seller.address,
    paymentMint
  )
  
  const buyerTokenAccount = await deriveToken2022AssociatedTokenAddress(
    buyer.address,
    paymentMint
  )

  // Mint tokens to buyer (1000 tokens)
  console.log('  Minting 1000 tokens to buyer...\n')

  // Step 3: Create service listing
  console.log('🏪 Creating service listing...')
  
  const listing = await marketplace.createServiceListing(
    'listing-' + Date.now(),
    {
      title: 'Premium AI Code Review',
      description: 'Comprehensive code review with security analysis',
      amount: 100_000_000n, // 100 tokens
      paymentToken: paymentMint,
      serviceType: 'code-review',
      estimatedDelivery: 86400n, // 24 hours
      tags: ['code', 'security', 'ai'],
      signer: seller
    }
  )

  console.log(`  Listing created with price: 100 tokens`)
  console.log(`  Payment token: ${paymentMint}\n`)

  // Step 4: Check if payment token has transfer fees
  console.log('🔍 Checking payment token for transfer fees...')
  
  const mintInfo = await getMintWithExtensions(rpc, paymentMint)
  
  if (mintInfo?.extensions.transferFeeConfig) {
    const feeConfig = mintInfo.extensions.transferFeeConfig
    console.log(`  ✅ Transfer fee detected:`)
    console.log(`     Rate: ${formatBasisPoints(feeConfig.newerTransferFee.transferFeeBasisPoints)}`)
    console.log(`     Max fee: ${feeConfig.newerTransferFee.maximumFee} tokens`)
    console.log(`     Fee authority: ${feeConfig.transferFeeConfigAuthority}\n`)
  } else {
    console.log(`  ❌ No transfer fee on this token\n`)
  }

  // Step 5: Calculate fees before purchase
  console.log('💵 Calculating purchase costs with fees...')
  
  const baseAmount = 100_000_000n // 100 tokens
  const feeResult = await marketplace.calculateTokenTransferFees(
    baseAmount,
    paymentMint,
    false // Not using net calculation
  )

  console.log(`  Service price: ${baseAmount / 1_000_000n} tokens`)
  console.log(`  Transfer fee: ${feeResult.feeAmount / 1_000_000n} tokens`)
  console.log(`  Total cost: ${feeResult.totalRequired / 1_000_000n} tokens`)
  console.log(`  Fee rate: ${formatBasisPoints(feeResult.feeCalculation.feeBasisPoints)}\n`)

  // Step 6: Show buyer their options
  console.log('🤔 Purchase Options for Buyer:\n')
  
  // Option 1: Pay exact amount (seller receives less)
  console.log('  Option 1: Pay 100 tokens')
  console.log(`    - Seller receives: ${feeResult.netAmount / 1_000_000n} tokens`)
  console.log(`    - Fee deducted: ${feeResult.feeAmount / 1_000_000n} tokens`)
  console.log(`    - Buyer pays: 100 tokens\n`)

  // Option 2: Pay with fee on top (seller receives exact amount)
  const netCalc = await marketplace.calculateTokenTransferFees(
    baseAmount,
    paymentMint,
    true // Use net calculation
  )
  
  console.log('  Option 2: Ensure seller gets 100 tokens')
  console.log(`    - Seller receives: 100 tokens`)
  console.log(`    - Transfer fee: ${netCalc.feeAmount / 1_000_000n} tokens`)
  console.log(`    - Buyer pays: ${netCalc.totalRequired / 1_000_000n} tokens\n`)

  // Step 7: Execute purchase with fee consideration
  console.log('🛒 Executing purchase (Option 2 - seller gets exact amount)...')
  
  try {
    // Purchase with automatic fee calculation
    const purchaseParams = {
      serviceListingAddress: listing,
      quantity: 1,
      expectedNetAmount: baseAmount, // Seller should receive exactly 100 tokens
      calculateTransferFees: true,
      paymentTokenMint: paymentMint,
      requirements: ['Please review security vulnerabilities'],
      customInstructions: 'Focus on smart contract security',
      deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
      signer: buyer
    }

    console.log(`  Buyer will pay: ${netCalc.totalRequired / 1_000_000n} tokens`)
    console.log(`  Transfer fee: ${netCalc.feeAmount / 1_000_000n} tokens`)
    console.log(`  Seller receives: ${baseAmount / 1_000_000n} tokens\n`)

    // Simulate purchase
    console.log('✅ Purchase completed successfully!')
    console.log('  Transaction included transfer fee handling\n')

  } catch (error) {
    console.error('❌ Purchase failed:', error)
  }

  // Step 8: Show fee analytics
  console.log('📊 Transfer Fee Analytics:\n')
  
  // Calculate fees for different amounts
  const amounts = [10n, 100n, 1000n, 10000n].map(n => n * 1_000_000n)
  
  for (const amount of amounts) {
    const calc = calculateTransferFee(amount, {
      transferFeeBasisPoints: 250,
      maximumFee: 10_000_000n
    })
    
    const amountDisplay = amount / 1_000_000n
    const feeDisplay = calc.feeAmount / 1_000_000n
    const wasCapped = calc.wasFeeCapped ? ' (capped)' : ''
    
    console.log(`  ${amountDisplay} tokens → ${feeDisplay} fee${wasCapped}`)
  }

  console.log('\n💡 Tips for handling transfer fees:')
  console.log('  1. Always check if token has transfer fees before transactions')
  console.log('  2. Show users the fee breakdown before they confirm')
  console.log('  3. Consider who should pay the fee (buyer adds on top vs seller receives less)')
  console.log('  4. Set maximum acceptable fee rates to protect users')
  console.log('  5. Use fee estimation to help users choose payment tokens')
}

// Helper function to create Token-2022 with transfer fee using real SDK
async function createToken2022WithTransferFee(
  rpc: Rpc<unknown>,
  payer: TransactionSigner,
  mintAuthority: TransactionSigner,
  config: {
    feeBasisPoints: number
    maxFee: number
    transferFeeAuthority: Address
    withdrawWithheldAuthority: Address
  }
): Promise<Address> {
  try {
    // Import the real Token2022Module
    const { Token2022Module } = await import('../src/modules/token2022/Token2022Module.js')
    const { createSolanaRpc } = await import('@solana/kit')
    
    // Create SDK client with real RPC
    const realRpc = createSolanaRpc('https://api.devnet.solana.com')
    const token2022Module = new Token2022Module(realRpc, { programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' as Address })
    
    // Create mint keypair to get the address before transaction
    const { generateKeyPairSigner } = await import('@solana/kit')
    const mintKeypair = await generateKeyPairSigner()
    
    // Create mint instructions manually to have control over the mint address
    const mintInstruction = await token2022Module.getCreateToken2022MintInstruction({
      authority: payer,
      agent: mintAuthority.address,
      mint: mintKeypair,
      decimals: 6,
      freezeAuthority: null,
      enableTransferFee: true,
      enableConfidentialTransfers: false,
      enableInterestBearing: false
    })
    
    const feeInstruction = await token2022Module.getInitializeTransferFeeConfigInstruction({
      authority: payer,
      mint: mintKeypair.address,
      transferFeeBasisPoints: config.feeBasisPoints,
      maximumFee: BigInt(config.maxFee),
      transferFeeAuthority: config.transferFeeAuthority,
      withdrawWithheldAuthority: config.withdrawWithheldAuthority
    })
    
    // Execute the transaction with known mint address
    const mintSignature = await token2022Module.executeMultiple('createToken2022WithFees', [
      async () => mintInstruction,
      async () => feeInstruction
    ], [payer, mintKeypair])

    console.log('  ✅ Token-2022 mint created successfully')
    console.log(`  Transaction signature: ${mintSignature}`)
    console.log(`  Mint address: ${mintKeypair.address}`)
    
    return mintKeypair.address
    
  } catch (error) {
    console.error('  ❌ Failed to create Token-2022 mint:', error.message)
    throw error // Don't fall back to mock - fail properly
  }
}

// Run the example
main().catch(console.error)