/**
 * Ghost Claiming Commands
 * Claim external AI agents (type 10) from x402 facilitators as Ghosts
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
import { initializeClient, getExplorerUrl, handleTransactionError, toSDKSigner } from '../utils/client.js'
import { createSafeSDKClient } from '../utils/sdk-helpers.js'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'

// Type definitions
interface ClaimOptions {
  'external-id'?: string
  platform?: string
  signature?: string
  json?: boolean
}

interface LinkOptions {
  ghost?: string
  'external-id'?: string
  platform?: string
  signature?: string
}

interface ListOptions {
  owner?: string
  json?: boolean
}

export const ghostCommand = new Command('ghost')
  .description('Claim and manage external AI agents (Ghosts)')

// Claim subcommand
ghostCommand
  .command('claim')
  .description('Claim an external AI agent as a Ghost using SAS attestation')
  .option('-e, --external-id <id>', 'External agent ID (e.g., PayAI agent ID, ElizaOS character ID)')
  .option('-p, --platform <platform>', 'Platform name (payai, elizaos, etc.)')
  .option('-s, --signature <signature>', 'SAS attestation signature (hex)')
  .option('--json', 'Output as JSON')
  .action(async (options: ClaimOptions) => {
    intro(chalk.cyan('👻 Claim External Agent as Ghost'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get external ID
      let externalId = options['external-id']
      if (!externalId) {
        const idInput = await text({
          message: 'External agent ID:',
          placeholder: 'agent-123',
          validate: (value) => {
            if (!value) return 'External ID is required'
            if (value.length < 3) return 'ID must be at least 3 characters'
            return
          }
        })

        if (isCancel(idInput)) {
          cancel('Claim cancelled')
          return
        }

        externalId = idInput.toString().trim()
      }

      // Get platform
      let platform = options.platform
      if (!platform) {
        const platformInput = await select({
          message: 'Select platform:',
          options: [
            { value: 'payai', label: 'PayAI - x402 payment network' },
            { value: 'elizaos', label: 'ElizaOS - AI agent framework' },
            { value: 'other', label: 'Other platform' }
          ]
        })

        if (isCancel(platformInput)) {
          cancel('Claim cancelled')
          return
        }

        platform = platformInput.toString()
      }

      // Get SAS attestation signature
      let attestationSignature = options.signature
      if (!attestationSignature) {
        note(
          `${chalk.bold('SAS Attestation Required')}\n\n` +
          `To claim this agent, you need a Solana Attestation Service (SAS) signature.\n\n` +
          `${chalk.yellow('How to get attestation:')}\n` +
          `1. Go to the platform (${platform})\n` +
          `2. Generate an ownership proof for agent: ${externalId}\n` +
          `3. Copy the attestation signature (hex format)\n\n` +
          `${chalk.gray('Example: 0x1234567890abcdef...')}`,
          'Attestation Signature'
        )

        const sigInput = await text({
          message: 'SAS attestation signature:',
          placeholder: '0x...',
          validate: (value) => {
            if (!value) return 'Signature is required'
            if (!value.startsWith('0x')) return 'Signature must start with 0x'
            if (value.length < 10) return 'Invalid signature format'
            return
          }
        })

        if (isCancel(sigInput)) {
          cancel('Claim cancelled')
          return
        }

        attestationSignature = sigInput.toString().trim()
      }

      // Show claim preview
      note(
        `${chalk.bold('Claim Details:')}\n` +
        `${chalk.gray('External ID:')} ${externalId}\n` +
        `${chalk.gray('Platform:')} ${platform}\n` +
        `${chalk.gray('Attestation:')} ${attestationSignature.slice(0, 10)}...${attestationSignature.slice(-8)}\n` +
        `${chalk.gray('Owner:')} ${wallet.address}\n\n` +
        `${chalk.yellow('This will create a Ghost account that you control.')}\n` +
        `${chalk.gray('The external agent will be linked on-chain.')}`,
        'Claim Preview'
      )

      const confirmClaim = await confirm({
        message: 'Claim this agent as a Ghost?'
      })

      if (isCancel(confirmClaim) || !confirmClaim) {
        cancel('Claim cancelled')
        return
      }

      s.start('Claiming agent on blockchain...')

      try {
        // Convert attestation signature to bytes
        const signatureBytes = Buffer.from(attestationSignature.slice(2), 'hex')

        // Claim ghost using SDK
        const result = await safeClient.ghosts.claimGhost(
          toSDKSigner(wallet),
          {
            externalId,
            platform,
            attestationSignature: new Uint8Array(signatureBytes)
          }
        )

        s.stop('✅ Ghost claimed successfully')

        const explorerUrl = getExplorerUrl(result.signature, 'devnet')

        if (options.json) {
          console.log(JSON.stringify({
            success: true,
            ghostAddress: result.ghostAddress,
            signature: result.signature,
            externalId,
            platform,
            explorerUrl
          }, null, 2))
          return
        }

        outro(
          `${chalk.green('✅ Ghost Claimed Successfully!')}\n\n` +
          `${chalk.bold('Ghost Details:')}\n` +
          `${chalk.gray('Ghost Address:')} ${chalk.cyan(result.ghostAddress)}\n` +
          `${chalk.gray('External ID:')} ${externalId}\n` +
          `${chalk.gray('Platform:')} ${platform}\n` +
          `${chalk.gray('Transaction:')} ${result.signature}\n\n` +
          `${chalk.bold('Next Steps:')}\n` +
          `${chalk.gray('•')} Link additional external IDs: ${chalk.cyan(`ghost ghost link`)}\n` +
          `${chalk.gray('•')} View your Ghosts: ${chalk.cyan(`ghost ghost list`)}\n` +
          `${chalk.gray('•')} Build Ghost Score reputation\n\n` +
          `${chalk.gray('Explorer:')} ${chalk.cyan(explorerUrl)}`
        )

      } catch (error) {
        s.stop('❌ Failed to claim ghost')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to claim: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Link subcommand
ghostCommand
  .command('link')
  .description('Link an additional external ID to an existing Ghost')
  .option('-g, --ghost <address>', 'Ghost address')
  .option('-e, --external-id <id>', 'External agent ID to link')
  .option('-p, --platform <platform>', 'Platform name')
  .option('-s, --signature <signature>', 'SAS attestation signature')
  .action(async (options: LinkOptions) => {
    intro(chalk.blue('🔗 Link External ID to Ghost'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get ghost address
      let ghostAddress = options.ghost
      if (!ghostAddress) {
        const addressInput = await text({
          message: 'Ghost address:',
          validate: (value) => {
            if (!value) return 'Ghost address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Please enter a valid Solana address'
            }
          }
        })

        if (isCancel(addressInput)) {
          cancel('Link cancelled')
          return
        }

        ghostAddress = addressInput.toString().trim()
      }

      const ghostAddr = address(ghostAddress)

      // Verify ghost exists
      s.start('Verifying Ghost...')
      const ghostData = await safeClient.ghosts.getGhost(ghostAddr)

      if (!ghostData) {
        s.stop('❌ Ghost not found')
        outro(chalk.red(`No Ghost found at address: ${ghostAddress}`))
        return
      }

      s.stop('✅ Ghost verified')

      // Get external ID
      let externalId = options['external-id']
      if (!externalId) {
        const idInput = await text({
          message: 'External agent ID to link:',
          placeholder: 'agent-456',
          validate: (value) => {
            if (!value) return 'External ID is required'
            if (value.length < 3) return 'ID must be at least 3 characters'
            return
          }
        })

        if (isCancel(idInput)) {
          cancel('Link cancelled')
          return
        }

        externalId = idInput.toString().trim()
      }

      // Get platform
      let platform = options.platform
      if (!platform) {
        const platformInput = await select({
          message: 'Select platform:',
          options: [
            { value: 'payai', label: 'PayAI' },
            { value: 'elizaos', label: 'ElizaOS' },
            { value: 'other', label: 'Other' }
          ]
        })

        if (isCancel(platformInput)) {
          cancel('Link cancelled')
          return
        }

        platform = platformInput.toString()
      }

      // Get attestation signature
      let attestationSignature = options.signature
      if (!attestationSignature) {
        const sigInput = await text({
          message: 'SAS attestation signature:',
          placeholder: '0x...',
          validate: (value) => {
            if (!value) return 'Signature is required'
            if (!value.startsWith('0x')) return 'Signature must start with 0x'
            return
          }
        })

        if (isCancel(sigInput)) {
          cancel('Link cancelled')
          return
        }

        attestationSignature = sigInput.toString().trim()
      }

      // Confirm link
      const confirmLink = await confirm({
        message: `Link external ID "${externalId}" to this Ghost?`
      })

      if (isCancel(confirmLink) || !confirmLink) {
        cancel('Link cancelled')
        return
      }

      s.start('Linking external ID on blockchain...')

      try {
        const signatureBytes = Buffer.from(attestationSignature.slice(2), 'hex')

        const signature = await safeClient.ghosts.linkExternalId(
          toSDKSigner(wallet),
          {
            ghostAddress: ghostAddr,
            externalId,
            platform,
            attestationSignature: new Uint8Array(signatureBytes)
          }
        )

        s.stop('✅ External ID linked successfully')

        const explorerUrl = getExplorerUrl(signature, 'devnet')

        outro(
          `${chalk.green('✅ External ID Linked!')}\n\n` +
          `${chalk.gray('Ghost Address:')} ${ghostAddress}\n` +
          `${chalk.gray('External ID:')} ${externalId}\n` +
          `${chalk.gray('Platform:')} ${platform}\n` +
          `${chalk.gray('Transaction:')} ${signature}\n\n` +
          `${chalk.gray('Explorer:')} ${chalk.cyan(explorerUrl)}`
        )

      } catch (error) {
        s.stop('❌ Failed to link external ID')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to link: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// List subcommand
ghostCommand
  .command('list')
  .description('List Ghosts (claimed external agents)')
  .option('-o, --owner <address>', 'Filter by owner address')
  .option('--json', 'Output as JSON')
  .action(async (options: ListOptions) => {
    intro(chalk.magenta('👻 List Ghosts'))

    try {
      const s = spinner()
      s.start('Fetching Ghosts...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      const ownerAddr = options.owner ? address(options.owner) : wallet.address

      // Fetch ghosts
      const ghosts = await safeClient.ghosts.getGhostsByOwner(ownerAddr)

      s.stop(`✅ Found ${ghosts.length} Ghost(s)`)

      if (ghosts.length === 0) {
        outro(
          `${chalk.yellow('No Ghosts found')}\n\n` +
          `${chalk.gray('Claim an external agent:')}\n` +
          `${chalk.cyan('ghost ghost claim')}`
        )
        return
      }

      if (options.json) {
        console.log(JSON.stringify(ghosts, null, 2))
        return
      }

      // Display ghosts
      for (let i = 0; i < ghosts.length; i++) {
        const ghost = ghosts[i]
        console.log(`\n${chalk.bold.cyan(`Ghost ${i + 1}:`)}`)
        console.log(`${chalk.gray('Address:')} ${ghost.address}`)
        console.log(`${chalk.gray('Status:')} ${ghost.data.status}`)
        console.log(`${chalk.gray('Ghost Score:')} ${Number(ghost.data.ghostScore) / 100}`)
        console.log(`${chalk.gray('Created:')} ${new Date(Number(ghost.data.createdAt) * 1000).toLocaleDateString()}`)

        if (ghost.data.linkedIds && ghost.data.linkedIds.length > 0) {
          console.log(`${chalk.gray('Linked IDs:')}`)
          ghost.data.linkedIds.forEach((id: { platform: string; externalId: string }) => {
            console.log(`  ${chalk.gray('•')} ${id.platform}: ${id.externalId}`)
          })
        }
      }

      outro(
        `\n${chalk.gray('Commands:')}\n` +
        `${chalk.cyan('ghost ghost claim')} - Claim a new Ghost\n` +
        `${chalk.cyan('ghost ghost link')} - Link external IDs`
      )

    } catch (error) {
      log.error(`Failed to list ghosts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Default action
ghostCommand
  .action(async () => {
    intro(chalk.magenta('👻 GhostSpeak Ghost Management'))

    log.info(`\n${chalk.bold('Available Commands:')}\n`)
    log.info(`${chalk.cyan('ghost ghost claim')} - Claim an external AI agent as a Ghost`)
    log.info(`${chalk.cyan('ghost ghost link')} - Link additional external IDs to a Ghost`)
    log.info(`${chalk.cyan('ghost ghost list')} - List your Ghosts`)

    note(
      `${chalk.bold('What are Ghosts?')}\n\n` +
      `Ghosts are external AI agents (type 10) that exist on x402 facilitators\n` +
      `or other platforms. You can claim ownership using Solana Attestation\n` +
      `Service (SAS) and build reputation on-chain.\n\n` +
      `${chalk.yellow('Supported Platforms:')}\n` +
      `${chalk.gray('•')} PayAI - x402 payment network\n` +
      `${chalk.gray('•')} ElizaOS - AI agent framework\n` +
      `${chalk.gray('•')} Custom platforms with SAS integration`,
      'About Ghosts'
    )

    outro('Use --help with any command for more details')
  })
