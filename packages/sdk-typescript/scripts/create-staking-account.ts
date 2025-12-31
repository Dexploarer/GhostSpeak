/**
 * Create Staking Account with GHOST Tokens
 *
 * Creates a staking account and stakes GHOST tokens to enable agent registration.
 * Requires: Devnet GHOST tokens from mint-devnet-ghost.ts
 *
 * Run: bun run scripts/create-staking-account.ts
 */

import { GhostSpeakClient } from '../src/core/GhostSpeakClient.js'
import { loadDevnetWallet, loadDevnetKeypair } from '../tests/utils/test-signers.js'
import type { Address } from '@solana/addresses'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token'
import fs from 'fs'
import path from 'path'

async function main() {
  console.log('🔐 Creating Staking Account with GHOST Tokens')
  console.log('='.repeat(60))

  // Load devnet wallet
  const wallet = await loadDevnetWallet()
  const keypair = loadDevnetKeypair()

  console.log('\n📍 Configuration:')
  console.log('  Wallet:', keypair.publicKey.toBase58())
  console.log('  Network: devnet')

  // Load devnet GHOST token config
  const configPath = path.join(process.cwd(), '.devnet-ghost.json')
  if (!fs.existsSync(configPath)) {
    console.error('\n❌ Devnet GHOST token not found!')
    console.log('   Run: bun run scripts/mint-devnet-ghost.ts')
    process.exit(1)
  }

  const ghostConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  const ghostMint = new PublicKey(ghostConfig.mint)

  console.log('  GHOST Mint:', ghostMint.toBase58())
  console.log('  Decimals:', ghostConfig.decimals)

  // Initialize client
  const client = new GhostSpeakClient({
    network: 'devnet',
    rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  })

  // Check GHOST token balance
  const connection = new Connection(
    process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
  )

  const tokenAccount = await getAssociatedTokenAddress(
    ghostMint,
    keypair.publicKey
  )

  try {
    const accountInfo = await getAccount(connection, tokenAccount)
    const balance = Number(accountInfo.amount) / 10 ** ghostConfig.decimals

    console.log('  GHOST Balance:', balance.toLocaleString(), 'GHOST')

    if (balance < 1000) {
      console.error('\n❌ Insufficient GHOST tokens!')
      console.log(`   Need: 1,000 GHOST (you have: ${balance})`)
      console.log('   Run: bun run scripts/mint-devnet-ghost.ts')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ No GHOST token account found!')
    console.log('   Run: bun run scripts/mint-devnet-ghost.ts')
    process.exit(1)
  }

  // Check if staking config exists
  console.log('\n🔍 Checking staking config...')

  const { getProgramDerivedAddress, getBytesEncoder } = await import('@solana/kit')
  const [stakingConfigPda] = await getProgramDerivedAddress({
    programAddress: client.staking.getProgramId(),
    seeds: [
      getBytesEncoder().encode(new Uint8Array([115, 116, 97, 107, 105, 110, 103, 95, 99, 111, 110, 102, 105, 103]))
    ]
  })

  console.log('  Staking Config PDA:', stakingConfigPda)

  const existingConfig = await client.staking.getStakingConfig(stakingConfigPda)

  if (!existingConfig) {
    console.error('\n❌ Staking config not initialized!')
    console.log('   Run: bun run tests/setup/devnet-setup.ts')
    process.exit(1)
  }

  console.log('  ✅ Staking config found')
  console.log('     Min Stake:', Number(existingConfig.minStake) / 10 ** ghostConfig.decimals, 'GHOST')

  // Derive staking vault PDA (where staked tokens are stored)
  console.log('\n📝 Deriving staking vault...')

  const { getAddressEncoder } = await import('@solana/kit')

  const [stakingVaultPda] = await getProgramDerivedAddress({
    programAddress: client.staking.getProgramId(),
    seeds: [
      getBytesEncoder().encode(new Uint8Array([115, 116, 97, 107, 105, 110, 103, 95, 118, 97, 117, 108, 116])), // "staking_vault"
      getAddressEncoder().encode(stakingConfigPda), // Encode address to 32 bytes
    ]
  })

  console.log('  Staking Vault PDA:', stakingVaultPda)

  // Create staking account by staking tokens
  console.log('\n📝 Creating staking account by staking tokens...')

  const STAKE_AMOUNT = 10000 // Stake 10,000 GHOST (10x minimum for testing)
  const STAKE_AMOUNT_WITH_DECIMALS = BigInt(STAKE_AMOUNT) * BigInt(10 ** ghostConfig.decimals)
  const LOCK_DURATION = BigInt(90 * 24 * 60 * 60) // 90 days lock

  console.log(`  Staking Amount: ${STAKE_AMOUNT.toLocaleString()} GHOST`)
  console.log(`  Lock Duration: 90 days`)

  try {
    const signature = await client.staking.stake({
      agentTokenAccount: tokenAccount,
      stakingVault: stakingVaultPda,
      stakingConfig: stakingConfigPda,
      ghostMint: ghostMint.toBase58() as Address,
      amount: STAKE_AMOUNT_WITH_DECIMALS,
      lockDuration: LOCK_DURATION,
      agentOwner: wallet,
      agent: wallet.address, // Placeholder, not used in stake instruction
    })

    console.log('\n✅ Staking account created!')
    console.log('  Transaction:', signature)
    console.log('  Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`)

    // Derive staking account PDA
    const [stakingAccountPda] = await getProgramDerivedAddress({
      programAddress: client.staking.getProgramId(),
      seeds: [
        getBytesEncoder().encode(new Uint8Array([115, 116, 97, 107, 105, 110, 103])), // "staking"
        wallet.address,
      ]
    })

    console.log('  Staking Account PDA:', stakingAccountPda)

    // Save staking info
    const stakingConfigPath = path.join(process.cwd(), '.devnet-staking.json')
    fs.writeFileSync(stakingConfigPath, JSON.stringify({
      stakingAccount: stakingAccountPda,
      stakingVault: stakingVaultPda,
      owner: wallet.address,
      stakedAmount: STAKE_AMOUNT,
      lockDuration: Number(LOCK_DURATION),
      ghostMint: ghostMint.toBase58(),
      createdAt: new Date().toISOString(),
      network: 'devnet',
      transaction: signature
    }, null, 2))

    console.log('  💾 Config saved to .devnet-staking.json')

    console.log('\n✅ Staking Setup Complete!')
    console.log('='.repeat(60))
    console.log('  Staked Amount:', STAKE_AMOUNT.toLocaleString(), 'GHOST')
    console.log('  Lock Duration: 90 days')
    console.log('  Min Required: 1,000 GHOST')
    console.log('  Status: ✅ Agent registration enabled')
    console.log('\n💡 Next Steps:')
    console.log('  1. Register agents using devnet-setup.ts')
    console.log('  2. Test on-chain authorization storage')
    console.log('  3. Run E2E tests with on-chain features')

  } catch (error: any) {
    console.error('\n💥 Error creating staking account:', error.message)

    if (error.message?.includes('already in use')) {
      console.log('\n✅ Staking account already exists!')
      console.log('   You can proceed to register agents')
    } else {
      throw error
    }
  }
}

main().catch(error => {
  console.error('\n💥 Error:', error)
  process.exit(1)
})
