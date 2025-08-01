/**
 * Marketplace create service listing command
 */

import type { Command } from 'commander'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  text, 
  select,
  confirm,
  spinner,
  isCancel,
  cancel
} from '@clack/prompts'
import { initializeClient, getExplorerUrl, getAddressExplorerUrl, handleTransactionError, toSDKSigner } from '../../utils/client.js'
import { AgentWalletManager, AgentCNFTManager } from '../../utils/agent-wallet.js'
import type { CreateServiceOptions } from '../../types/cli-types.js'
import { 
  deriveServiceListingPda, 
  deriveUserRegistryPda, 
  deriveAgentPda,
  generateUniqueId,
  solToLamports,
  getDefaultPaymentToken
} from '../../utils/pda.js'

export function registerCreateCommand(parentCommand: Command): void {
  parentCommand
    .command('create')
    .description('Create a new service listing')
    .action(async (options: CreateServiceOptions) => {
      intro(chalk.magenta('📝 Create Service Listing'))
      
      // Acknowledge options for future implementation
      void options

      try {
        const title = await text({
          message: 'Service title:',
          placeholder: 'e.g., Professional Data Analysis',
          validate: (value) => {
            if (!value) return 'Title is required'
            if (value.length < 5) return 'Title must be at least 5 characters'
          }
        })

        if (isCancel(title)) {
          cancel('Service creation cancelled')
          return
        }

        const description = await text({
          message: 'Service description:',
          placeholder: 'Detailed description of what you offer...',
          validate: (value) => {
            if (!value) return 'Description is required'
            if (value.length < 20) return 'Description must be at least 20 characters'
          }
        })

        if (isCancel(description)) {
          cancel('Service creation cancelled')
          return
        }

        const category = await select({
          message: 'Select service category:',
          options: [
            { value: 'analytics', label: '📊 Analytics & Data Science' },
            { value: 'content', label: '✍️  Content & Writing' },
            { value: 'development', label: '💻 Development & Programming' },
            { value: 'design', label: '🎨 Design & Creative' },
            { value: 'automation', label: '🤖 Automation & Workflows' },
            { value: 'consulting', label: '💼 Consulting & Strategy' }
          ]
        })

        if (isCancel(category)) {
          cancel('Service creation cancelled')
          return
        }

        const price = await text({
          message: 'Service price (in SOL):',
          placeholder: '0.5',
          validate: (value) => {
            if (!value) return 'Price is required'
            const num = parseFloat(value)
            if (isNaN(num) || num <= 0) return 'Please enter a valid positive number'
          }
        })

        if (isCancel(price)) {
          cancel('Service creation cancelled')
          return
        }

        // Confirmation
        console.log('\n' + chalk.bold('📋 Service Listing Summary:'))
        console.log('─'.repeat(40))
        console.log(chalk.magenta('Title:') + ` ${title}`)
        console.log(chalk.magenta('Category:') + ` ${category}`)
        console.log(chalk.magenta('Price:') + ` ${price} SOL`)
        console.log(chalk.magenta('Description:') + ` ${description}`)

        const confirmed = await confirm({
          message: 'Create this service listing?'
        })

        if (isCancel(confirmed) || !confirmed) {
          cancel('Service creation cancelled')
          return
        }

        const s = spinner()
        s.start('Connecting to Solana network...')
        
        // Initialize SDK client
        const { client, wallet } = await initializeClient('devnet')
        s.stop('✅ Connected')
        
        // Check for registered agents using real on-chain data
        s.start('Checking for registered agents on-chain...')
        
        const onChainAgents = await client.agent.getUserAgents(wallet.address)
        
        if (onChainAgents.length === 0) {
          s.stop('❌ No agent found on-chain')
          console.log(chalk.yellow('\n⚠️  You need to register an agent first!'))
          outro('Run: npx ghostspeak agent register')
          return
        }
        
        s.stop('✅ On-chain agent(s) found')
        
        // Also check for local credentials to get additional metadata
        const localCredentials = await AgentWalletManager.getAgentsByOwner(wallet.address)
        
        // Select agent for the service listing
        let selectedAgent
        if (onChainAgents.length === 1) {
          selectedAgent = onChainAgents[0]
        } else {
          const selectedAgentAddress = await select({
            message: 'Select agent for this service:',
            options: onChainAgents.map(agent => {
              // Try to find matching local credentials for display name
              const localCred = localCredentials.find(cred => 
                cred.ownerWallet === wallet.address.toString()
              )
              return {
                value: agent.address.toString(),
                label: localCred ? `${localCred.name} (${agent.address.toString().slice(0, 8)}...)` : agent.address.toString()
              }
            })
          })
          
          if (isCancel(selectedAgentAddress)) {
            cancel('Service creation cancelled')
            return
          }
          
          selectedAgent = onChainAgents.find(agent => agent.address.toString() === selectedAgentAddress) ?? null
        }
        
        if (!selectedAgent) {
          cancel('Invalid agent selection')
          return
        }
        
        // Agent ownership is already verified by the on-chain query
        console.log('\n' + chalk.green('✅ Using on-chain agent:'))
        console.log(chalk.gray(`  Address: ${selectedAgent.address.toString()}`))
        console.log(chalk.gray(`  Authority: ${selectedAgent.data.authority.toString()}`))
        
        // Try to get local credentials for additional info
        const matchingCredentials = localCredentials.find(cred => 
          cred.ownerWallet === wallet.address.toString()
        )
        
        if (matchingCredentials) {
          console.log(chalk.gray(`  Local Name: ${matchingCredentials.name}`))
          console.log(chalk.gray(`  UUID: ${matchingCredentials.uuid}`))
        }
        
        // Use the agent's on-chain address directly
        const agentAddress = selectedAgent.address
        
        s.start('Creating service listing on the blockchain...')
        
        try {
          // Generate unique listing ID and derive addresses
          const listingId = generateUniqueId('listing')
          const serviceListingAddress = await deriveServiceListingPda(
            client.config.programId!,
            wallet.address,
            listingId
          )
          const _userRegistryAddress = await deriveUserRegistryPda(
            client.config.programId!,
            wallet.address
          )
          
          const result = await client.marketplace.createServiceListing(
            toSDKSigner(wallet),
            {
              agentAddress,
              title: title as string,
              description: description as string,
              price: solToLamports(price as string),
              serviceType: category as string,
              paymentToken: getDefaultPaymentToken()
            }
          )
          
          s.stop('✅ Service listing created!')

          console.log('\n' + chalk.green('🎉 Your service is now live in the marketplace!'))
          console.log(chalk.gray(`Service ID: ${serviceListingAddress.toString()}`))
          console.log(chalk.gray(`Agent Address: ${selectedAgent.address.toString()}`))
          if (matchingCredentials) {
            console.log(chalk.gray(`Agent Name: ${matchingCredentials.name}`))
            console.log(chalk.gray(`Agent UUID: ${matchingCredentials.uuid}`))
          }
          console.log('')
          console.log(chalk.cyan('Transaction:'), getExplorerUrl(result.signature, 'devnet'))
          console.log(chalk.cyan('Listing:'), getAddressExplorerUrl(serviceListingAddress.toString(), 'devnet'))
          console.log('')
          console.log(chalk.yellow('💡 Service linked to on-chain agent with verified ownership'))
          
          outro('Service creation completed')
        } catch (error: unknown) {
          s.stop('❌ Creation failed')
          throw new Error(handleTransactionError(error as Error))
        }

      } catch (error) {
        cancel(chalk.red('Failed to create service: ' + (error instanceof Error ? error.message : 'Unknown error')))
      }
    })
}