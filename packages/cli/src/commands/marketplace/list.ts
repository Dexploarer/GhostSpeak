/**
 * Marketplace list services command
 */

import type { Command } from 'commander'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  select,
  spinner,
  isCancel,
  cancel
} from '@clack/prompts'
import { initializeClient } from '../../utils/client.js'
import type { ServiceListingWithAddress } from '@ghostspeak/sdk'
import type { ListServicesOptions } from '../../types/cli-types.js'

export function registerListCommand(parentCommand: Command): void {
  parentCommand
    .command('list')
    .description('Browse available services')
    .option('--category <category>', 'Filter by category')
    .action(async (options: ListServicesOptions) => {
      intro(chalk.magenta('🛍️  GhostSpeak Marketplace'))

      const s = spinner()
      s.start('Connecting to Solana network...')

      try {
        // Initialize SDK client
        const { client } = await initializeClient('devnet')
        s.stop('✅ Connected')
        
        s.start('Loading services from the marketplace...')
        
        // Fetch services from blockchain
        // Use the correct method name
        let services = await client.marketplace.getServiceListings()
        
        // Filter by category if provided
        if (options.category) {
          services = services.filter(service => {
            const metadata = service.data.serviceType
            return metadata?.includes(options.category ?? '') ?? service.data.title?.toLowerCase().includes(options.category?.toLowerCase() ?? '') ?? false
          })
        }
        
        s.stop('✅ Services loaded')

        if (services.length === 0) {
          console.log('\n' + chalk.yellow('No services found in the marketplace'))
          outro('Create a service with: npx ghostspeak marketplace create')
          return
        }

        console.log('\n' + chalk.bold(`🏪 Available Services (${services.length})`))
        console.log('═'.repeat(70))

        services.forEach((service: ServiceListingWithAddress, index: number) => {
          console.log(chalk.magenta(`${index + 1}. ${service.data.title}`))
          console.log(chalk.gray(`   ID: ${service.address.toString()}`))
          console.log(chalk.gray(`   Agent: ${service.data.agent.toString()}`))
          // @ts-expect-error metadataUri might not exist on ServiceListing
          console.log(chalk.gray(`   Category: ${service.data.metadataUri ?? 'General'}`))
          console.log(chalk.gray(`   Price: ${Number(service.data.price) / 1_000_000} SOL`))
          console.log(chalk.gray(`   Available: ${service.data.isActive ? '✅ Yes' : '❌ No'}`))
          console.log(chalk.gray(`   ${service.data.description}`))
          console.log('')
        })

        const action = await select({
          message: 'What would you like to do?',
          options: [
            { value: 'purchase', label: '💳 Purchase a service' },
            { value: 'details', label: '📋 View service details' },
            { value: 'filter', label: '🔍 Filter services' },
            { value: 'exit', label: '🚪 Exit' }
          ]
        })

        if (isCancel(action)) {
          cancel('Marketplace browsing cancelled')
          return
        }

        switch (action) {
          case 'purchase':
            await purchaseService(services)
            break
          case 'details':
            await viewServiceDetails(services)
            break
          case 'filter':
            console.log(chalk.yellow('🔍 Use --category flag to filter by category'))
            break
        }

        outro('Marketplace session completed')

      } catch (error) {
        s.stop('❌ Failed to load marketplace')
        cancel(chalk.red('Error: ' + (error instanceof Error ? error.message : 'Unknown error')))
      }
    })
}

// Helper functions that will be implemented when purchase command is extracted
async function purchaseService(services: ServiceListingWithAddress[]) {
  console.log(chalk.yellow('Purchase feature will be available when purchase command is extracted'))
  console.log(chalk.gray('Available services:'), services.length)
}

async function viewServiceDetails(services: ServiceListingWithAddress[]) {
  console.log(chalk.yellow('Service details view will be enhanced when UI helpers are available'))
  console.log(chalk.gray('Available services:'), services.length)
}