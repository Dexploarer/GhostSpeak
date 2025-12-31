/**
 * Mint Devnet GHOST Token
 *
 * Creates a devnet SPL token to test GhostSpeak staking and authorization features.
 * Mainnet GHOST: DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump
 *
 * Run: bun run scripts/mint-devnet-ghost.ts
 */

import { Keypair, Connection, PublicKey } from '@solana/web3.js'
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getMint,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { loadDevnetKeypair } from '../tests/utils/test-signers.js'
import fs from 'fs'
import path from 'path'

async function main() {
  console.log('🪙 Minting Devnet GHOST Token')
  console.log('='.repeat(60))

  // Load devnet wallet
  const payer = loadDevnetKeypair()
  const connection = new Connection(
    process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
  )

  console.log('\n📍 Configuration:')
  console.log('  Payer:', payer.publicKey.toBase58())
  console.log('  Network: devnet')
  console.log('  RPC:', connection.rpcEndpoint)

  // Check SOL balance
  const balance = await connection.getBalance(payer.publicKey)
  console.log(`  SOL Balance: ${balance / 1e9} SOL`)

  if (balance < 0.1e9) {
    console.error('\n❌ Insufficient SOL! Need at least 0.1 SOL.')
    console.log('   Airdrop: solana airdrop 2 --url devnet')
    process.exit(1)
  }

  // Token configuration (matching typical pump.fun tokens)
  const DECIMALS = 6 // Standard for pump.fun tokens
  const INITIAL_SUPPLY = 1_000_000 // 1 million GHOST tokens for testing
  const SUPPLY_WITH_DECIMALS = BigInt(INITIAL_SUPPLY) * BigInt(10 ** DECIMALS)

  console.log('\n💎 Token Configuration:')
  console.log('  Name: GHOST (Devnet)')
  console.log('  Decimals:', DECIMALS)
  console.log(`  Initial Supply: ${INITIAL_SUPPLY.toLocaleString()} GHOST`)
  console.log('  Mint Authority: Devnet wallet')
  console.log('  Freeze Authority: None (matches mainnet)')

  // Check if devnet GHOST token already exists
  const configPath = path.join(process.cwd(), '.devnet-ghost.json')
  let mintAddress: PublicKey | null = null

  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    console.log('\n🔍 Found existing devnet GHOST config:')
    console.log('  Mint:', config.mint)

    try {
      mintAddress = new PublicKey(config.mint)
      const mintInfo = await getMint(connection, mintAddress)
      console.log('  ✅ Token mint exists on-chain')
      console.log('  Supply:', Number(mintInfo.supply) / 10 ** DECIMALS, 'GHOST')
      console.log('\n❓ Using existing mint. Delete .devnet-ghost.json to create new.')
    } catch (error) {
      console.log('  ⚠️  Mint not found on-chain, creating new...')
      mintAddress = null
    }
  }

  // Create new mint if needed
  if (!mintAddress) {
    console.log('\n📝 Creating new GHOST token mint...')

    mintAddress = await createMint(
      connection,
      payer,
      payer.publicKey, // Mint authority
      null, // Freeze authority (null = no freeze, like pump.fun tokens)
      DECIMALS,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    )

    console.log('  ✅ Token mint created!')
    console.log('  Mint Address:', mintAddress.toBase58())

    // Save mint address
    fs.writeFileSync(configPath, JSON.stringify({
      mint: mintAddress.toBase58(),
      decimals: DECIMALS,
      initialSupply: INITIAL_SUPPLY,
      createdAt: new Date().toISOString(),
      network: 'devnet',
      mainnetGhost: 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump'
    }, null, 2))

    console.log('  💾 Config saved to .devnet-ghost.json')
  }

  // Get or create token account
  console.log('\n💰 Setting up token account...')

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mintAddress,
    payer.publicKey
  )

  console.log('  Token Account:', tokenAccount.address.toBase58())
  console.log('  Current Balance:', Number(tokenAccount.amount) / 10 ** DECIMALS, 'GHOST')

  // Mint tokens if needed
  if (tokenAccount.amount === BigInt(0)) {
    console.log('\n🏭 Minting initial supply...')

    const signature = await mintTo(
      connection,
      payer,
      mintAddress,
      tokenAccount.address,
      payer.publicKey,
      SUPPLY_WITH_DECIMALS
    )

    console.log('  ✅ Tokens minted!')
    console.log(`  Amount: ${INITIAL_SUPPLY.toLocaleString()} GHOST`)
    console.log('  Transaction:', signature)
    console.log('  Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`)
  } else {
    console.log('  ℹ️  Token account already has balance, skipping mint')
  }

  // Final status
  const finalMintInfo = await getMint(connection, mintAddress)
  const finalTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mintAddress,
    payer.publicKey
  )

  console.log('\n✅ Devnet GHOST Token Ready!')
  console.log('='.repeat(60))
  console.log('  Mint Address:', mintAddress.toBase58())
  console.log('  Total Supply:', Number(finalMintInfo.supply) / 10 ** DECIMALS, 'GHOST')
  console.log('  Your Balance:', Number(finalTokenAccount.amount) / 10 ** DECIMALS, 'GHOST')
  console.log('  Decimals:', DECIMALS)
  console.log('\n💡 Next Steps:')
  console.log('  1. Use this mint address in staking tests')
  console.log('  2. Create staking account with >= 1,000 GHOST')
  console.log('  3. Register agents on devnet')
  console.log('  4. Test on-chain authorization storage')
  console.log('\n📋 Add to .env.test:')
  console.log(`  DEVNET_GHOST_MINT=${mintAddress.toBase58()}`)
  console.log(`  DEVNET_GHOST_DECIMALS=${DECIMALS}`)
}

main().catch(error => {
  console.error('\n💥 Error:', error)
  process.exit(1)
})
