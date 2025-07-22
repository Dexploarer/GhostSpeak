#!/usr/bin/env tsx

import { createKeyPairSignerFromBytes } from '@solana/kit'
import { address } from '@solana/addresses'
import { promises as fs } from 'fs'
import path from 'path'
import { GhostSpeakClient } from '../packages/sdk-typescript/src/index.js'
import { createSolanaRpc } from '@solana/rpc'

async function testBase58Issue() {
  console.log('🧪 Testing Base58 encoding issue...\n')
  
  // Load wallet
  const walletPath = path.join(process.env.HOME || '', '.config', 'solana', 'id.json')
  const walletData = JSON.parse(await fs.readFile(walletPath, 'utf-8')) as number[]
  const wallet = await createKeyPairSignerFromBytes(new Uint8Array(walletData))
  
  console.log(`Wallet address: ${wallet.address}`)
  
  // Create client
  const RPC_URL = 'https://api.devnet.solana.com'
  const PROGRAM_ID = 'AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR'
  
  const rpc = createSolanaRpc(RPC_URL)
  const client = new GhostSpeakClient({
    rpc: rpc as any,
    programId: address(PROGRAM_ID),
    defaultFeePayer: wallet.address,
    commitment: 'confirmed',
    cluster: 'devnet',
    rpcEndpoint: RPC_URL
  })
  
  // Test 1: Simple agent registration with minimal data
  console.log('\n📝 Test 1: Simple agent registration')
  try {
    const result = await client.agent.register(wallet, {
      agentType: 1,
      metadataUri: 'test',  // Simple string without special chars
      agentId: 'test123'
    })
    console.log('✅ Success:', result)
  } catch (error: any) {
    console.log('❌ Error:', error.message)
    if (error.context) {
      console.log('   Context:', error.context)
    }
  }
  
  // Test 2: Agent registration with URL
  console.log('\n📝 Test 2: Agent registration with URL')
  try {
    const result = await client.agent.register(wallet, {
      agentType: 1,
      metadataUri: 'https://test.com/metadata.json',
      agentId: 'test456'
    })
    console.log('✅ Success:', result)
  } catch (error: any) {
    console.log('❌ Error:', error.message)
    if (error.context) {
      console.log('   Context:', error.context)
    }
  }
  
  // Test 3: Agent registration with data URI
  console.log('\n📝 Test 3: Agent registration with data URI')
  try {
    const result = await client.agent.register(wallet, {
      agentType: 1,
      metadataUri: 'data:application/json;base64,eyJ0ZXN0IjoidGVzdCJ9',
      agentId: 'test789'
    })
    console.log('✅ Success:', result)
  } catch (error: any) {
    console.log('❌ Error:', error.message)
    if (error.context) {
      console.log('   Context:', error.context)
    }
  }
}

testBase58Issue().catch(console.error)