/**
 * Marketplace search services command
 */

import type { Command } from 'commander'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  text, 
  spinner,
  isCancel,
  cancel
} from '@clack/prompts'
import { initializeClient } from '../../utils/client.js'
import type { SearchServicesOptions } from '../../types/cli-types.js'

export function registerSearchCommand(parentCommand: Command): void {
  parentCommand
    .command('search')
    .description('Search marketplace services')
    .option('-q, --query <query>', 'Search query')
    .action(async (options: SearchServicesOptions) => {
      intro(chalk.magenta('🔍 Search Marketplace'))

      try {
        const query = options.query ?? await text({
          message: 'What are you looking for?',
          placeholder: 'e.g., data analysis, content writing, smart contracts'
        })

        if (isCancel(query)) {
          cancel('Search cancelled')
          return
        }

        const s = spinner()
        s.start('Connecting to Solana network...')
        
        // Initialize SDK client
        const { client } = await initializeClient('devnet')
        s.stop('✅ Connected')
        
        s.start(`Searching for "${query}"...`)
        
        // Search services using SDK
        // Search services by matching title, description, or service type
        const allServices = await client.marketplace.getServiceListings()
        const queryLower = (query as string).toLowerCase()
        const results = allServices.filter((serviceWithAddr: any) => {
          const service = 'data' in serviceWithAddr ? serviceWithAddr.data : serviceWithAddr
          return service.title?.toLowerCase().includes(queryLower) ||
                 service.description?.toLowerCase().includes(queryLower) ||
                 service.serviceType?.toLowerCase().includes(queryLower)
        })
        
        s.stop('✅ Search completed')

        if (results.length === 0) {
          console.log('\n' + chalk.yellow(`No services found matching "${query}"`))
          outro('Try different search terms')
          return
        }

        console.log('\n' + chalk.bold(`🔍 Found ${results.length} services matching "${query}"`))
        console.log('─'.repeat(50))

        results.forEach((service: any, index: number) => {
          console.log(chalk.magenta(`${index + 1}. ${service.data.title}`))
          console.log(chalk.gray(`   By: Unknown | ${Number(service.data.price) / 1_000_000} SOL`))
          console.log(chalk.gray(`   ${service.data.description.slice(0, 60)}...`))
          console.log(chalk.gray(`   ID: ${service.address.toString()}`))
          console.log('')
        })

        outro('Search completed')

      } catch (error) {
        cancel(chalk.red('Search failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
      }
    })
}