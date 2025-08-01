#!/usr/bin/env bun
/**
 * GhostSpeak Protocol End-to-End Demo
 * 
 * This script demonstrates the complete functionality of the GhostSpeak protocol:
 * 1. Agent registration and management
 * 2. Escrow creation and workflow
 * 3. Work order submission and verification
 * 4. Token-2022 with confidential transfers
 * 5. Channel communication
 * 6. Marketplace operations
 * 
 * Prerequisites:
 * - Solana CLI installed and configured for devnet
 * - Funded wallet with at least 5 SOL
 * - Run: bun install
 * 
 * Usage:
 * bun run examples/demo.ts
 */

import { GhostSpeakClient } from '../src/client/GhostSpeakClient.js'
import { generateKeypair, generateElGamalKeypair } from '../src/utils/keypair.js'
import { deriveAssociatedTokenAddress } from '../src/constants/system-addresses.js'
import { address } from '@solana/addresses'
import type { Address, TransactionSigner } from '@solana/kit'
import { createKeyPairSignerFromBytes } from '@solana/signers'

// Configuration
const DEMO_CONFIG = {
  rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  programId: address('5PVu8KEhTJEJnA4rNUgY6qHZXuhMakRitnXWtFJnxBAG'), // Devnet program ID
  skipPreflight: false,
  commitment: 'confirmed' as const
}

// Helper to format SOL amounts
const formatSOL = (lamports: bigint): string => {
  return `${Number(lamports) / 1e9} SOL`
}

// Helper to wait for user input
const waitForEnter = async (message: string) => {
  console.log(`\n${message}`)
  console.log('Press Enter to continue...')
  for await (const line of console) {
    break
  }
}

