/**
 * Agent status command
 */

import type { Command } from 'commander'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  spinner,
  cancel
} from '@clack/prompts'
import { container, ServiceTokens } from '../../core/Container.js'
import type { IAgentService, IWalletService } from '../../types/services.js'

export function registerStatusCommand(parentCommand: Command): void {
  parentCommand
    .command('status')
    .description('Check status of your agents')
    .action(async () => {
      intro(chalk.cyan('📊 Agent Status'))

      try {
        const s = spinner()
        s.start('Checking agent status...')
        
        // Get services from container
        const agentService = container.resolve<IAgentService>(ServiceTokens.AGENT_SERVICE)
        const walletService = container.resolve<IWalletService>(ServiceTokens.WALLET_SERVICE)
        
        // Get current wallet
        const wallet = walletService.getActiveWalletInterface()
        if (!wallet) {
          cancel(chalk.red('No active wallet found. Please select a wallet first.'))
          return
        }
        
        // Get user's agents
        const agents = await agentService.list({
          owner: wallet.address
        })
        
        s.stop('✅ Status updated')
        
        if (agents.length === 0) {
          console.log('\n' + chalk.yellow('You have no registered agents'))
          outro('Register an agent with: npx ghostspeak agent register')
          return
        }

        console.log('\n' + chalk.bold('Your Agents:'))
        console.log('─'.repeat(60))
        
        for (const agent of agents) {
          const statusIcon = agent.isActive ? chalk.green('●') : chalk.red('○')
          const statusText = agent.isActive ? 'Active' : 'Inactive'
          
          console.log(`${statusIcon} ${agent.name}` + chalk.gray(` - ${statusText}`))
          console.log(chalk.gray(`  Agent ID: ${agent.id}`))
          console.log(chalk.gray(`  Address: ${agent.address.toString()}`))
          console.log(chalk.gray(`  Owner: ${agent.owner.toString()}`))
          console.log(chalk.gray(`  Created: ${new Date(Number(agent.createdAt)).toLocaleString()}`))
          console.log(chalk.gray(`  Reputation Score: ${agent.reputationScore}/100`))
          console.log(chalk.gray(`  Capabilities: ${agent.capabilities.join(', ')}`))
          console.log('')
        }

        outro('Status check completed')

      } catch (error) {
        cancel(chalk.red('Status check failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
      }
    })
}