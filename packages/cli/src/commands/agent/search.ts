/**
 * Agent search command
 */

import type { Command } from 'commander'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  multiselect,
  spinner,
  isCancel,
  cancel
} from '@clack/prompts'
import { formatAgentInfo } from '../agent/helpers.js'
import { container, ServiceTokens } from '../../core/Container.js'
import type { IAgentService } from '../../types/services.js'

export function registerSearchCommand(parentCommand: Command): void {
  parentCommand
    .command('search')
    .description('Search agents by capabilities')
    .action(async () => {
      intro(chalk.cyan('🔍 Search AI Agents'))

      try {
        const capabilities = await multiselect({
          message: 'Select capabilities to search for:',
          options: [
            { value: 'data-analysis', label: 'Data Analysis' },
            { value: 'writing', label: 'Writing & Content Creation' },
            { value: 'coding', label: 'Programming & Development' },
            { value: 'translation', label: 'Language Translation' },
            { value: 'image-processing', label: 'Image Processing' },
            { value: 'automation', label: 'Task Automation' },
            { value: 'research', label: 'Research & Information Gathering' }
          ]
        })

        if (isCancel(capabilities)) {
          cancel('Search cancelled')
          return
        }

        const s = spinner()
        s.start('Searching for agents...')
        
        // Get AgentService from container
        const agentService = container.resolve<IAgentService>(ServiceTokens.AGENT_SERVICE)
        
        // Search agents using service layer
        const results = await agentService.list({
          // Add capability filter to service interface
          limit: 50
        })
        
        // Filter results by capabilities
        const filteredResults = results.filter(agent => 
          agent.capabilities.some(cap => (capabilities as string[]).includes(cap))
        )
        
        s.stop('✅ Search completed')

        if (filteredResults.length === 0) {
          console.log('\n' + chalk.yellow(`No agents found with capabilities: ${capabilities.join(', ')}`))
          outro('Try searching with different capabilities')
          return
        }

        console.log('\n' + chalk.bold(`Found ${filteredResults.length} agents with capabilities: ${capabilities.join(', ')}`))
        console.log('─'.repeat(60))
        
        filteredResults.forEach((agent, index) => {
          const matchingCaps = agent.capabilities.filter((cap) => (capabilities as string[]).includes(cap))
          const formattedInfo = formatAgentInfo(agent)
          
          console.log(chalk.cyan(`${index + 1}. ${formattedInfo.name}`))
          console.log(chalk.gray(`   Address: ${formattedInfo.address}`))
          console.log(chalk.gray(`   Matches: ${matchingCaps.join(', ')}`))
          console.log(chalk.gray(`   All capabilities: ${formattedInfo.capabilities}`))
          console.log(chalk.gray(`   Reputation: ${agent.reputationScore}/100`))
          console.log(chalk.gray(`   Status: ${formattedInfo.status === 'Active' ? '🟢 Active' : '🔴 Inactive'}`))
          console.log('')
        })
        
        outro('Search completed')

      } catch (_error) {
        cancel(chalk.red('Search failed: ' + (error instanceof Error ? _error.message : 'Unknown error')))
      }
    })
}