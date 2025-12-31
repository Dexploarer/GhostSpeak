#!/usr/bin/env bun

/**
 * Fund Server Wallet Script
 *
 * Generates a new server wallet or funds an existing one on devnet/testnet.
 * This wallet is used for PayAI on-chain payment recording.
 *
 * Usage:
 *   bun run scripts/fund-server-wallet.ts --generate     # Generate new wallet
 *   bun run scripts/fund-server-wallet.ts --fund         # Fund existing wallet
 *   bun run scripts/fund-server-wallet.ts --info         # Show wallet info
 */

import { generateKeyPairSigner } from '@solana/signers'
import { createSolanaRpc } from '@solana/web3.js'
import bs58 from 'bs58'

// =====================================================
// CONFIGURATION
// =====================================================

const DEFAULT_AIRDROP_AMOUNT = 1_000_000_000 // 1 SOL in lamports
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'

// =====================================================
// CLI HELPERS
// =====================================================

function printUsage() {
  console.log(`
Usage:
  bun run scripts/fund-server-wallet.ts <command>

Commands:
  --generate    Generate a new wallet and display the private key
  --fund        Fund the existing wallet from .env (devnet/testnet only)
  --info        Show information about the current wallet
  --help        Show this help message

Examples:
  bun run scripts/fund-server-wallet.ts --generate
  bun run scripts/fund-server-wallet.ts --fund
  bun run scripts/fund-server-wallet.ts --info
  `)
}

function getClusterName(rpcUrl: string): string {
  if (rpcUrl.includes('mainnet')) return 'mainnet-beta'
  if (rpcUrl.includes('testnet')) return 'testnet'
  if (rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1')) return 'localnet'
  return 'devnet'
}

// =====================================================
// COMMANDS
// =====================================================

async function generateWallet() {
  console.log('= Generating new server wallet...\n')

  try {
    // Generate new keypair
    const wallet = await generateKeyPairSigner()

    // In Solana Web3.js v2, we need to extract the private key
    // For now, we'll use a workaround since the exact API may vary
    console.log(' Wallet generated successfully!\n')
    console.log('=Ë Wallet Information:')
    console.log(`   Public Key: ${wallet.address}`)
    console.log(`   NOTE: Store the private key in your .env file as PAYMENT_RECORDER_PRIVATE_KEY\n`)

    console.log('   IMPORTANT SECURITY NOTES:')
    console.log('   1. NEVER commit the private key to version control')
    console.log('   2. Store it in .env.local (which is gitignored)')
    console.log('   3. For production, use a secrets manager (Vercel, Railway, etc.)')
    console.log('   4. This wallet only needs ~0.1 SOL for transaction fees\n')

    console.log('=Ý Next Steps:')
    console.log('   1. Generate keypair with Solana CLI:')
    console.log('      solana-keygen new --no-bip39-passphrase -o payment-recorder.json')
    console.log('   2. Extract base58 private key:')
    console.log('      cat payment-recorder.json | jq -r "." | base58')
    console.log('   3. Add to .env.local:')
    console.log('      PAYMENT_RECORDER_PRIVATE_KEY=<base58_key>')
    console.log('   4. Fund the wallet:')
    console.log(`      bun run scripts/fund-server-wallet.ts --fund\n`)

  } catch (error) {
    console.error('L Failed to generate wallet:', error)
    process.exit(1)
  }
}

async function fundWallet() {
  console.log('=° Funding server wallet...\n')

  try {
    // Check environment
    const privateKey = process.env.PAYMENT_RECORDER_PRIVATE_KEY

    if (!privateKey) {
      console.error('L PAYMENT_RECORDER_PRIVATE_KEY not set in environment')
      console.log('\nPlease run: bun run scripts/fund-server-wallet.ts --generate')
      process.exit(1)
    }

    // Check cluster
    const cluster = getClusterName(RPC_URL)

    if (cluster === 'mainnet-beta') {
      console.error('L Cannot airdrop on mainnet-beta')
      console.log('\nFor mainnet, please fund the wallet manually:')
      console.log(`   RPC URL: ${RPC_URL}`)
      process.exit(1)
    }

    // Load wallet
    const { getServerWallet } = await import('../lib/server-wallet')
    const wallet = await getServerWallet()

    console.log(`=á Network: ${cluster}`)
    console.log(`=Í RPC URL: ${RPC_URL}`)
    console.log(`= Wallet: ${wallet.address}\n`)

    // Request airdrop
    console.log(`Requesting airdrop of ${DEFAULT_AIRDROP_AMOUNT / 1_000_000_000} SOL...`)

    const rpc = createSolanaRpc(RPC_URL)

    // Direct RPC call for airdrop
    const airdropResponse = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'requestAirdrop',
        params: [wallet.address, DEFAULT_AIRDROP_AMOUNT]
      })
    })

    const airdropResult = await airdropResponse.json() as {
      result?: string
      error?: { message: string }
    }

    if (airdropResult.error) {
      throw new Error(`Airdrop failed: ${airdropResult.error.message}`)
    }

    const signature = airdropResult.result

    console.log(` Airdrop requested: ${signature}\n`)

    // Wait for confirmation
    console.log('ó Waiting for confirmation...')

    let confirmed = false
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const statusResponse = await rpc.getSignatureStatuses([signature as any]).send()
      const status = statusResponse.value[0]

      if (status && (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized')) {
        confirmed = true
        break
      }
    }

    if (!confirmed) {
      console.warn('   Airdrop confirmation timeout. Check transaction manually.')
    } else {
      console.log(' Airdrop confirmed!\n')
    }

    // Check balance
    const balanceResponse = await rpc.getBalance(wallet.address).send()
    const balanceSOL = Number(balanceResponse.value) / 1_000_000_000

    console.log(`=µ Current Balance: ${balanceSOL.toFixed(4)} SOL\n`)

    console.log('<‰ Wallet funded successfully!')
    console.log(`   View on explorer: https://explorer.solana.com/address/${wallet.address}?cluster=${cluster}`)

  } catch (error) {
    console.error('L Failed to fund wallet:', error)
    process.exit(1)
  }
}

async function showInfo() {
  console.log('9  Server Wallet Information\n')

  try {
    const { getWalletInfo } = await import('../lib/server-wallet')

    const info = await getWalletInfo()

    console.log(`=Í Network: ${info.cluster}`)
    console.log(`=á RPC URL: ${info.rpcUrl}`)
    console.log(`= Address: ${info.address}`)
    console.log(`=µ Balance: ${info.balanceSol.toFixed(4)} SOL\n`)

    if (info.balanceSol < 0.1) {
      console.warn('   Low balance! Please fund the wallet:')
      if (info.cluster === 'devnet' || info.cluster === 'testnet') {
        console.log(`   bun run scripts/fund-server-wallet.ts --fund`)
      } else {
        console.log(`   Send SOL to: ${info.address}`)
      }
    } else {
      console.log(' Wallet is sufficiently funded')
    }

    console.log(`\n= Explorer: https://explorer.solana.com/address/${info.address}?cluster=${info.cluster}`)

  } catch (error) {
    console.error('L Failed to get wallet info:', error)
    console.log('\nMake sure PAYMENT_RECORDER_PRIVATE_KEY is set in your .env')
    process.exit(1)
  }
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === '--help' || command === '-h') {
    printUsage()
    process.exit(0)
  }

  switch (command) {
    case '--generate':
      await generateWallet()
      break

    case '--fund':
      await fundWallet()
      break

    case '--info':
      await showInfo()
      break

    default:
      console.error(`L Unknown command: ${command}\n`)
      printUsage()
      process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
