/**
 * Simplified Ghost Claiming Command
 *
 * Automated flow for claiming discovered Ghosts with SAS attestation
 */

import { Command } from 'commander'
import chalk from 'chalk'
import {
  intro,
  outro,
  text,
  select,
  confirm,
  spinner,
  isCancel,
  cancel,
  log,
  note
} from '@clack/prompts'
import { address, type Address } from '@solana/addresses'
import { createKeyPairSignerFromBytes, type TransactionSigner } from '@solana/signers'
import { getAddressEncoder, getUtf8Encoder, getProgramDerivedAddress } from '@solana/kit'
import { initializeClient, getExplorerUrl } from '../utils/client.js'
import { handleError } from '../utils/error-handler.js'
import { getConvexClient, queryDiscoveredAgents, markGhostClaimed, getGhostScore } from '../utils/convex-client.js'
import { loadSASConfig, createGhostOwnershipAttestation } from '../utils/sas-helpers.js'
import fs from 'fs'
import path from 'path'

// SAS Program constants
const SAS_PROGRAM_ID = address('22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG')
const ATTESTATION_SEED = 'attestation'

/**
 * Derive SAS attestation PDA
 */
async function deriveAttestationPda(
  credentialAddress: Address,
  schemaAddress: Address,
  nonce: Address
): Promise<{ pda: Address; bump: number }> {
  const [pda, bump] = await getProgramDerivedAddress({
    programAddress: SAS_PROGRAM_ID,
    seeds: [
      getUtf8Encoder().encode(ATTESTATION_SEED),
      getAddressEncoder().encode(credentialAddress),
      getAddressEncoder().encode(schemaAddress),
      getAddressEncoder().encode(nonce)
    ]
  })

  return { pda, bump }
}

/**
 * Serialize attestation data (simple format: just the x402 payment address)
 */
function serializeAttestationData(x402PaymentAddress: Address): Uint8Array {
  // For Ghost ownership, we just need to prove we control the address
  // Data = 32 bytes of the x402 payment address
  const addressBytes = getAddressEncoder().encode(x402PaymentAddress)
  // Convert ReadonlyUint8Array to Uint8Array
  return new Uint8Array(addressBytes)
}

