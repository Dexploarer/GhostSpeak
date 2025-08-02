/**
 * Agent update command
 */

import type { Command } from 'commander'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  text, 
  select,
  multiselect,
  confirm,
  spinner,
  isCancel,
  cancel
} from '@clack/prompts'
import type { UpdateOptions } from '../../types/cli-types.js'
import { isValidUrl } from '../../types/cli-types.js'
import { container, ServiceTokens } from '../../core/Container.js'
import type { IAgentService } from '../../types/services.js'

export function registerUpdateCommand(parentCommand: Command): void {
  parentCommand
    .command('update')
    .description('Update your AI agent details')
    .option('--agent-id <id>', 'Agent ID to update')
    .action(async (options: UpdateOptions) => {
      intro(chalk.cyan('🔄 Update AI Agent'))

      try {
        const s = spinner()
        s.start('Loading your agents...')
        
        // Get AgentService from container
        const agentService = container.resolve<IAgentService>(ServiceTokens.AGENT_SERVICE)
        
        // Get user's agents
        const myAgents = await agentService.list({})
        
        s.stop('✅ Agents loaded')
        
        if (myAgents.length === 0) {
          cancel('You have no registered agents to update')
          return
        }

        let selectedAgentId: string
        
        if (options.agentId) {
          selectedAgentId = options.agentId
        } else {
          const selectedAgent = await select({
            message: 'Select agent to update:',
            options: myAgents.map((agent) => ({
              value: agent.id,
              label: `${agent.name} (${agent.isActive ? 'Active' : 'Inactive'})`
            }))
          })

          if (isCancel(selectedAgent)) {
            cancel('Update cancelled')
            return
          }

          selectedAgentId = selectedAgent as string
        }

        // Get current agent details
        const currentAgent = await agentService.getById(selectedAgentId)
        
        if (!currentAgent) {
          cancel('Agent not found')
          return
        }

        console.log('\n' + chalk.bold('Current Agent Details:'))
        console.log('─'.repeat(40))
        console.log(chalk.cyan('Name:') + ` ${currentAgent.name}`)
        console.log(chalk.cyan('Description:') + ` ${currentAgent.description}`)
        console.log(chalk.cyan('Capabilities:') + ` ${currentAgent.capabilities.join(', ')}`)
        console.log(chalk.cyan('Reputation:') + ` ${currentAgent.reputationScore}/100`)
        console.log(chalk.cyan('Agent ID:') + ` ${currentAgent.id}`)

        // Update options
        const updateChoice = await select({
          message: 'What would you like to update?',
          options: [
            { value: 'name', label: '📝 Name' },
            { value: 'description', label: '📄 Description' },
            { value: 'endpoint', label: '🔗 Service Endpoint' },
            { value: 'capabilities', label: '🛠️  Capabilities' },
            { value: 'price', label: '💰 Pricing' },
            { value: 'all', label: '📋 Update Everything' }
          ]
        })

        if (isCancel(updateChoice)) {
          cancel('Update cancelled')
          return
        }

        const updates: {
          name?: string
          description?: string
          endpoint?: string
          capabilities?: string[]
          pricePerTask?: string
          [key: string]: unknown
        } = {}

        // Name update
        if (updateChoice === 'name' || updateChoice === 'all') {
          const newName = await text({
            message: 'New agent name:',
            placeholder: currentAgent.name,
            initialValue: updateChoice === 'all' ? currentAgent.name : undefined,
            validate: (value) => {
              if (!value) return 'Name is required'
              if (value.length < 3) return 'Name must be at least 3 characters'
            }
          })

          if (isCancel(newName)) {
            cancel('Update cancelled')
            return
          }

          updates.name = newName
        }

        // Description update
        if (updateChoice === 'description' || updateChoice === 'all') {
          const newDescription = await text({
            message: 'New description:',
            placeholder: currentAgent.description,
            initialValue: updateChoice === 'all' ? currentAgent.description : undefined,
            validate: (value) => {
              if (!value) return 'Description is required'
              if (value.length < 20) return 'Description must be at least 20 characters'
            }
          })

          if (isCancel(newDescription)) {
            cancel('Update cancelled')
            return
          }

          updates.description = newDescription
        }

        // Endpoint update
        if (updateChoice === 'endpoint' || updateChoice === 'all') {
          const newEndpoint = await text({
            message: 'New service endpoint URL:',
            placeholder: 'https://api.example.com/agent',
            initialValue: updateChoice === 'all' ? undefined : undefined,
            validate: (value) => {
              if (!value) return 'Endpoint is required'
              if (!isValidUrl(value)) {
                return 'Please enter a valid URL'
              }
              return
            }
          })

          if (isCancel(newEndpoint)) {
            cancel('Update cancelled')
            return
          }

          updates.endpoint = newEndpoint
        }

        // Capabilities update
        if (updateChoice === 'capabilities' || updateChoice === 'all') {
          const newCapabilities = await multiselect({
            message: 'Select agent capabilities:',
            options: [
              { value: 'data-analysis', label: '📊 Data Analysis' },
              { value: 'writing', label: '✍️  Writing & Content Creation' },
              { value: 'coding', label: '💻 Programming & Development' },
              { value: 'debugging', label: '🐛 Debugging' },
              { value: 'code-review', label: '🔍 Code Review' },
              { value: 'translation', label: '🌐 Language Translation' },
              { value: 'image-processing', label: '🖼️  Image Processing' },
              { value: 'automation', label: '🤖 Task Automation' }
            ],
            required: true
          })

          if (isCancel(newCapabilities)) {
            cancel('Update cancelled')
            return
          }

          updates.capabilities = newCapabilities
        }

        // Price update (pricing information in metadata)
        if (updateChoice === 'price' || updateChoice === 'all') {
          const newPrice = await text({
            message: 'New price per task (in SOL):',
            placeholder: '0.001',
            validate: (value) => {
              if (!value) return 'Price is required'
              const num = parseFloat(value)
              if (isNaN(num) || num < 0) return 'Please enter a valid positive number'
            }
          })

          if (isCancel(newPrice)) {
            cancel('Update cancelled')
            return
          }

          updates.pricing = { pricePerTask: parseFloat(newPrice) }
        }

        // Confirmation
        console.log('\n' + chalk.bold('📋 Update Summary:'))
        console.log('─'.repeat(40))
        
        Object.entries(updates).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            console.log(chalk.cyan(`${key}:`) + ` ${value.join(', ')}`)
          } else {
            console.log(chalk.cyan(`${key}:`) + ` ${value}`)
          }
        })

        const confirmed = await confirm({
          message: 'Apply these updates?'
        })

        if (isCancel(confirmed) || !confirmed) {
          cancel('Update cancelled')
          return
        }

        const updateSpinner = spinner()
        updateSpinner.start('Updating agent...')

        try {
          // Use service layer to update agent
          const updatedAgent = await agentService.update(selectedAgentId, {
            name: updates.name,
            description: updates.description,
            capabilities: updates.capabilities,
            metadata: {
              endpoint: updates.endpoint,
              pricing: updates.pricing
            }
          })

          updateSpinner.stop('✅ Agent updated successfully!')

          console.log('\n' + chalk.green('🎉 Agent has been updated!'))
          console.log(chalk.gray(`Agent ID: ${updatedAgent.id}`))
          console.log(chalk.gray(`Name: ${updatedAgent.name}`))
          console.log(chalk.gray(`Description: ${updatedAgent.description}`))
          console.log(chalk.gray('Changes have been saved'))

          outro('Agent update completed')
        } catch (_) {
          updateSpinner.stop('❌ Update failed')
          throw _error
        }

      } catch (_) {
        cancel(chalk.red('Agent update failed: ' + (error instanceof Error ? _error.message : 'Unknown error')))
      }
    })
}