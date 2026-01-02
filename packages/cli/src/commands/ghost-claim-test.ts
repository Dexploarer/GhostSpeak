/**
 * Test Ghost Claiming Command
 *
 * For testing the claim flow with agents you already own (bypasses discovery database)
 */

import { Command } from 'commander'
import chalk from 'chalk'
import {
  intro,
  outro,
  text,
  confirm,
  spinner,
  isCancel,
  cancel,
  log,
} from '@clack/prompts'
import { address, type Address } from '@solana/addresses'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import { initializeClient, getExplorerUrl, handleTransactionError } from '../utils/client.js'
import { loadSASConfig, createGhostOwnershipAttestation } from '../utils/sas-helpers.js'
import { markGhostClaimed, getGhostScore } from '../utils/convex-client.js'
import fs from 'fs'
import path from 'path'
import {
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  pipe,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory
} from '@solana/kit'

export const ghostClaimTestCommand = new Command('claim-ghost-test')
  .description('🧪 Test Ghost claiming with your own agent (bypasses discovery database)')
  .argument('<agent-address>', 'Address of the agent you want to claim')
  .option('--facilitator <address>', 'x402 facilitator address (optional)')
  .action(async (agentAddress: string, options: { facilitator?: string }) => {
    intro(chalk.cyan('🧪 Test Ghost Claim Flow'))

    try {
      // Validate address
      let ghostAddr: Address
      try {
        ghostAddr = address(agentAddress)
      } catch (error) {
        log.error(chalk.red('❌ Invalid agent address format'))
        log.info(chalk.gray(`Provided: ${agentAddress}`))
        log.info(chalk.yellow('\\nExpected format: Base58-encoded Solana address (32 bytes)'))
        log.info(chalk.gray('Example: 8YiPAVcbGNBQC4UpQNKZ3RxEJ8MsZQvdMfBEHWyBBGPq'))
        outro(chalk.red('Invalid address'))
        return
      }

      console.log(`\\n${chalk.bold('Ghost Address:')} ${ghostAddr}`)

      const s = spinner()

      // Initialize client
      s.start('Initializing Solana client...')
      const { client, rpc } = initializeClient()
      s.stop('✅ Client initialized')

      // Load wallet
      s.start('Loading wallet...')
      const walletPath = process.env.SOLANA_WALLET || path.join(process.env.HOME || '', '.config/solana/id.json')

      if (!fs.existsSync(walletPath)) {
        s.stop(chalk.red('❌ Wallet not found'))
        log.error(`Expected: ${walletPath}`)
        log.info(chalk.yellow('Set SOLANA_WALLET environment variable or create wallet with:'))
        log.info(chalk.gray('solana-keygen new'))
        outro(chalk.red('Wallet required'))
        return
      }

      const secretKeyBytes = new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
      const claimer = await createKeyPairSignerFromBytes(secretKeyBytes)
      s.stop(`✅ Wallet loaded: ${claimer.address}`)

      // Load SAS configuration
      s.start('Loading SAS configuration...')
      let sasConfig
      try {
        sasConfig = await loadSASConfig()
        s.stop('✅ SAS config loaded')
      } catch (error) {
        s.stop(chalk.red('❌ SAS config not found'))
        log.error(error instanceof Error ? error.message : 'Unknown error')
        log.info(chalk.yellow('\\n💡 Run SAS setup first:'))
        log.info(chalk.gray('  bun packages/web/scripts/setup-sas.ts'))
        outro(chalk.red('Setup required'))
        return
      }

      // Display test info
      console.log(`\\n${chalk.bold('Test Claim Details:')}`)
      console.log(chalk.gray(`  Agent: ${ghostAddr}`))
      console.log(chalk.gray(`  Claimer: ${claimer.address}`))
      console.log(chalk.gray(`  Network: devnet`))
      if (options.facilitator) {
        console.log(chalk.gray(`  Facilitator: ${options.facilitator}`))
      }

      const confirmClaim = await confirm({
        message: `Proceed with test claim?`,
      })

      if (isCancel(confirmClaim) || !confirmClaim) {
        cancel('Test cancelled')
        return
      }

      // Create attestation data
      const network = 'devnet'
      const agentData = {
        agent: ghostAddr,
        did: `did:sol:${network}:${ghostAddr}`,
        name: `Test Ghost ${ghostAddr.slice(0, 8)}`,
        capabilities: 'x402-payments,autonomous-agent',
        x402Enabled: true,
        x402ServiceEndpoint: options.facilitator || '',
        owner: claimer.address,
        registeredAt: Math.floor(Date.now() / 1000),
        issuedAt: Math.floor(Date.now() / 1000),
      }

      // Create attestation
      s.start('Creating SAS attestation...')
      let attestationResult
      try {
        attestationResult = await createGhostOwnershipAttestation({
          sasConfig,
          payer: claimer,
          ghostPaymentAddress: ghostAddr,
          agentData,
          expiryDays: 365,
        })
        s.stop(`✅ Attestation prepared`)
        log.info(chalk.gray(`  Attestation PDA: ${attestationResult.attestationPda}`))
      } catch (error) {
        s.stop(chalk.red('❌ Failed to create attestation'))
        log.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'))
        outro(chalk.red('Attestation creation failed'))
        return
      }

      // Send attestation transaction
      s.start('Creating attestation on-chain...')
      try {
        const { GhostSpeakClient } = await import('@ghostspeak/sdk')

        const ghostClient = new GhostSpeakClient({
          network: 'devnet',
          rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        })

        // Get latest blockhash
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

        // Build attestation transaction
        const attestationTxMessage = await pipe(
          createTransactionMessage({ version: 0 }),
          (tx) => setTransactionMessageFeePayerSigner(claimer, tx),
          (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
          (tx) => appendTransactionMessageInstruction(attestationResult.instruction, tx)
        )

        // Sign transaction
        const signedAttestationTx = await signTransactionMessageWithSigners(attestationTxMessage)

        // Send and confirm
        const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
          rpc: rpc as any,
          rpcSubscriptions: undefined as any
        })

        const attestationTxSignature = await sendAndConfirmTransaction(signedAttestationTx, {
          commitment: 'confirmed'
        })

        s.stop(`✅ Attestation created: ${attestationTxSignature.slice(0, 12)}...`)
        log.info(chalk.gray(`  View: ${getExplorerUrl(attestationTxSignature, 'devnet')}`))
      } catch (error) {
        s.stop(chalk.red('❌ Attestation transaction failed'))
        log.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'))

        const errorMsg = error instanceof Error ? error.message.toLowerCase() : ''
        if (errorMsg.includes('insufficient') || errorMsg.includes('balance')) {
          log.info(chalk.yellow('\\n💡 Insufficient funds'))
          log.info(chalk.gray('  Check balance: solana balance'))
          log.info(chalk.gray('  Request SOL: solana airdrop 2'))
        }

        outro(chalk.red('Attestation creation failed'))
        return
      }

      // Claim the Ghost
      s.start('Claiming Ghost with SDK...')

      try {
        const { GhostSpeakClient } = await import('@ghostspeak/sdk')
        const ghostClient = new GhostSpeakClient({
          network: 'devnet',
          rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        })

        const claimSignature = await ghostClient.ghosts.claim(claimer, {
          agentAddress: ghostAddr,
          x402PaymentAddress: ghostAddr,
          sasCredential: sasConfig.credentialPda,
          sasSchema: sasConfig.agentIdentitySchema,
          network: 'devnet',
          ipfsMetadataUri: undefined,
          githubUsername: undefined,
          twitterHandle: undefined,
        })

        s.stop(`✅ Ghost claimed!`)

        // Try to update Convex (optional for test)
        const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL
        if (convexUrl) {
          s.start('Updating Convex database...')
          try {
            await markGhostClaimed(ghostAddr, claimer.address, claimSignature)
            s.stop('✅ Convex database updated')
          } catch (error) {
            s.stop(chalk.yellow('⚠️  Convex update skipped'))
            log.warn(chalk.gray('Ghost not in discovery database (expected for test)'))
          }
        }

        // Success output
        console.log(chalk.green('\\n🎉 Test Claim Successful!'))
        console.log(chalk.gray('─'.repeat(80)))
        console.log(chalk.bold('Transaction Details:'))
        console.log(chalk.gray(`  Claim TX: ${claimSignature}`))
        console.log(chalk.gray(`  Explorer: ${getExplorerUrl(claimSignature, 'devnet')}`))
        console.log('')
        console.log(chalk.bold('Ghost Details:'))
        console.log(chalk.gray(`  Ghost Address: ${ghostAddr}`))
        console.log(chalk.gray(`  Owner: ${claimer.address}`))
        console.log(chalk.gray(`  DID: did:sol:devnet:${ghostAddr}`))
        console.log(chalk.gray(`  Status: Claimed ✅`))

        outro(chalk.green('✨ Test claim complete!'))

      } catch (error) {
        s.stop(chalk.red('❌ Claim failed'))
        log.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'))

        const errorMsg = error instanceof Error ? error.message.toLowerCase() : ''
        if (errorMsg.includes('insufficient') || errorMsg.includes('balance')) {
          log.info(chalk.yellow('\\n💡 Insufficient funds'))
          log.info(chalk.gray('  Check balance: solana balance'))
          log.info(chalk.gray('  Request SOL: solana airdrop 2'))
        } else if (errorMsg.includes('already') || errorMsg.includes('exists')) {
          log.info(chalk.yellow('\\n💡 Ghost may already be claimed'))
          log.info(chalk.gray('  This agent may have already been claimed'))
        }

        await handleTransactionError(error, 'test claim Ghost')
        outro(chalk.red('Test claim failed'))
        return
      }

    } catch (error) {
      log.error(`Failed to process test claim: ${error instanceof Error ? error.message : 'Unknown error'}`)
      outro(chalk.red('Operation failed'))
    }
  })
