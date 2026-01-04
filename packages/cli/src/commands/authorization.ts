/**
 * Authorization Commands
 * Manage pre-authorizations for reputation updates and agent operations
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
import { initializeClient, getExplorerUrl, toSDKSigner } from '../utils/client.js'
import { handleError } from '../utils/error-handler.js'
import { createSafeSDKClient } from '../utils/sdk-helpers.js'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'

// Type definitions
interface CreateOptions {
  agent?: string
  source?: string
  limit?: string
  duration?: string
  json?: boolean
}

interface RevokeOptions {
  authorization?: string
  agent?: string
}

interface ListOptions {
  agent?: string
  json?: boolean
}

interface VerifyOptions {
  authorization?: string
  json?: boolean
}

export const authorizationCommand = new Command('authorization')
  .alias('auth')
  .description('Manage pre-authorizations for trustless reputation updates')

// Create subcommand
authorizationCommand
  .command('create')
  .description('Create a pre-authorization for a facilitator or service')
  .option('-a, --agent <address>', 'Agent address to authorize')
  .option('-s, --source <address>', 'Authorized source address (facilitator, service, etc.)')
  .option('-l, --limit <number>', 'Maximum number of updates allowed')
  .option('-d, --duration <days>', 'Authorization duration in days')
  .option('--json', 'Output as JSON')
  .action(async (options: CreateOptions) => {
    intro(chalk.cyan('🔐 Create Pre-Authorization'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get agent address
      let agentAddress = options.agent
      if (!agentAddress) {
        const addressInput = await text({
          message: 'Agent address to authorize:',
          validate: (value) => {
            if (!value) return 'Agent address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Invalid Solana address'
            }
          }
        })

        if (isCancel(addressInput)) {
          cancel('Authorization cancelled')
          return
        }

        agentAddress = addressInput.toString().trim()
      }

      const agentAddr = address(agentAddress)

      // Verify agent exists
      s.start('Verifying agent...')
      const agentData = await safeClient.agent.getAgentAccount(agentAddr)

      if (!agentData) {
        s.stop('❌ Agent not found')
        outro(chalk.red(`No agent found at: ${agentAddress}`))
        return
      }

      s.stop('✅ Agent verified')

      // Get authorized source
      let authorizedSource = options.source
      if (!authorizedSource) {
        const sourceTypeInput = await select({
          message: 'Authorization type:',
          options: [
            { value: 'facilitator', label: 'x402 Facilitator - For payment-based reputation' },
            { value: 'service', label: 'Service Provider - For service quality ratings' },
            { value: 'oracle', label: 'Oracle - For external data feeds' },
            { value: 'custom', label: 'Custom Address' }
          ]
        })

        if (isCancel(sourceTypeInput)) {
          cancel('Authorization cancelled')
          return
        }

        const sourceType = sourceTypeInput.toString()

        if (sourceType === 'custom' || sourceType === 'facilitator' || sourceType === 'service' || sourceType === 'oracle') {
          const sourceInput = await text({
            message: 'Authorized source address:',
            placeholder: sourceType === 'facilitator' ? 'x402 facilitator pubkey' : 'Service pubkey',
            validate: (value) => {
              if (!value) return 'Source address is required'
              try {
                address(value.trim())
                return
              } catch {
                return 'Invalid Solana address'
              }
            }
          })

          if (isCancel(sourceInput)) {
            cancel('Authorization cancelled')
            return
          }

          authorizedSource = sourceInput.toString().trim()
        }
      }

      if (!authorizedSource) {
        cancel('Authorized source is required')
        return
      }

      const sourceAddr = address(authorizedSource)

      // Get update limit
      let indexLimit = options.limit ? parseInt(options.limit) : 0
      if (!indexLimit) {
        const limitInput = await text({
          message: 'Maximum number of updates allowed:',
          placeholder: '100',
          initialValue: '100',
          validate: (value) => {
            if (!value) return 'Limit is required'
            const limit = parseInt(value)
            if (isNaN(limit) || limit < 1) return 'Limit must be at least 1'
            if (limit > 10000) return 'Limit cannot exceed 10,000'
            return
          }
        })

        if (isCancel(limitInput)) {
          cancel('Authorization cancelled')
          return
        }

        indexLimit = parseInt(limitInput.toString())
      }

      // Get duration
      let durationDays = options.duration ? parseInt(options.duration) : 0
      if (!durationDays) {
        const durationInput = await text({
          message: 'Authorization duration (days):',
          placeholder: '30',
          initialValue: '30',
          validate: (value) => {
            if (!value) return 'Duration is required'
            const days = parseInt(value)
            if (isNaN(days) || days < 1) return 'Duration must be at least 1 day'
            if (days > 365) return 'Duration cannot exceed 365 days'
            return
          }
        })

        if (isCancel(durationInput)) {
          cancel('Authorization cancelled')
          return
        }

        durationDays = parseInt(durationInput.toString())
      }

      // Calculate expiration timestamp
      const expiresAt = BigInt(Math.floor(Date.now() / 1000) + (durationDays * 24 * 60 * 60))

      // Show authorization preview
      note(
        `${chalk.bold('Authorization Details:')}\n` +
        `${chalk.gray('Agent:')} ${agentData.name}\n` +
        `${chalk.gray('Agent Address:')} ${agentAddress}\n` +
        `${chalk.gray('Authorized Source:')} ${authorizedSource}\n` +
        `${chalk.gray('Update Limit:')} ${indexLimit} updates\n` +
        `${chalk.gray('Duration:')} ${durationDays} days\n` +
        `${chalk.gray('Expires:')} ${new Date(Number(expiresAt) * 1000).toLocaleDateString()}\n\n` +
        `${chalk.yellow('⚠️  This allows the source to update reputation up to ' + indexLimit + ' times.')}\n` +
        `${chalk.gray('You can revoke this authorization at any time.')}`,
        'Authorization Preview'
      )

      const confirmCreate = await confirm({
        message: 'Create this authorization?'
      })

      if (isCancel(confirmCreate) || !confirmCreate) {
        cancel('Authorization cancelled')
        return
      }

      s.start('Creating authorization on blockchain...')

      try {
        const signature = await safeClient.authorization.createAuthorization({
          signer: toSDKSigner(wallet),
          agentAddress: agentAddr,
          authorizedSource: sourceAddr,
          indexLimit: BigInt(indexLimit),
          expiresAt,
          network: 'devnet'
        })

        s.stop('✅ Authorization created successfully')

        // Derive authorization PDA
        const { deriveAgentReputationAuthPda } = await import('@ghostspeak/sdk')
        const [authAddress] = await deriveAgentReputationAuthPda({
          programAddress: safeClient.programId,
          agent: agentAddr,
          authorizedSource: sourceAddr
        })

        const explorerUrl = getExplorerUrl(signature, 'devnet')

        if (options.json) {
          console.log(JSON.stringify({
            success: true,
            authorizationAddress: authAddress,
            agentAddress,
            authorizedSource,
            indexLimit,
            expiresAt: expiresAt.toString(),
            signature,
            explorerUrl
          }, null, 2))
          return
        }

        outro(
          `${chalk.green('✅ Authorization Created!')}\n\n` +
          `${chalk.bold('Authorization Details:')}\n` +
          `${chalk.gray('Auth Address:')} ${chalk.cyan(authAddress)}\n` +
          `${chalk.gray('Agent:')} ${agentData.name}\n` +
          `${chalk.gray('Source:')} ${authorizedSource}\n` +
          `${chalk.gray('Limit:')} ${indexLimit} updates\n` +
          `${chalk.gray('Expires:')} ${new Date(Number(expiresAt) * 1000).toLocaleDateString()}\n` +
          `${chalk.gray('Transaction:')} ${signature}\n\n` +
          `${chalk.bold('Next Steps:')}\n` +
          `${chalk.gray('•')} Monitor usage: ${chalk.cyan(`ghost auth list`)}\n` +
          `${chalk.gray('•')} Revoke if needed: ${chalk.cyan(`ghost auth revoke`)}\n\n` +
          `${chalk.gray('Explorer:')} ${chalk.cyan(explorerUrl)}`
        )

      } catch (error) {
        s.stop('❌ Failed to create authorization')
        handleError(error)
      }

    } catch (error) {
      log.error(`Failed to create authorization: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Revoke subcommand
authorizationCommand
  .command('revoke')
  .description('Revoke an existing authorization')
  .option('-a, --authorization <address>', 'Authorization address to revoke')
  .option('--agent <address>', 'Agent address (if auth address unknown)')
  .action(async (options: RevokeOptions) => {
    intro(chalk.red('❌ Revoke Authorization'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get authorization address
      let authAddress = options.authorization
      if (!authAddress) {
        const addressInput = await text({
          message: 'Authorization address:',
          validate: (value) => {
            if (!value) return 'Authorization address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Invalid Solana address'
            }
          }
        })

        if (isCancel(addressInput)) {
          cancel('Revoke cancelled')
          return
        }

        authAddress = addressInput.toString().trim()
      }

      const authAddr = address(authAddress)

      // Fetch authorization
      s.start('Fetching authorization...')
      const authData = await safeClient.authorization.getAuthorization(authAddr)

      if (!authData) {
        s.stop('❌ Authorization not found')
        outro(chalk.red(`No authorization found at: ${authAddress}`))
        return
      }

      s.stop('✅ Authorization loaded')

      // Show authorization details
      note(
        `${chalk.bold('Authorization to Revoke:')}\n` +
        `${chalk.gray('Agent:')} ${authData.agent}\n` +
        `${chalk.gray('Source:')} ${authData.authorizedSource}\n` +
        `${chalk.gray('Used:')} ${authData.currentIndex}/${authData.indexLimit}\n` +
        `${chalk.gray('Expires:')} ${new Date(Number(authData.expiresAt) * 1000).toLocaleDateString()}\n\n` +
        `${chalk.red('⚠️  Revoking will prevent all future updates from this source.')}`,
        'Revoke Confirmation'
      )

      const confirmRevoke = await confirm({
        message: 'Revoke this authorization?'
      })

      if (isCancel(confirmRevoke) || !confirmRevoke) {
        cancel('Revoke cancelled')
        return
      }

      s.start('Revoking authorization on blockchain...')

      try {
        const signature = await safeClient.authorization.revokeAuthorization({
          signer: toSDKSigner(wallet),
          agentAddress: address(authData.agent),
          authorizedSource: address(authData.authorizedSource)
        })

        s.stop('✅ Authorization revoked successfully')

        const explorerUrl = getExplorerUrl(signature, 'devnet')

        outro(
          `${chalk.green('✅ Authorization Revoked!')}\n\n` +
          `${chalk.gray('Authorization:')} ${authAddress}\n` +
          `${chalk.gray('Transaction:')} ${signature}\n\n` +
          `${chalk.gray('Explorer:')} ${chalk.cyan(explorerUrl)}`
        )

      } catch (error) {
        s.stop('❌ Failed to revoke authorization')
        handleError(error)
      }

    } catch (error) {
      log.error(`Failed to revoke: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// List subcommand
authorizationCommand
  .command('list')
  .description('List authorizations for an agent')
  .option('-a, --agent <address>', 'Agent address')
  .option('--json', 'Output as JSON')
  .action(async (options: ListOptions) => {
    intro(chalk.blue('📋 List Authorizations'))

    try {
      const s = spinner()
      s.start('Fetching authorizations...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get agent address
      let agentAddress = options.agent
      if (!agentAddress) {
        const addressInput = await text({
          message: 'Agent address:',
          validate: (value) => {
            if (!value) return 'Agent address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Invalid Solana address'
            }
          }
        })

        if (isCancel(addressInput)) {
          cancel('Operation cancelled')
          return
        }

        agentAddress = addressInput.toString().trim()
      }

      const agentAddr = address(agentAddress)

      // Fetch authorizations
      const authorizations = await safeClient.authorization.getAuthorizationsByAgent(agentAddr)

      s.stop(`✅ Found ${authorizations.length} authorization(s)`)

      if (authorizations.length === 0) {
        outro(
          `${chalk.yellow('No authorizations found')}\n\n` +
          `${chalk.gray('Create an authorization:')}\n` +
          `${chalk.cyan('ghost auth create')}`
        )
        return
      }

      if (options.json) {
        console.log(JSON.stringify(authorizations, null, 2))
        return
      }

      // Display authorizations
      for (let i = 0; i < authorizations.length; i++) {
        const auth = authorizations[i]
        const now = Math.floor(Date.now() / 1000)
        const isExpired = Number(auth.data.expiresAt) < now
        const isExhausted = auth.data.currentIndex >= auth.data.indexLimit

        console.log(`\n${chalk.bold.cyan(`Authorization ${i + 1}:`)}`)
        console.log(`${chalk.gray('Address:')} ${auth.address}`)
        console.log(`${chalk.gray('Source:')} ${auth.data.authorizedSource}`)
        console.log(`${chalk.gray('Usage:')} ${auth.data.currentIndex}/${auth.data.indexLimit}`)
        console.log(`${chalk.gray('Expires:')} ${new Date(Number(auth.data.expiresAt) * 1000).toLocaleDateString()}`)

        let status = chalk.green('Active')
        if (isExpired) status = chalk.red('Expired')
        if (isExhausted) status = chalk.yellow('Exhausted')
        if (auth.data.revoked) status = chalk.red('Revoked')

        console.log(`${chalk.gray('Status:')} ${status}`)
      }

      outro(
        `\n${chalk.gray('Commands:')}\n` +
        `${chalk.cyan('ghost auth create')} - Create new authorization\n` +
        `${chalk.cyan('ghost auth revoke')} - Revoke an authorization\n` +
        `${chalk.cyan('ghost auth verify')} - Verify authorization status`
      )

    } catch (error) {
      log.error(`Failed to list authorizations: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Verify subcommand
authorizationCommand
  .command('verify')
  .description('Verify an authorization is valid')
  .option('-a, --authorization <address>', 'Authorization address')
  .option('--json', 'Output as JSON')
  .action(async (options: VerifyOptions) => {
    intro(chalk.green('✅ Verify Authorization'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get authorization address
      let authAddress = options.authorization
      if (!authAddress) {
        const addressInput = await text({
          message: 'Authorization address:',
          validate: (value) => {
            if (!value) return 'Authorization address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Invalid Solana address'
            }
          }
        })

        if (isCancel(addressInput)) {
          cancel('Verification cancelled')
          return
        }

        authAddress = addressInput.toString().trim()
      }

      const authAddr = address(authAddress)

      // Fetch and verify authorization
      s.start('Verifying authorization...')
      const authData = await safeClient.authorization.getAuthorization(authAddr)

      if (!authData) {
        s.stop('❌ Authorization not found')
        outro(chalk.red(`No authorization found at: ${authAddress}`))
        return
      }

      // Check validity
      const now = Math.floor(Date.now() / 1000)
      const isExpired = Number(authData.expiresAt) < now
      const isExhausted = authData.currentIndex >= authData.indexLimit
      const isRevoked = authData.revoked
      const isValid = !isExpired && !isExhausted && !isRevoked

      s.stop(isValid ? '✅ Authorization is valid' : '❌ Authorization is invalid')

      if (options.json) {
        console.log(JSON.stringify({
          valid: isValid,
          expired: isExpired,
          exhausted: isExhausted,
          revoked: isRevoked,
          currentIndex: authData.currentIndex.toString(),
          indexLimit: authData.indexLimit.toString(),
          expiresAt: authData.expiresAt.toString(),
          ...authData
        }, null, 2))
        return
      }

      const statusColor = isValid ? chalk.green : chalk.red
      const statusText = isValid ? 'VALID' : 'INVALID'

      outro(
        `${statusColor(`Authorization Status: ${statusText}`)}\n\n` +
        `${chalk.bold('Details:')}\n` +
        `${chalk.gray('Address:')} ${authAddress}\n` +
        `${chalk.gray('Agent:')} ${authData.agent}\n` +
        `${chalk.gray('Source:')} ${authData.authorizedSource}\n` +
        `${chalk.gray('Usage:')} ${authData.currentIndex}/${authData.indexLimit}\n` +
        `${chalk.gray('Expires:')} ${new Date(Number(authData.expiresAt) * 1000).toLocaleString()}\n\n` +
        `${chalk.bold('Validation:')}\n` +
        `${chalk.gray('•')} Expired: ${isExpired ? chalk.red('Yes') : chalk.green('No')}\n` +
        `${chalk.gray('•')} Exhausted: ${isExhausted ? chalk.red('Yes') : chalk.green('No')}\n` +
        `${chalk.gray('•')} Revoked: ${isRevoked ? chalk.red('Yes') : chalk.green('No')}\n` +
        `${chalk.gray('•')} Valid: ${isValid ? chalk.green('Yes') : chalk.red('No')}`
      )

    } catch (error) {
      log.error(`Failed to verify: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Default action
authorizationCommand
  .action(async () => {
    intro(chalk.blue('🔐 GhostSpeak Authorization Management'))

    log.info(`\n${chalk.bold('Available Commands:')}\n`)
    log.info(`${chalk.cyan('ghost auth create')} - Create a pre-authorization`)
    log.info(`${chalk.cyan('ghost auth revoke')} - Revoke an authorization`)
    log.info(`${chalk.cyan('ghost auth list')} - List authorizations for an agent`)
    log.info(`${chalk.cyan('ghost auth verify')} - Verify authorization validity`)

    note(
      `${chalk.bold('What are Pre-Authorizations?')}\n\n` +
      `Pre-authorizations allow you to grant limited, trustless permission\n` +
      `for facilitators or services to update your agent's reputation.\n\n` +
      `${chalk.yellow('Key Features:')}\n` +
      `${chalk.gray('•')} Time-limited permissions (set expiration)\n` +
      `${chalk.gray('•')} Update limits (prevent abuse)\n` +
      `${chalk.gray('•')} Instant revocation (cancel anytime)\n` +
      `${chalk.gray('•')} On-chain verification (trustless)\n\n` +
      `${chalk.yellow('Use Cases:')}\n` +
      `${chalk.gray('•')} x402 facilitators updating payment reputation\n` +
      `${chalk.gray('•')} Service providers recording quality ratings\n` +
      `${chalk.gray('•')} Oracles feeding external reputation data`,
      'About Authorizations'
    )

    outro('Use --help with any command for more details')
  })
