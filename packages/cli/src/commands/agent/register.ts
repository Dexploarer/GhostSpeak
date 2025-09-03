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
import { validateAgentParams, displayRegisteredAgentInfo } from '../agent/helpers.js'
import { container, ServiceTokens } from '../../core/Container.js'
import type { IAgentService } from '../../types/services.js'
import { displayErrorAndCancel } from '../../utils/enhanced-error-handler.js'

export function registerRegisterCommand(parentCommand: Command): void {
  parentCommand
    .command('register')
    .description('Register a new AI agent')
    .option('-n, --name <name>', 'Agent name')
    .option('-d, --description <description>', 'Agent description')
    .option('-c, --capabilities <capabilities>', 'Comma-separated list of capabilities (e.g. automation,coding)')
    .option('--endpoint <endpoint>', 'Service endpoint URL')
    .option('--no-metadata', 'Skip metadata URI prompt')
    .option('-y, --yes', 'Skip confirmation prompt')
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
          
          displayRegisteredAgentInfo(agent)
          
          outro('Agent registration completed')
        } catch (error) {
          s.stop('❌ Registration failed')
          throw error
        }

      } catch (error) {
        displayErrorAndCancel(error, 'Agent registration')
      }
    })
}