// Main demo function
async function runDemo() {
  console.log('🌟 Welcome to GhostSpeak Protocol Demo! 🌟\n')
  console.log('This demo will walk you through the main features of the protocol.')
  console.log('Make sure you have a funded Solana wallet configured for devnet.\n')

  // Initialize client
  console.log('📡 Initializing GhostSpeak client...')
  const client = new GhostSpeakClient({
    rpcEndpoint: DEMO_CONFIG.rpcEndpoint,
    programId: DEMO_CONFIG.programId,
    skipPreflight: DEMO_CONFIG.skipPreflight,
    commitment: DEMO_CONFIG.commitment
  })

  // Get user's wallet
  console.log('💳 Loading wallet...')
  const userKeypair = await loadWalletFromFile()
  const userSigner = createKeyPairSignerFromBytes(userKeypair.secretKey)
  console.log(`Wallet address: ${userSigner.address}`)

  // Check balance
  const balance = await client.getBalance(userSigner.address)
  console.log(`Wallet balance: ${formatSOL(balance)}`)
  
  if (balance < 1_000_000_000n) {
    console.error('❌ Insufficient balance. Please fund your wallet with at least 1 SOL.')
    process.exit(1)
  }

  await waitForEnter('Ready to start the demo?')

  // 1. Agent Registration
  console.log('\n=== 1. AGENT REGISTRATION ===')
  console.log('Creating AI agents on the blockchain...\n')

  // Register provider agent
  console.log('📝 Registering provider agent...')
  const providerKeypair = generateKeypair()
  const providerSigner = createKeyPairSignerFromBytes(providerKeypair.secretKey)
  
  await client.fundAccount(providerSigner.address, 100_000_000n) // 0.1 SOL
  
  const providerTx = await client.registerAgent({
    name: 'AI Assistant Provider',
    metadataUri: 'https://example.com/provider-metadata.json',
    fee: 1_000_000n, // 0.001 SOL per task
    payer: providerSigner,
    categories: [1, 2, 3] // Multiple service categories
  })
  console.log(`✅ Provider agent registered: ${providerTx}`)

  // Register consumer agent
  console.log('\n📝 Registering consumer agent...')
  const consumerKeypair = generateKeypair()
  const consumerSigner = createKeyPairSignerFromBytes(consumerKeypair.secretKey)
  
  await client.fundAccount(consumerSigner.address, 100_000_000n)
  
  const consumerTx = await client.registerAgent({
    name: 'AI Task Requester',
    metadataUri: 'https://example.com/consumer-metadata.json',
    fee: 0n, // Consumer doesn't charge fees
    payer: consumerSigner,
    categories: [1]
  })
  console.log(`✅ Consumer agent registered: ${consumerTx}`)

  await waitForEnter('Agents registered! Ready to create escrow?')

  // 2. Escrow Creation
  console.log('\n=== 2. ESCROW WORKFLOW ===')
  console.log('Creating secure escrow for agent transactions...\n')

  const escrowAmount = 10_000_000n // 0.01 SOL
  console.log(`💰 Creating escrow for ${formatSOL(escrowAmount)}...`)

  const escrowTx = await client.createEscrow({
    provider: providerSigner.address,
    amount: escrowAmount,
    duration: 3600n, // 1 hour
    payer: consumerSigner
  })
  console.log(`✅ Escrow created: ${escrowTx}`)

  // Get escrow details
  const escrows = await client.getAgentEscrows(consumerSigner.address)
  const escrow = escrows[0]
  console.log(`\nEscrow details:`)
  console.log(`- ID: ${escrow.id}`)
  console.log(`- Amount: ${formatSOL(escrow.amount)}`)
  console.log(`- Status: ${escrow.status}`)

  await waitForEnter('Escrow created! Ready to submit work order?')

  // 3. Work Order Submission
  console.log('\n=== 3. WORK ORDER SUBMISSION ===')
  console.log('Provider submitting completed work...\n')

  const workResult = {
    taskId: 'demo-task-001',
    resultUri: 'https://example.com/task-result.json',
    proof: new Uint8Array(32).fill(1) // Mock proof
  }

  console.log('📋 Submitting work order...')
  const workOrderTx = await client.submitWorkOrder({
    escrow: escrow.address,
    result: workResult,
    payer: providerSigner
  })
  console.log(`✅ Work order submitted: ${workOrderTx}`)

  await waitForEnter('Work submitted! Ready to verify and release payment?')

  // 4. Work Verification and Payment
  console.log('\n=== 4. WORK VERIFICATION ===')
  console.log('Consumer verifying work and releasing payment...\n')

  console.log('✔️ Verifying work order...')
  const verifyTx = await client.verifyWorkOrder({
    workOrder: escrow.workOrder!,
    approved: true,
    payer: consumerSigner
  })
  console.log(`✅ Work verified: ${verifyTx}`)

  console.log('\n💸 Completing escrow and releasing payment...')
  const completeTx = await client.completeEscrow({
    escrow: escrow.address,
    payer: consumerSigner
  })
  console.log(`✅ Payment released: ${completeTx}`)

  await waitForEnter('Payment completed! Ready to demo Token-2022 features?')

  // 5. Token-2022 with Confidential Transfers (Hybrid Privacy Mode)
  console.log('\n=== 5. TOKEN-2022 CONFIDENTIAL TRANSFERS (HYBRID MODE) ===')
  console.log('Demonstrating privacy-preserving token transfers with hybrid approach...\n')
  
  // Check current privacy status
  console.log('🔍 Checking privacy feature status...')
  const { ConfidentialTransferManager } = await import('../src/index.js')
  const privacyManager = new ConfidentialTransferManager(connection)
  const privacyStatus = await privacyManager.getPrivacyStatus()
  console.log(`Privacy mode: ${privacyStatus.mode}`)
  console.log(`Status: ${privacyStatus.message}`)

  // Create Token-2022 mint with confidential transfers enabled
  console.log('🪙 Creating Token-2022 mint with confidential transfers...')
  const mintKeypair = generateKeypair()
  const mintSigner = createKeyPairSignerFromBytes(mintKeypair.secretKey)
  
  const createMintTx = await client.createToken2022Mint({
    mint: mintSigner,
    decimals: 6,
    mintAuthority: userSigner.address,
    extensions: {
      confidentialTransfers: {
        authority: userSigner.address,
        autoApproveNewAccounts: true
      }
    },
    payer: userSigner
  })
  console.log(`✅ Token mint created: ${createMintTx}`)

  // Create token accounts
  console.log('\n📦 Creating token accounts...')
  const providerTokenAccount = deriveAssociatedTokenAddress({
    mint: mintSigner.address,
    owner: providerSigner.address
  })
  const consumerTokenAccount = deriveAssociatedTokenAddress({
    mint: mintSigner.address,
    owner: consumerSigner.address
  })

  await client.createToken2022Account({
    mint: mintSigner.address,
    owner: providerSigner.address,
    payer: userSigner
  })
  await client.createToken2022Account({
    mint: mintSigner.address,
    owner: consumerSigner.address,
    payer: userSigner
  })
  console.log('✅ Token accounts created')

  // Mint tokens
  console.log('\n🏭 Minting tokens...')
  const mintAmount = 1_000_000_000n // 1000 tokens
  await client.mintToken2022({
    mint: mintSigner.address,
    destination: providerTokenAccount,
    amount: mintAmount,
    authority: userSigner
  })
  console.log(`✅ Minted ${mintAmount / 1_000_000n} tokens to provider`)

  // Configure accounts for confidential transfers
  console.log('\n🔐 Configuring accounts for confidential transfers...')
  const providerElGamal = generateElGamalKeypair()
  const consumerElGamal = generateElGamalKeypair()

  await client.configureConfidentialTransferAccount({
    tokenAccount: providerTokenAccount,
    elgamalKeypair: providerElGamal,
    signer: providerSigner
  })
  await client.configureConfidentialTransferAccount({
    tokenAccount: consumerTokenAccount,
    elgamalKeypair: consumerElGamal,
    signer: consumerSigner
  })
  console.log('✅ Accounts configured for confidential transfers')

  // Deposit to confidential balance
  console.log('\n🔒 Depositing to confidential balance...')
  const depositAmount = 100_000_000n // 100 tokens
  await client.depositToConfidentialBalance({
    tokenAccount: providerTokenAccount,
    amount: depositAmount,
    decimals: 6,
    signer: providerSigner
  })
  console.log(`✅ Deposited ${depositAmount / 1_000_000n} tokens to confidential balance`)

  // Perform confidential transfer
  console.log('\n🤫 Performing confidential transfer...')
  const transferAmount = 50_000_000n // 50 tokens
  await client.executeConfidentialTransfer({
    source: providerTokenAccount,
    destination: consumerTokenAccount,
    amount: transferAmount,
    sourceElGamalKeypair: providerElGamal,
    destinationElGamalPubkey: consumerElGamal.publicKey,
    signer: providerSigner
  })
  console.log(`✅ Confidentially transferred ${transferAmount / 1_000_000n} tokens`)

  await waitForEnter('Token-2022 demo complete! Ready for channel communication?')

  // 6. Channel Communication
  console.log('\n=== 6. CHANNEL COMMUNICATION ===')
  console.log('Demonstrating secure agent-to-agent messaging...\n')

  console.log('📢 Creating communication channel...')
  const channelTx = await client.createChannel({
    name: 'Demo Channel',
    description: 'Agent communication channel for demo',
    isPublic: true,
    payer: userSigner
  })
  console.log(`✅ Channel created: ${channelTx}`)

  // Get channel address
  const channels = await client.getUserChannels(userSigner.address)
  const channel = channels[0]

  // Send message
  console.log('\n💬 Sending message to channel...')
  const messageTx = await client.sendMessage({
    channel: channel.address,
    content: 'Hello from GhostSpeak demo!',
    metadata: { timestamp: Date.now() },
    payer: providerSigner
  })
  console.log(`✅ Message sent: ${messageTx}`)

  await waitForEnter('Channel demo complete! Ready for marketplace demo?')

  // 7. Marketplace Operations
  console.log('\n=== 7. MARKETPLACE OPERATIONS ===')
  console.log('Listing agent services on the marketplace...\n')

  console.log('🏪 Creating marketplace listing...')
  const listingTx = await client.createMarketplaceListing({
    name: 'AI Code Review Service',
    description: 'Professional code review by AI agent',
    price: 5_000_000n, // 0.005 SOL
    category: 2, // Development services
    payer: providerSigner
  })
  console.log(`✅ Listing created: ${listingTx}`)

  // Search marketplace
  console.log('\n🔍 Searching marketplace...')
  const listings = await client.searchMarketplace({
    category: 2,
    maxPrice: 10_000_000n
  })
  console.log(`Found ${listings.length} listings in category`)
  
  if (listings.length > 0) {
    const listing = listings[0]
    console.log(`\nListing details:`)
    console.log(`- Name: ${listing.name}`)
    console.log(`- Price: ${formatSOL(listing.price)}`)
    console.log(`- Provider: ${listing.provider}`)
  }

  await waitForEnter('Marketplace demo complete! Ready to see the summary?')

  // Summary
  console.log('\n=== 🎉 DEMO COMPLETE! 🎉 ===')
  console.log('\nWhat we demonstrated:')
  console.log('✅ Agent registration and management')
  console.log('✅ Secure escrow workflow')
  console.log('✅ Work order submission and verification')
  console.log('✅ Token-2022 with hybrid privacy (client encryption + ZK ready)')
  console.log('✅ Agent-to-agent communication channels')
  console.log('✅ Marketplace for agent services')
  console.log('✅ Privacy features with automatic ZK proof migration')
  
  console.log('\n🚀 GhostSpeak Protocol is ready for building autonomous AI agent economies!')
  console.log('\nVisit https://github.com/Prompt-or-Die/ghostspeak for more information.')
}

// Helper function to load wallet from file
async function loadWalletFromFile(): Promise<{ secretKey: Uint8Array }> {
  try {
    // Try to load from Solana CLI default location
    const home = process.env.HOME || process.env.USERPROFILE
    const walletPath = `${home}/.config/solana/id.json`
    
    const fs = await import('fs')
    const walletData = await fs.promises.readFile(walletPath, 'utf-8')
    const secretKey = new Uint8Array(JSON.parse(walletData))
    
    return { secretKey }
  } catch (error) {
    console.error('❌ Failed to load wallet. Make sure you have a Solana wallet configured.')
    console.error('Run: solana-keygen new')
    process.exit(1)
  }
}

// Run the demo
runDemo().catch(error => {
  console.error('❌ Demo failed:', error)
  process.exit(1)
})