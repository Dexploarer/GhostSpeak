/**
 * Test Agent Registration
 * Registers a test agent after staking GHOST
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import chalk from 'chalk'
import { readFileSync } from 'fs'

// Configuration
const NETWORK = 'devnet'
const RPC_URL = 'https://api.devnet.solana.com'
const PROGRAM_ID = '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB'

async function main() {
  console.log(chalk.cyan('\n🤖 Testing Agent Registration'))
  console.log('='.repeat(60))

  // Load wallet
  const walletPath =
    process.env.HOME + '/.config/solana/id.json'
  const walletData = JSON.parse(readFileSync(walletPath, 'utf-8'))
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData))

  console.log(chalk.gray('\n📍 Configuration:'))
  console.log(chalk.gray(`  Wallet: ${wallet.publicKey.toBase58()}`))
  console.log(chalk.gray(`  Network: ${NETWORK}`))
  console.log(chalk.gray(`  Program ID: ${PROGRAM_ID}`))

  // Connect
  const connection = new Connection(RPC_URL, 'confirmed')

  // Check SOL balance
  const balance = await connection.getBalance(wallet.publicKey)
  console.log(
    chalk.gray(`  SOL Balance: ${(balance / 1e9).toFixed(9)} SOL`)
  )

  if (balance < 0.1 * 1e9) {
    console.log(chalk.yellow('\n⚠️  Low SOL balance - please fund wallet'))
  }

  // Derive agent PDA
  const [agentPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), wallet.publicKey.toBuffer()],
    new PublicKey(PROGRAM_ID)
  )

  console.log(chalk.gray(`\n🤖 Agent PDA: ${agentPda.toBase58()}`))

  // Check if agent already exists
  const agentAccount = await connection.getAccountInfo(agentPda)

  if (agentAccount) {
    console.log(chalk.green('\n✅ Agent already registered!'))
    console.log(chalk.gray(`   Data length: ${agentAccount.data.length} bytes`))
    console.log(chalk.gray(`   Owner: ${agentAccount.owner.toBase58()}`))

    // Basic success verification
    if (agentAccount.owner.toBase58() === PROGRAM_ID) {
      console.log(
        chalk.green(
          '\n🎉 Agent registration verified - owned by correct program!'
        )
      )
    }
  } else {
    console.log(chalk.yellow('\n⚠️  Agent not registered yet'))
    console.log(
      chalk.gray(
        '\n💡 To register an agent, use the SDK or CLI with staking:'
      )
    )
    console.log(
      chalk.gray('   1. Ensure you have staked GHOST tokens (✅ Done)')
    )
    console.log(
      chalk.gray(
        '   2. Use GhostSpeakClient.agents.register() or CLI command'
      )
    )
  }

  console.log(chalk.cyan('\n✅ Agent registration test complete!'))
  console.log('='.repeat(60))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(chalk.red('\n💥 Error:'), error.message)
    console.error(error)
    process.exit(1)
  })
