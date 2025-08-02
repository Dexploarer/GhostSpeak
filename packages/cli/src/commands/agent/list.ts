/**
 * Agent list command
 */

import type { Command } from 'commander'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  spinner
} from '@clack/prompts'
import type { ListOptions } from '../../types/cli-types.js'
import { formatAgentInfo } from '../agent/helpers.js'
import { container, ServiceTokens } from '../../core/Container.js'
import type { IAgentService } from '../../types/services.js'
import { displayErrorAndCancel } from '../../utils/enhanced-error-handler.js'

export function registerListCommand(parentCommand: Command): void {
  parentCommand
    .command('list')
    .description('List all registered agents')
    .option('--limit <limit>', 'Maximum number of agents to display', '10')
    .action(async (options: ListOptions) => {
      intro(chalk.cyan('📋 List Registered Agents'))

      const s = spinner()
      s.start('Fetching agents...')
      
      try {
        // Get AgentService from container
        const agentService = container.resolve<IAgentService>(ServiceTokens.AGENT_SERVICE)
        
        // Fetch agents using service layer
        const agents = await agentService.list({
          limit: parseInt(options.limit)
        })
        
        s.stop('✅ Agents loaded')

        if (agents.length === 0) {
          console.log('\n' + chalk.yellow('No agents found'))
          outro('Try registering an agent with: npx ghostspeak agent register')
          return
        }

        console.log('\n' + chalk.bold(`Available Agents (${agents.length}):`))
        console.log('─'.repeat(60))

        agents.forEach((agent, index) => {
          const formattedInfo = formatAgentInfo(agent)
          
          console.log(chalk.cyan(`${index + 1}. ${formattedInfo.name}`))
          console.log(chalk.gray(`   Address: ${formattedInfo.address}`))
          console.log(chalk.gray(`   Owner: ${agent.owner.toString()}`))
          console.log(chalk.gray(`   Description: ${formattedInfo.description}`))
          console.log(chalk.gray(`   Capabilities: ${formattedInfo.capabilities}`))
          console.log(chalk.gray(`   Status: ${formattedInfo.status === 'Active' ? '🟢 Active' : '🔴 Inactive'}`))
          console.log(chalk.gray(`   Reputation: ${agent.reputationScore}/100`))
          console.log(chalk.gray(`   Created: ${formattedInfo.created}`))
          console.log('')
        })

        outro('Agent listing completed')

      } catch (_) {
        s.stop('❌ Failed to fetch agents')
        displayErrorAndCancel(_, 'Agent listing')
      }
    })
}