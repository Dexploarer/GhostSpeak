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
import { createSolanaRpc } from '@solana/rpc'
import { address } from '@solana/addresses'
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token'
import fs from 'fs'
import path from 'path'

async function main() {
  console.log('🏦 Initializing Staking Vault on Devnet')
  console.log('='.repeat(60))

  // Load devnet wallet
  const wallet = await loadDevnetWallet()
  const keypair = loadDevnetKeypair()

  console.log('\n📍 Configuration:')
  console.log('  Payer:', wallet.address)
  console.log('  Network: devnet')

  // Load devnet GHOST token config
  const configPath = path.join(process.cwd(), '.devnet-ghost.json')
  if (!fs.existsSync(configPath)) {
    console.error('\n❌ Devnet GHOST token not found!')
    console.log('   Run: bun run scripts/mint-devnet-ghost.ts')
    process.exit(1)
  }

  const ghostConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  const ghostMint = address(ghostConfig.mint)

  console.log('  GHOST Mint:', ghostMint)

  // Initialize client
  const client = new GhostSpeakClient({
    network: 'devnet',
    rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  })

  // Create modern RPC client
  const rpc = createSolanaRpc(
    process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  )

  // Check SOL balance
  const { value: balance } = await rpc.getBalance(wallet.address).send()
  console.log(`  SOL Balance: ${Number(balance) / 1e9} SOL`)

  if (Number(balance) < 0.1e9) {
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
    const vaultInfo = await rpc.getAccountInfo(stakingVaultPda, { encoding: 'base64' }).send()
    if (vaultInfo.value) {
      console.log('\n✅ Staking vault already exists!')
      console.log('  Owner:', vaultInfo.value.owner)
      console.log('  Data Length:', vaultInfo.value.data[0].length, 'bytes')

      // Try to parse as token account
      try {
        const { fetchToken } = await import('@solana-program/token')
        const vaultAccount = await fetchToken(rpc, stakingVaultPda)
        console.log('  Mint:', vaultAccount.data.mint)
        console.log('  Authority:', vaultAccount.data.owner)
        console.log('  Balance:', Number(vaultAccount.data.amount) / 10 ** ghostConfig.decimals, 'GHOST')
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
    // Import modern Solana primitives
    const {
      createTransactionMessage,
      setTransactionMessageFeePayerSigner,
      setTransactionMessageLifetimeUsingBlockhash,
      appendTransactionMessageInstruction,
      compileTransaction,
      signTransaction,
      sendAndConfirmTransaction,
      pipe,
    } = await import('@solana/kit')

    const { getCreateAccountInstruction } = await import('@solana-program/system')
    const { getInitializeAccountInstruction, ACCOUNT_SIZE } = await import('@solana-program/token')

    // Get rent-exempt balance for token account
    const rentExemptBalance = await rpc.getMinimumBalanceForRentExemption(BigInt(ACCOUNT_SIZE)).send()

    console.log('  Rent-exempt balance:', Number(rentExemptBalance) / 1e9, 'SOL')

    // Note: The below approach won't work because we need to create at a PDA address
    // PDAs cannot be created with createAccount - we need an Anchor instruction
    // This code is left here as documentation of what would be needed if manual creation were possible

    // Create vault account owned by Token Program (won't work for PDAs)
    const createAccountIx = getCreateAccountInstruction({
      payer: wallet,
      newAccount: wallet, // Cannot use PDA here - createAccount doesn't support PDA creation
      lamports: rentExemptBalance,
      space: BigInt(ACCOUNT_SIZE),
      programAddress: TOKEN_PROGRAM_ADDRESS,
    })

    // Initialize as token account
    const initializeAccountIx = getInitializeAccountInstruction({
      account: stakingVaultPda,
      mint: ghostMint,
      owner: client.staking.getProgramId(),
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    })

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
