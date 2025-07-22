#!/usr/bin/env tsx
/**
 * Test script to debug auction constraint error 0x1c20
 */

import { createSolanaRpc, createKeyPairSignerFromBytes, address, Address } from '@solana/kit'
import { GhostSpeakClient, AuctionType } from '@ghostspeak/sdk'
import { promises as fs } from 'fs'
import path from 'path'

const RPC_URL = 'https://api.devnet.solana.com'
const PROGRAM_ID = 'AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR'

async function testAuctionConstraint() {
  try {
    // Load wallet - try multiple paths
    const paths = [
      path.join(process.env.HOME || '', '.config', 'solana', 'id.json'),
      path.join(process.env.HOME || '', '.config', 'solana', 'ghostspeak-cli.json')
    ]
    
    let wallet: any
    for (const walletPath of paths) {
      try {
        const walletData = JSON.parse(await fs.readFile(walletPath, 'utf-8')) as number[]
        wallet = await createKeyPairSignerFromBytes(new Uint8Array(walletData))
        console.log(`✅ Loaded wallet from: ${walletPath}`)
        break
      } catch {
        // Try next path
      }
    }
    
    if (!wallet) {
      throw new Error('No wallet found')
    }
    
    console.log('🔧 Testing auction constraint fix...')
    console.log(`📋 Wallet: ${wallet.address}`)
    
    // Initialize client
    const rpc = createSolanaRpc(RPC_URL)
    const client = new GhostSpeakClient({
      rpc: rpc as any,
      programId: address(PROGRAM_ID),
      defaultFeePayer: wallet.address,
      commitment: 'confirmed',
      cluster: 'devnet',
      rpcEndpoint: RPC_URL
    })
    
    // Step 1: Create an agent first (required for auction)
    console.log('\n1️⃣ Creating agent...')
    const agentAddress = await client.agent.create(wallet, {
      name: 'Agent',
      description: 'Test',
      category: 'automation',
      capabilities: ['test'],
      metadataUri: 'https://test.com/meta.json', // Use external URI to avoid data limit
      serviceEndpoint: 'https://test.com'
    })
    console.log(`✅ Agent created: ${agentAddress}`)
    
    // Wait a bit for confirmation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Step 2: Create auction
    console.log('\n2️⃣ Creating auction...')
    const auctionAddress = await client.auction.create(wallet, {
      title: 'Test Auction',
      description: 'Testing constraint fix',
      category: 'data-analysis',
      requirements: ['Test requirement'],
      startPrice: BigInt(0.05 * 1_000_000_000), // 0.05 SOL
      minIncrement: BigInt(0.005 * 1_000_000_000), // 0.005 SOL
      duration: BigInt(3600), // 1 hour
      paymentToken: address('So11111111111111111111111111111111111111112'),
      agentAddress: agentAddress as Address
    })
    console.log(`✅ Auction created: ${auctionAddress}`)
    
    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Step 3: Place bid (this is where the constraint error happens)
    console.log('\n3️⃣ Placing bid...')
    try {
      const signature = await client.auction.placeBid(
        wallet,
        auctionAddress as Address,
        BigInt(0.06 * 1_000_000_000) // 0.06 SOL
      )
      console.log(`✅ Bid placed successfully! Signature: ${signature}`)
    } catch (error) {
      console.error('❌ Bid placement failed:', error)
      
      // Fetch auction details to debug
      console.log('\n🔍 Fetching auction details for debugging...')
      const auction = await client.auction.getAccount(auctionAddress as Address)
      if (auction) {
        console.log('Auction details:')
        console.log(`  Status: ${auction.status}`)
        console.log(`  Agent: ${auction.agent}`)
        console.log(`  Creator: ${auction.creator}`)
        console.log(`  Current Price: ${auction.currentPrice}`)
        console.log(`  Starting Price: ${auction.startingPrice}`)
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testAuctionConstraint().catch(console.error)