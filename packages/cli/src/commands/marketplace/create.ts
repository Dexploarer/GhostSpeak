/**
 * Marketplace create service listing command
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
  cancel
} from '@clack/prompts'
import { initializeClient, getExplorerUrl, getAddressExplorerUrl, handleTransactionError, toSDKSigner } from '../../utils/client.js'
import { AgentWalletManager, AgentCNFTManager } from '../../utils/agentWallet.js'
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
        
        // Check for registered agents using new credential system
        s.start('Checking for registered agents...')
        
        const myAgentCredentials = await AgentWalletManager.getAgentsByOwner(wallet.address)
        
        if (myAgentCredentials.length === 0) {
          s.stop('❌ No agent found')
          console.log(chalk.yellow('\n⚠️  You need to register an agent first!'))
          outro('Run: npx ghostspeak agent register')
          return
        }
        
        s.stop('✅ Agent(s) found')
        
        // Select agent for the service listing
        let selectedCredentials
        if (myAgentCredentials.length === 1) {
          selectedCredentials = myAgentCredentials[0]
        } else {
          const selectedAgentId = await select({
            message: 'Select agent for this service:',
            options: myAgentCredentials.map(cred => ({
              value: cred.agentId,
              label: `${cred.name} (UUID: ${cred.uuid})`
            }))
          })
          
          if (isCancel(selectedAgentId)) {
            cancel('Service creation cancelled')
            return
          }
          
          selectedCredentials = myAgentCredentials.find(cred => cred.agentId === selectedAgentId) ?? null
        }
        
        if (!selectedCredentials) {
          cancel('Invalid agent selection')
          return
        }
        
        // Verify ownership using CNFT or credentials
        s.start('Verifying agent ownership...')
        
        const ownershipVerified = await AgentCNFTManager.verifyOwnership(
          selectedCredentials.uuid,
          wallet.address,
          client.config.rpcEndpoint ?? 'https://api.devnet.solana.com'
        )
        
        if (!ownershipVerified) {
          s.stop('❌ Ownership verification failed')
          cancel('You do not own this agent')
          return
        }
        
        s.stop('✅ Ownership verified')
        
        console.log('\n' + chalk.green('✅ Using agent:'))
        console.log(chalk.gray(`  Name: ${selectedCredentials.name}`))
        console.log(chalk.gray(`  UUID: ${selectedCredentials.uuid}`))
        console.log(chalk.gray(`  Agent Wallet: ${selectedCredentials.agentWallet.publicKey}`))
        
        // Get the agent's on-chain address for the listing
        const agentAddress = await deriveAgentPda(
          client.config.programId!,
          wallet.address,
          selectedCredentials.agentId
        )
        
        s.start('Creating service listing on the blockchain...')
        
        try {
          // Generate unique listing ID and derive addresses
          const listingId = generateUniqueId('listing')
          const serviceListingAddress = await deriveServiceListingPda(
            client.config.programId!,
            wallet.address,
            listingId
          )
          const userRegistryAddress = await deriveUserRegistryPda(
            client.config.programId!,
            wallet.address
          )
          
          const result = await client.marketplace.createServiceListing(
            toSDKSigner(wallet),
            serviceListingAddress,
            agentAddress,
            userRegistryAddress,
            {
              title: title as string,
              description: description as string,
              amount: solToLamports(price as string),
              signer: toSDKSigner(wallet),
              serviceType: category as string,
              paymentToken: getDefaultPaymentToken(),
              listingId
            }
          )
          
          s.stop('✅ Service listing created!')

          console.log('\n' + chalk.green('🎉 Your service is now live in the marketplace!'))
          console.log(chalk.gray(`Service ID: ${serviceListingAddress.toString()}`))
          console.log(chalk.gray(`Agent: ${selectedCredentials.name}`))
          console.log(chalk.gray(`Agent UUID: ${selectedCredentials.uuid}`))
          console.log('')
          console.log(chalk.cyan('Transaction:'), getExplorerUrl(result, 'devnet'))
          console.log(chalk.cyan('Listing:'), getAddressExplorerUrl(serviceListingAddress.toString(), 'devnet'))
          console.log('')
          console.log(chalk.yellow('💡 Service linked to agent via UUID for ownership verification'))
          
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