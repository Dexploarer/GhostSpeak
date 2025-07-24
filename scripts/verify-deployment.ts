#!/usr/bin/env tsx
/**
 * Verify GhostSpeak deployment status
 * 
 * Usage: npm run verify:deployment
 */

import { execSync } from 'child_process'
import chalk from 'chalk'
import { createSolanaRpc, address } from '@solana/kit'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

async function verifyDeployment() {
  console.log(chalk.blue('🔍 Verifying GhostSpeak deployment...\n'))
  
  try {
    // Get program ID from anchor
    const programIdOutput = execSync('anchor keys list', { encoding: 'utf-8' }).trim()
    const programId = programIdOutput.split(':')[1]?.trim()
    
    if (!programId) {
      throw new Error('Could not determine program ID from anchor keys')
    }
    
    console.log(chalk.cyan(`📋 Program ID: ${programId}`))
    
    // Check IDL file
    const idlPath = join(process.cwd(), 'target', 'idl', 'ghostspeak.json')
    if (existsSync(idlPath)) {
      const idl = JSON.parse(readFileSync(idlPath, 'utf-8'))
      console.log(chalk.green(`✅ IDL found: ${idl.name} v${idl.version}`))
    } else {
      console.log(chalk.yellow('⚠️  IDL file not found'))
    }
    
    // Connect to cluster
    const cluster = process.env.ANCHOR_PROVIDER_URL || 'https://api.devnet.solana.com'
    console.log(chalk.cyan(`🌐 Cluster: ${cluster}`))
    
    const rpc = createSolanaRpc(cluster)
    
    // Check if program is deployed
    try {
      // Use base64 encoding to avoid base58 encoding errors with large account data
      const accountInfo = await rpc.getAccountInfo(address(programId), {
        encoding: 'base64'
      }).send()
      
      if (accountInfo.value) {
        console.log(chalk.green('✅ Program is deployed'))
        console.log(chalk.gray(`   Owner: ${accountInfo.value.owner}`))
        console.log(chalk.gray(`   Executable: ${accountInfo.value.executable}`))
        
        // Calculate actual data size from base64 encoding
        const dataSize = accountInfo.value.data[0] ? 
          Buffer.from(accountInfo.value.data[0], 'base64').length : 0
        console.log(chalk.gray(`   Size: ${dataSize} bytes`))
        console.log(chalk.gray(`   Lamports: ${accountInfo.value.lamports}`))
      } else {
        console.log(chalk.red('❌ Program not found on chain'))
      }
    } catch (error) {
      console.log(chalk.red('❌ Failed to fetch program account'))
      console.error(error)
    }
    
    // Check wallet balance
    try {
      const walletPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`
      if (existsSync(walletPath)) {
        const walletData = JSON.parse(readFileSync(walletPath, 'utf-8'))
        // Extract public key from keypair (first 32 bytes)
        const publicKeyBytes = walletData.slice(32, 64)
        const publicKeyBase58 = Buffer.from(publicKeyBytes).toString('base64')
        
        // Note: In a real implementation, you'd properly decode the public key
        console.log(chalk.cyan('\n💰 Wallet found'))
        console.log(chalk.gray(`   Path: ${walletPath}`))
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not check wallet'))
    }
    
    // Check recent transactions
    console.log(chalk.cyan('\n📊 Recent Program Activity:'))
    try {
      const signatures = await rpc.getSignaturesForAddress(
        address(programId),
        { limit: 5 }
      ).send()
      
      if (signatures.length > 0) {
        console.log(chalk.green(`✅ Found ${signatures.length} recent transactions`))
        signatures.forEach((sig, i) => {
          const time = sig.blockTime ? new Date(sig.blockTime * 1000).toLocaleString() : 'Unknown'
          const status = sig.err ? chalk.red('Failed') : chalk.green('Success')
          console.log(chalk.gray(`   ${i + 1}. ${sig.signature.slice(0, 20)}... - ${status} - ${time}`))
        })
      } else {
        console.log(chalk.yellow('⚠️  No recent transactions found'))
      }
    } catch (error) {
      console.log(chalk.red('❌ Failed to fetch recent transactions'))
    }
    
    console.log(chalk.blue('\n✨ Verification complete!'))
    
  } catch (error) {
    console.error(chalk.red('❌ Verification failed:'), error)
    process.exit(1)
  }
}

// Run verification
verifyDeployment().catch(console.error)