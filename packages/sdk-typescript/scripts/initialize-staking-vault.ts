/**
 * Initialize Staking Vault on Devnet
 *
 * Creates the SPL token account at the staking vault PDA that will hold
 * all staked GHOST tokens. This is a one-time setup operation.
 *
 * The Anchor program references staking_vault as Account<'info, TokenAccount>
 * without init, so we must create it manually before users can stake.
 *
 * Run: bun run scripts/initialize-staking-vault.ts
 */

import { GhostSpeakClient } from '../src/core/GhostSpeakClient.js'
import { loadDevnetWallet, loadDevnetKeypair } from '../tests/utils/test-signers.js'
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAccount,
  TOKEN_PROGRAM_ID,
  getMinimumBalanceForRentExemptAccount,
} from '@solana/spl-token'
import fs from 'fs'
import path from 'path'

async function main() {
  console.log('🏦 Initializing Staking Vault on Devnet')
  console.log('='.repeat(60))

  // Load devnet wallet
  const wallet = await loadDevnetWallet()
  const keypair = loadDevnetKeypair()

  console.log('\n📍 Configuration:')
  console.log('  Payer:', keypair.publicKey.toBase58())
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

  // Initialize client
  const client = new GhostSpeakClient({
    network: 'devnet',
    rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  })

  const connection = new Connection(
    process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
  )

  // Check SOL balance
  const balance = await connection.getBalance(keypair.publicKey)
  console.log(`  SOL Balance: ${balance / 1e9} SOL`)

  if (balance < 0.1e9) {
    console.error('\n❌ Insufficient SOL! Need at least 0.1 SOL.')
    console.log('   Airdrop: solana airdrop 2 --url devnet')
    process.exit(1)
  }

  // Derive staking config PDA
  console.log('\n🔍 Deriving staking config PDA...')

  const { getProgramDerivedAddress, getBytesEncoder } = await import('@solana/kit')
  const [stakingConfigPda] = await getProgramDerivedAddress({
    programAddress: client.staking.getProgramId(),
    seeds: [
      getBytesEncoder().encode(new Uint8Array([115, 116, 97, 107, 105, 110, 103, 95, 99, 111, 110, 102, 105, 103])) // "staking_config"
    ]
  })

  console.log('  Staking Config PDA:', stakingConfigPda)

  // Verify staking config exists
  const existingConfig = await client.staking.getStakingConfig(stakingConfigPda)

  if (!existingConfig) {
    console.error('\n❌ Staking config not initialized!')
    console.log('   Run: bun run tests/setup/devnet-setup.ts')
    process.exit(1)
  }

  console.log('  ✅ Staking config found')

  // Derive staking vault PDA
  console.log('\n📝 Deriving staking vault PDA...')

  const { getAddressEncoder } = await import('@solana/kit')

  const [stakingVaultPda] = await getProgramDerivedAddress({
    programAddress: client.staking.getProgramId(),
    seeds: [
      getBytesEncoder().encode(new Uint8Array([115, 116, 97, 107, 105, 110, 103, 95, 118, 97, 117, 108, 116])), // "staking_vault"
      getAddressEncoder().encode(stakingConfigPda), // Encode address to 32 bytes
    ]
  })

  console.log('  Staking Vault PDA:', stakingVaultPda)

  // Check if vault already exists
  try {
    const vaultInfo = await connection.getAccountInfo(new PublicKey(stakingVaultPda))
    if (vaultInfo) {
      console.log('\n✅ Staking vault already exists!')
      console.log('  Owner:', vaultInfo.owner.toBase58())
      console.log('  Data Length:', vaultInfo.data.length, 'bytes')

      // Try to parse as token account
      try {
        const { getAccount } = await import('@solana/spl-token')
        const vaultAccount = await getAccount(connection, new PublicKey(stakingVaultPda))
        console.log('  Mint:', vaultAccount.mint.toBase58())
        console.log('  Authority:', vaultAccount.owner.toBase58())
        console.log('  Balance:', Number(vaultAccount.amount) / 10 ** ghostConfig.decimals, 'GHOST')
      } catch (parseError) {
        console.log('  ⚠️  Account exists but could not parse as token account')
      }

      console.log('\n💡 Vault is ready. Users can now stake GHOST tokens.')
      console.log('   Next: bun run scripts/create-staking-account.ts')
      return
    }
  } catch (error) {
    // Account doesn't exist, continue with creation
  }

  // Create the staking vault token account
  console.log('\n🏭 Creating staking vault token account...')

  try {
    // Get rent-exempt balance for token account
    const rentExemptBalance = await getMinimumBalanceForRentExemptAccount(connection)

    console.log('  Rent-exempt balance:', rentExemptBalance / 1e9, 'SOL')

    // Import web3.js v2 primitives for transaction building
    const {
      createTransactionMessage,
      setTransactionMessageFeePayerSigner,
      setTransactionMessageLifetimeUsingBlockhash,
      appendTransactionMessageInstruction,
      compileTransaction,
      signTransaction,
      sendAndConfirmTransaction,
    } = await import('@solana/web3.js')

    const { getCreateAccountInstruction } = await import('@solana-program/system')
    const { getInitializeAccountInstruction } = await import('@solana-program/token')

    // Create vault account owned by Token Program
    const createAccountIx = getCreateAccountInstruction({
      payer: wallet,
      newAccount: wallet, // Temporary, will be overridden by PDA derivation
      lamports: BigInt(rentExemptBalance),
      space: 165n, // TokenAccount size
      programAddress: TOKEN_PROGRAM_ID.toBase58() as any,
    })

    // Initialize as token account
    const initializeAccountIx = getInitializeAccountInstruction({
      account: stakingVaultPda as any,
      mint: ghostMint.toBase58() as any,
      owner: client.staking.getProgramId(), // Program owns the vault
      tokenProgram: TOKEN_PROGRAM_ID.toBase58() as any,
    })

    // Build transaction
    const { value: latestBlockhash } = await connection.getLatestBlockhash()

    const txMessage = await createTransactionMessage({
      version: 0
    })
      |> setTransactionMessageFeePayerSigner(wallet)
      |> setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, BigInt(latestBlockhash.lastValidBlockHeight))

    // Note: The above approach won't work because we need to create at a PDA address
    // PDAs cannot be created with createAccount - we need an Anchor instruction

    console.error('\n⚠️  Cannot create PDA token account directly from TypeScript!')
    console.log('\n📋 Solutions:')
    console.log('  1. Add init_staking_vault instruction to Rust program (recommended)')
    console.log('  2. Use SPL CLI to create account manually')
    console.log('  3. Modify Anchor program to use init_if_needed on staking_vault')
    console.log('\n💡 For now, we recommend using the Anchor init_if_needed pattern.')
    console.log('   This requires modifying programs/src/instructions/staking.rs')

  } catch (error: any) {
    console.error('\n💥 Error creating staking vault:', error.message)
    throw error
  }
}

main().catch(error => {
  console.error('\n💥 Error:', error)
  process.exit(1)
})
