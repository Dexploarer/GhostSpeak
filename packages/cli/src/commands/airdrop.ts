/**
 * Devnet GHOST Token Airdrop Command
 *
 * Airdrops 10,000 devnet GHOST tokens to the connected wallet.
 * For testing and development purposes only.
 *
 * Fully migrated to Solana v5 with @solana-program/token
 */

import { Command } from 'commander'
import { address, type Address } from '@solana/addresses'
import {
  getCreateAssociatedTokenInstructionAsync,
  getTransferInstruction,
  fetchToken,
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token'
import {
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  pipe,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
} from '@solana/kit'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import { createCustomClient } from '../core/solana-client.js'
import fs from 'fs'
import path from 'path'
import ora from 'ora'
import chalk from 'chalk'

// Devnet GHOST token mint (from .devnet-ghost.json in SDK)
const DEVNET_GHOST_MINT = 'BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh'
const DECIMALS = 6
const AIRDROP_AMOUNT = 10000 // 10,000 GHOST per request

// Rate limiting (simple file-based tracking)
const RATE_LIMIT_FILE = path.join(process.cwd(), '.ghost-airdrop-claims.json')
const RATE_LIMIT_HOURS = 24

interface AirdropClaim {
  wallet: string
  lastClaim: number
}

function loadClaims(): Record<string, number> {
  try {
    if (fs.existsSync(RATE_LIMIT_FILE)) {
      const data = fs.readFileSync(RATE_LIMIT_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    // Ignore errors, start fresh
  }
  return {}
}

function saveClaims(claims: Record<string, number>) {
  try {
    fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify(claims, null, 2))
  } catch (error) {
    // Ignore errors
  }
}

function canClaim(wallet: string): boolean {
  const claims = loadClaims()
  const lastClaim = claims[wallet]
  if (!lastClaim) return true

  const hoursSinceClaim = (Date.now() - lastClaim) / (1000 * 60 * 60)
  return hoursSinceClaim >= RATE_LIMIT_HOURS
}

function getTimeUntilNextClaim(wallet: string): string {
  const claims = loadClaims()
  const lastClaim = claims[wallet]
  if (!lastClaim) return '0 hours'

  const hoursSinceClaim = (Date.now() - lastClaim) / (1000 * 60 * 60)
  const hoursRemaining = Math.ceil(RATE_LIMIT_HOURS - hoursSinceClaim)

  if (hoursRemaining <= 0) return '0 hours'
  if (hoursRemaining === 1) return '1 hour'
  return `${hoursRemaining} hours`
}

function recordClaim(wallet: string) {
  const claims = loadClaims()
  claims[wallet] = Date.now()
  saveClaims(claims)
}

export const airdropCommand = new Command('airdrop')
  .description('Airdrop devnet GHOST tokens for testing (10,000 GHOST per request - CLI version)')
  .option('-r, --recipient <address>', 'Recipient wallet address (defaults to your wallet)')
  .action(async (options) => {
    const spinner = ora()

    try {
      // Load wallet from CLI config
      const walletPath = process.env.SOLANA_WALLET || path.join(process.env.HOME || '', '.config/solana/id.json')

      if (!fs.existsSync(walletPath)) {
        console.error(chalk.red('❌ Wallet not found!'))
        console.log(chalk.gray(`   Expected: ${walletPath}`))
        console.log(chalk.yellow('   Set SOLANA_WALLET environment variable or create wallet with:'))
        console.log(chalk.gray('   solana-keygen new'))
        process.exit(1)
      }

      // Load keypair from file
      const secretKeyBytes = new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
      const walletKeypair = await createKeyPairSignerFromBytes(secretKeyBytes)

      const recipientAddress = options.recipient
        ? address(options.recipient)
        : walletKeypair.address

      console.log(chalk.blue('🪂 GhostSpeak Devnet GHOST Airdrop'))
      console.log(chalk.gray('='.repeat(60)))
      console.log(chalk.gray(`  Recipient: ${recipientAddress}`))
      console.log(chalk.gray(`  Amount: ${AIRDROP_AMOUNT.toLocaleString()} GHOST`))
      console.log(chalk.gray(`  Network: devnet`))

      // Check rate limit
      if (!canClaim(recipientAddress)) {
        const timeRemaining = getTimeUntilNextClaim(recipientAddress)
        console.log(chalk.yellow(`\n⏰ Rate limit: Already claimed within last 24 hours`))
        console.log(chalk.gray(`   Next claim available in: ${timeRemaining}`))
        process.exit(1)
      }

      // Connect to devnet using Gill
      spinner.start('Connecting to devnet...')
      const client = createCustomClient(
        process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
      )
      const rpc = client.rpc

      const ghostMintAddress = address(DEVNET_GHOST_MINT)

      // Get faucet token account (wallet's ATA)
      const [faucetTokenAccount] = await findAssociatedTokenPda({
        mint: ghostMintAddress,
        owner: walletKeypair.address,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })

      // Check faucet balance
      try {
        const faucetAccountData = await fetchToken(rpc, faucetTokenAccount)
        const faucetBalance = Number(faucetAccountData.data.amount) / 10 ** DECIMALS

        if (faucetBalance < AIRDROP_AMOUNT) {
          spinner.fail('Insufficient faucet balance')
          console.log(chalk.red(`\n❌ Faucet has only ${faucetBalance.toLocaleString()} GHOST`))
          console.log(chalk.gray('   Please contact the GhostSpeak team to refill the faucet'))
          process.exit(1)
        }

        spinner.succeed(`Faucet balance: ${faucetBalance.toLocaleString()} GHOST`)
      } catch (error) {
        spinner.fail('Faucet not initialized')
        console.log(chalk.red('\n❌ Devnet airdrop faucet not set up'))
        console.log(chalk.gray('   Please contact the GhostSpeak team'))
        process.exit(1)
      }

      // Get or create recipient token account
      spinner.start('Setting up recipient token account...')
      const [recipientTokenAccount] = await findAssociatedTokenPda({
        mint: ghostMintAddress,
        owner: recipientAddress,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })

      // Build transaction
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

      // Create ATA instruction (idempotent - will do nothing if already exists)
      const createAtaInstruction = await getCreateAssociatedTokenInstructionAsync({
        payer: walletKeypair,
        mint: ghostMintAddress,
        owner: recipientAddress,
        ata: recipientTokenAccount,
      })

      // Create transfer instruction
      const amountWithDecimals = BigInt(AIRDROP_AMOUNT) * BigInt(10 ** DECIMALS)
      const transferInstruction = getTransferInstruction({
        source: faucetTokenAccount,
        destination: recipientTokenAccount,
        authority: walletKeypair,
        amount: amountWithDecimals,
      })

      spinner.text = 'Building transaction...'

      // Build and sign transaction
      const transactionMessage = await pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(walletKeypair, tx),
        (tx) =>
          setTransactionMessageLifetimeUsingBlockhash(
            latestBlockhash,
            tx
          ),
        (tx) => appendTransactionMessageInstruction(createAtaInstruction, tx),
        (tx) => appendTransactionMessageInstruction(transferInstruction, tx)
      )

      spinner.text = `Transferring ${AIRDROP_AMOUNT.toLocaleString()} GHOST...`

      // Sign and send using modern v5 pattern
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

      const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
        rpc: rpc as Parameters<typeof sendAndConfirmTransactionFactory>[0]['rpc'],
        rpcSubscriptions: undefined as any // Subscriptions not currently available
      })

      const signature = await sendAndConfirmTransaction(signedTransaction, { commitment: 'confirmed' })

      spinner.succeed('Transfer complete!')

      // Record claim
      recordClaim(recipientAddress)

      // Get new balance
      const updatedAccount = await fetchToken(rpc, recipientTokenAccount)
      const newBalance = Number(updatedAccount.data.amount) / 10 ** DECIMALS

      console.log(chalk.green('\n✅ Airdrop successful!'))
      console.log(chalk.gray('  Transaction:'), chalk.cyan(signature))
      console.log(chalk.gray('  Explorer:'), chalk.cyan(`https://explorer.solana.com/tx/${signature}?cluster=devnet`))
      console.log(chalk.gray('  New Balance:'), chalk.green(`${newBalance.toLocaleString()} GHOST`))

      console.log(chalk.blue('\n💡 Next Steps:'))
      console.log(chalk.gray('  1. Stake GHOST: ghost stake <amount>'))
      console.log(chalk.gray('  2. Register agent: ghost agent register'))
      console.log(chalk.gray('  3. Test features in devnet'))
      console.log(chalk.gray('\n  Next airdrop available in 24 hours'))

    } catch (error: any) {
      spinner.fail('Airdrop failed')
      console.error(chalk.red('\n💥 Error:'), error.message)

      if (error.message?.includes('Transaction simulation failed')) {
        console.log(chalk.yellow('\n  Common causes:'))
        console.log(chalk.gray('  • Insufficient SOL for rent'))
        console.log(chalk.gray('  • Faucet needs refilling'))
        console.log(chalk.gray('  • Network congestion'))
      }

      process.exit(1)
    }
  })