export const ghostClaimCommand = new Command('claim-ghost')
  .description('🎯 Simplified Ghost claiming - Auto-create attestation and claim in one step')
  .option('--list', 'List all discovered Ghosts available to claim')
  .option('--ghost-address <address>', 'Specific Ghost address to claim')
  .action(async (options) => {
    intro(chalk.cyan('👻 Claim a Discovered Ghost'))

    try {
      // Check for CONVEX_URL
      const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL
      if (!convexUrl) {
        log.error('CONVEX_URL environment variable not set')
        log.info('\n💡 Set CONVEX_URL in your .env file or export it:')
        log.info(chalk.cyan('export CONVEX_URL=<your-convex-url>'))
        log.info(chalk.gray('\nFor devnet testing, ask your team for the dev deployment URL'))
        outro(chalk.red('Configuration required'))
        return
      }

      const s = spinner()

      // List discovered agents if requested
      if (options.list) {
        s.start('Fetching discovered Ghosts from Convex...')

        const discoveredAgents = await queryDiscoveredAgents({ limit: 100 })

        s.stop(`✅ Found ${discoveredAgents.length} discovered Ghosts`)

        if (discoveredAgents.length === 0) {
          outro(chalk.yellow('No discovered Ghosts found'))
          return
        }

        console.log('\n' + chalk.bold('Discovered Ghosts (Unclaimed):'))
        console.log('─'.repeat(80))

        discoveredAgents.slice(0, 20).forEach((agent, i) => {
          console.log(chalk.cyan(`\n${i + 1}. ${agent.ghostAddress}`))
          console.log(chalk.gray(`   First seen: ${new Date(agent.firstSeenTimestamp).toLocaleDateString()}`))
          console.log(chalk.gray(`   Discovery: ${agent.discoverySource}`))
          console.log(chalk.gray(`   Facilitator: ${agent.facilitatorAddress || 'N/A'}`))
          console.log(chalk.gray(`   Status: ${agent.status}`))
        })

        if (discoveredAgents.length > 20) {
          console.log(chalk.gray(`\n... and ${discoveredAgents.length - 20} more`))
        }

        outro(
          `\n${chalk.bold('To claim a Ghost:')}\n` +
          `${chalk.cyan('ghost claim-ghost --ghost-address <address>')}\n\n` +
          `${chalk.gray('Note: Currently requires manual SAS attestation setup')}\n` +
          `${chalk.gray('Full automation coming soon!')}`
        )
        return
      }

      // Get Ghost address to claim
      let ghostAddress = options.ghostAddress
      if (!ghostAddress) {
        s.start('Fetching available Ghosts...')

        const discoveredAgents = await queryDiscoveredAgents({
          status: 'discovered',
          limit: 10
        })

        s.stop(`✅ Found ${discoveredAgents.length} unclaimed Ghosts`)

        if (discoveredAgents.length === 0) {
          outro(chalk.yellow('No unclaimed Ghosts found'))
          return
        }

        const ghostSelection = await select({
          message: 'Select a Ghost to claim:',
          options: discoveredAgents.map((agent, i) => ({
            value: agent.ghostAddress,
            label: `${i + 1}. ${agent.ghostAddress.slice(0, 8)}... (${agent.discoverySource})`
          }))
        })

        if (isCancel(ghostSelection)) {
          cancel('Claim cancelled')
          return
        }

        ghostAddress = ghostSelection.toString()
      }

      // Validate address
      let ghostAddr: Address
      try {
        ghostAddr = address(ghostAddress)
      } catch (error) {
        log.error(chalk.red('❌ Invalid Ghost address format'))
        log.info(chalk.gray(`Provided: ${ghostAddress}`))
        log.info(chalk.yellow('\\nExpected format: Base58-encoded Solana address (32 bytes)'))
        log.info(chalk.gray('Example: 8YiPAVcbGNBQC4UpQNKZ3RxEJ8MsZQvdMfBEHWyBBGPq'))
        outro(chalk.red('Invalid address'))
        return
      }

      // NOW IMPLEMENT THE ACTUAL CLAIMING FLOW!
      console.log(`\n${chalk.bold('Ghost Address:')} ${ghostAddr}`)

      // Initialize client and wallet
      s.start('Initializing Solana client...')
      const { client, rpc } = await initializeClient()
      s.stop('✅ Client initialized')

      // Load user's wallet (claimer)
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
        outro(chalk.red('Setup required'))
        return
      }

      // Fetch Ghost details from Convex to get full agent data
      s.start('Fetching Ghost details...')
      const discoveredAgents = await queryDiscoveredAgents({ limit: 100 })
      const ghostData = discoveredAgents.find((a) => a.ghostAddress === ghostAddr)

      if (!ghostData) {
        s.stop(chalk.red('❌ Ghost not found in discovery database'))
        log.error(chalk.red(`Ghost ${ghostAddr} has not been indexed yet`))
        log.info(chalk.yellow('\\n💡 Possible reasons:'))
        log.info(chalk.gray('  1. Ghost has not made any x402 payments yet'))
        log.info(chalk.gray('  2. Indexer has not discovered this Ghost'))
        log.info(chalk.gray('  3. Address is incorrect or typo'))
        log.info(chalk.cyan('\\nℹ️  To see all discovered Ghosts:'))
        log.info(chalk.gray('  ghost claim-ghost --list'))
        outro(chalk.red('Ghost not found'))
        return
      }

      // Check if Ghost is already claimed
      if (ghostData.status === 'claimed') {
        s.stop(chalk.yellow('⚠️  Ghost already claimed'))
        log.warn(chalk.yellow(`This Ghost was claimed by ${ghostData.claimedBy || 'another user'}`))
        if (ghostData.claimedAt) {
          log.info(chalk.gray(`Claimed on: ${new Date(ghostData.claimedAt).toLocaleString()}`))
        }
        log.info(chalk.cyan('\\nℹ️  To find unclaimed Ghosts:'))
        log.info(chalk.gray('  ghost claim-ghost --list'))
        outro(chalk.yellow('Ghost unavailable'))
        return
      }

      s.stop('✅ Ghost details loaded')

      // Display Ghost info and confirm
      console.log(`\n${chalk.bold('Ghost Details:')}`)
      console.log(chalk.gray(`  First seen: ${new Date(ghostData.firstSeenTimestamp).toLocaleDateString()}`))
      console.log(chalk.gray(`  Discovery: ${ghostData.discoverySource}`))
      console.log(chalk.gray(`  Facilitator: ${ghostData.facilitatorAddress || 'N/A'}`))
      console.log(chalk.gray(`  Current status: ${ghostData.status}`))

      const confirmClaim = await confirm({
        message: `Claim this Ghost to ${claimer.address.slice(0, 8)}...?`,
      })

      if (isCancel(confirmClaim) || !confirmClaim) {
        cancel('Claim cancelled')
        return
      }

      // Create attestation data
      const network = 'devnet'
      const agentData = {
        agent: ghostAddr,
        did: `did:sol:${network}:${ghostAddr}`,
        name: `Ghost Agent ${ghostAddr.slice(0, 8)}`,
        capabilities: 'x402-payments,autonomous-agent',
        x402Enabled: true,
        x402ServiceEndpoint: ghostData.facilitatorAddress || '',
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
        log.info(chalk.yellow('\\n💡 Common causes:'))
        log.info(chalk.gray('  1. SAS configuration is invalid or expired'))
        log.info(chalk.gray('  2. Schema mismatch between configured and on-chain'))
        log.info(chalk.gray('  3. Insufficient permissions for authorized signer'))
        log.info(chalk.cyan('\\nℹ️  To fix:'))
        log.info(chalk.gray('  Re-run SAS setup: bun packages/web/scripts/setup-sas.ts'))
        outro(chalk.red('Attestation creation failed'))
        return
      }

      // Send attestation instruction first using SDK transaction builder
      s.start('Creating attestation on-chain...')
      try {
        const { GhostSpeakClient } = await import('@ghostspeak/sdk')
        const {
          createTransactionMessage,
          setTransactionMessageFeePayerSigner,
          setTransactionMessageLifetimeUsingBlockhash,
          appendTransactionMessageInstruction,
          pipe,
          signTransactionMessageWithSigners,
          sendAndConfirmTransactionFactory
        } = await import('@solana/kit')

        const ghostClient = new GhostSpeakClient({
          rpc: rpc as any,
          cluster: 'devnet',
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

        // Sign with both claimer and authorized signer
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
        log.info(chalk.yellow('\\n💡 Common causes:'))
        log.info(chalk.gray('  1. Insufficient SOL for transaction fees'))
        log.info(chalk.gray('  2. Attestation already exists for this Ghost'))
        log.info(chalk.gray('  3. Network congestion or RPC timeout'))
        log.info(chalk.gray('  4. Invalid or expired blockhash'))
        log.info(chalk.cyan('\\nℹ️  To fix:'))
        log.info(chalk.gray('  1. Check wallet balance: solana balance'))
        log.info(chalk.gray('  2. Request devnet SOL: solana airdrop 2'))
        log.info(chalk.gray('  3. Try again with a different RPC endpoint'))
        outro(chalk.red('Attestation creation failed'))
        return
      }

      // Now claim the Ghost using the SDK
      s.start('Claiming Ghost with SDK...')

      try {
        // Import and initialize GhostModule
        const { GhostSpeakClient } = await import('@ghostspeak/sdk')
        const ghostClient = new GhostSpeakClient({
          rpc: rpc as any,
          cluster: 'devnet',
        })

        // Claim the Ghost
        const claimSignature = await ghostClient.ghosts.claim(claimer, {
          agentAddress: ghostAddr,
          x402PaymentAddress: ghostAddr, // Ghost address IS the x402 payment address
          sasCredential: sasConfig.credentialPda,
          sasSchema: sasConfig.agentIdentitySchema,
          network: 'devnet',
          ipfsMetadataUri: undefined,
          githubUsername: undefined,
          twitterHandle: undefined,
        })

        s.stop(`✅ Ghost claimed!`)

        // Update Convex to mark Ghost as claimed
        s.start('Updating Convex database...')
        try {
          await markGhostClaimed(ghostAddr, claimer.address, claimSignature)
          s.stop('✅ Convex database updated')
        } catch (error) {
          s.stop(chalk.yellow('⚠️  Convex update failed'))
          log.warn(chalk.gray(`Ghost claimed on-chain but Convex sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }

        // Fetch Ghost Score
        let ghostScore: any
        s.start('Fetching Ghost Score...')
        try {
          ghostScore = await getGhostScore(ghostAddr)
          s.stop('✅ Ghost Score retrieved')
        } catch (error) {
          s.stop(chalk.yellow('⚠️  Ghost Score unavailable'))
          log.warn(chalk.gray(`Could not fetch Ghost Score: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }

        // Success output!
        console.log(chalk.green('\n🎉 Ghost Successfully Claimed!'))
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

        // Display Ghost Score if available
        if (ghostScore) {
          console.log('')
          console.log(chalk.bold('Ghost Score:'))
          console.log(chalk.gray(`  Score: ${ghostScore.score || 0}/1000`))
          console.log(chalk.gray(`  Tier: ${ghostScore.tier || 'Unranked'}`))
          if (ghostScore.breakdown) {
            console.log(chalk.gray(`  Components:`))
            if (ghostScore.breakdown.credentials) console.log(chalk.gray(`    - Credentials: ${ghostScore.breakdown.credentials}`))
            if (ghostScore.breakdown.transactions) console.log(chalk.gray(`    - Transactions: ${ghostScore.breakdown.transactions}`))
            if (ghostScore.breakdown.reputation) console.log(chalk.gray(`    - Reputation: ${ghostScore.breakdown.reputation}`))
          }
        }

        console.log('')
        console.log(chalk.bold('Next Steps:'))
        console.log(chalk.gray('  1. View your Ghost Score: ghost score show'))
        console.log(chalk.gray('  2. Link platform identities: ghost credentials link'))
        console.log(chalk.gray('  3. Build reputation across platforms'))

        outro(chalk.green('✨ Claim complete! Your Ghost Score is now building.'))

      } catch (error) {
        s.stop(chalk.red('❌ Claim transaction failed'))
        log.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'))

        // Provide helpful context based on error type
        const errorMsg = error instanceof Error ? error.message.toLowerCase() : ''

        if (errorMsg.includes('insufficient') || errorMsg.includes('balance')) {
          log.info(chalk.yellow('\\n💡 Insufficient funds'))
          log.info(chalk.gray('  Check wallet balance: solana balance'))
          log.info(chalk.gray('  Request devnet SOL: solana airdrop 2'))
        } else if (errorMsg.includes('already') || errorMsg.includes('exists')) {
          log.info(chalk.yellow('\\n💡 Ghost may already be claimed'))
          log.info(chalk.gray('  Check on-chain status with: ghost agent status <address>'))
        } else if (errorMsg.includes('attestation') || errorMsg.includes('invalid')) {
          log.info(chalk.yellow('\\n💡 SAS attestation issue'))
          log.info(chalk.gray('  Verify attestation was created successfully'))
          log.info(chalk.gray('  Re-run SAS setup if needed: bun packages/web/scripts/setup-sas.ts'))
        } else if (errorMsg.includes('timeout') || errorMsg.includes('network')) {
          log.info(chalk.yellow('\\n💡 Network or RPC issue'))
          log.info(chalk.gray('  Try again with a different RPC endpoint'))
          log.info(chalk.gray('  Set SOLANA_RPC_URL environment variable'))
        } else {
          log.info(chalk.yellow('\\n💡 Troubleshooting:'))
          log.info(chalk.gray('  1. Verify SAS attestation was created'))
          log.info(chalk.gray('  2. Check wallet has sufficient SOL'))
          log.info(chalk.gray('  3. Ensure Ghost is not already claimed'))
          log.info(chalk.gray('  4. Try again in a few moments'))
        }

        handleError(error, { operation: 'claim Ghost' })
        outro(chalk.red('Claim failed'))
        return
      }

    } catch (error) {
      log.error(`Failed to process claim: ${error instanceof Error ? error.message : 'Unknown error'}`)
      outro(chalk.red('Operation failed'))
    }
  })
