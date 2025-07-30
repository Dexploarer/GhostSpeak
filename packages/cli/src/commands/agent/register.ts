/**
 * Agent registration command
 */

import type { Command } from 'commander'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  spinner,
  isCancel,
  cancel
} from '@clack/prompts'
import { registerAgentPrompts } from '../../prompts/agent.js'
import type { RegisterOptions } from '../../types/cli-types.js'
import { validateAgentParams } from '../agent/helpers.js'
import { container, ServiceTokens } from '../../core/Container.js'
import type { IAgentService } from '../../types/services.js'
import { displayErrorAndCancel } from '../../utils/enhanced-error-handler.js'

export function registerRegisterCommand(parentCommand: Command): void {
  parentCommand
    .command('register')
    .description('Register a new AI agent')
    .option('-n, --name <name>', 'Agent name')
    .option('-d, --description <description>', 'Agent description')
    .option('--endpoint <endpoint>', 'Service endpoint URL')
    .action(async (_options: RegisterOptions) => {
      intro(chalk.cyan('🤖 Register New AI Agent'))

      try {
        const agentData = await registerAgentPrompts(_options)
        
        if (isCancel(agentData)) {
          cancel('Agent registration cancelled')
          return
        }

        // Validate agent parameters
        const validationError = validateAgentParams({
          name: agentData.name,
          description: agentData.description,
          capabilities: agentData.capabilities
        })
        
        if (validationError) {
          cancel(chalk.red(validationError))
          return
        }

        // Get AgentService from container
        const agentService = container.resolve<IAgentService>(ServiceTokens.AGENT_SERVICE)

        const s = spinner()
        s.start('Registering agent...')
        
        try {
          // Use service layer to register agent
          const agent = await agentService.register({
            name: agentData.name,
            description: agentData.description,
            capabilities: agentData.capabilities,
            category: agentData.capabilities[0] || 'automation',
            metadata: {
              serviceEndpoint: agentData.serviceEndpoint
            }
          })
          
          s.stop('✅ Agent registered successfully!')
          
          console.log('\n' + chalk.green('🎉 Your agent has been registered!'))
          console.log(chalk.gray(`Name: ${agent.name}`))
          console.log(chalk.gray(`Description: ${agent.description}`))
          console.log(chalk.gray(`Capabilities: ${agent.capabilities.join(', ')}`))
          console.log(chalk.gray(`Agent ID: ${agent.id}`))
          console.log(chalk.gray(`Agent Address: ${agent.address.toString()}`))
          console.log('')
          console.log(chalk.yellow('💡 Agent data stored locally'))
          console.log(chalk.yellow('💡 Use your agent ID for future operations:'))
          console.log(chalk.gray(`   ${agent.id}`))
          
          outro('Agent registration completed')
        } catch (error: unknown) {
          s.stop('❌ Registration failed')
          throw error
        }

      } catch (error) {
        displayErrorAndCancel(error, 'Agent registration')
      }
    })
}