/**
 * Agent UUID lookup command
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  text, 
  spinner,
  isCancel,
  cancel
} from '@clack/prompts'
import { AgentWalletManager } from '../../utils/agentWallet.js'

export function registerUuidCommand(parentCommand: Command): void {
  parentCommand
    .command('uuid')
    .description('Look up agent by UUID')
    .argument('[uuid]', 'Agent UUID')
    .action(async (uuid) => {
      intro(chalk.cyan('🔍 Agent UUID Lookup'))

      try {
        if (!uuid) {
          uuid = await text({
            message: 'Enter agent UUID:',
            placeholder: 'e.g., 550e8400-e29b-41d4-a716-446655440000',
            validate: (value) => {
              if (!value) return 'UUID is required'
              if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
                return 'Invalid UUID format'
              }
            }
          })

          if (isCancel(uuid)) {
            cancel('Lookup cancelled')
            return
          }
        }

        const s = spinner()
        s.start('Looking up agent...')
        
        const credentials = await AgentWalletManager.loadCredentialsByUuid(uuid as string)
        
        if (!credentials) {
          s.stop('❌ Agent not found')
          console.log(chalk.yellow('\nAgent not found for UUID: ' + uuid))
          outro('Make sure the UUID is correct and the agent is registered on this device')
          return
        }

        s.stop('✅ Agent found')

        console.log('\n' + chalk.bold('🤖 Agent Details:'))
        console.log('─'.repeat(50))
        console.log(chalk.cyan('Name:') + ` ${credentials.name}`)
        console.log(chalk.cyan('Agent ID:') + ` ${credentials.agentId}`)
        console.log(chalk.cyan('UUID:') + ` ${credentials.uuid}`)
        console.log(chalk.cyan('Description:') + ` ${credentials.description}`)
        console.log(chalk.cyan('Agent Wallet:') + ` ${credentials.agentWallet.publicKey}`)
        console.log(chalk.cyan('Owner:') + ` ${credentials.ownerWallet}`)
        console.log(chalk.cyan('Created:') + ` ${new Date(credentials.createdAt).toLocaleString()}`)
        console.log(chalk.cyan('Updated:') + ` ${new Date(credentials.updatedAt).toLocaleString()}`)
        
        if (credentials.cnftMint) {
          console.log(chalk.cyan('CNFT Mint:') + ` ${credentials.cnftMint}`)
        }
        
        if (credentials.merkleTree) {
          console.log(chalk.cyan('Merkle Tree:') + ` ${credentials.merkleTree}`)
        }

        outro('Agent lookup completed')
      } catch (error) {
        cancel(chalk.red('Lookup failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
      }
    })
}