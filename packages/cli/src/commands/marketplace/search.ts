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
  cancel,
  log,
  select,
  note
} from '@clack/prompts'
import { initializeClient } from '../../utils/client.js'
import { createSafeSDKClient } from '../../utils/sdk-helpers.js'
import Table from 'cli-table3'

interface SearchServicesOptions {
  query?: string
  category?: string
  maxPrice?: string
  minRating?: string
}

export function registerSearchCommand(parentCommand: Command): void {
  parentCommand
    .command('search')
    .description('Search marketplace services')
    .option('-q, --query <query>', 'Search query')
    .option('-c, --category <category>', 'Filter by category')
    .option('--max-price <price>', 'Maximum price in SOL')
    .option('--min-rating <rating>', 'Minimum rating (1-5)')
    .action(async (options: SearchServicesOptions) => {
      intro(chalk.magenta('🔍 Search Marketplace'))

      try {
        const query = options.query ?? await text({
          message: 'What are you looking for?',
          placeholder: 'e.g., data analysis, content writing, smart contracts',
          validate: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Search query is required'
            }
            if (value.length < 2) {
              return 'Query must be at least 2 characters'
            }
          }
        })

        if (isCancel(query)) {
          cancel('Search cancelled')
          return
        }

        const s = spinner()
        s.start('Connecting to network...')
        
        const { client } = await initializeClient('devnet')
        const safeClient = createSafeSDKClient(client)
        
        s.stop('✅ Connected to devnet')
        
        s.start(`Searching for "${query}"...`)
        
        // Get all marketplace items
        const allItems = await safeClient.marketplace.listItems()
        
        // Search and filter
        const queryLower = query.toString().toLowerCase()
        let results = allItems.filter(item => {
          const matchesQuery = item.title.toLowerCase().includes(queryLower) ||
                              item.description.toLowerCase().includes(queryLower) ||
                              item.category.toLowerCase().includes(queryLower) ||
                              item.tags.some(tag => tag.toLowerCase().includes(queryLower))
          
          return matchesQuery
        })
        
        // Apply additional filters
        if (options.category) {
          results = results.filter(item => 
            item.category.toLowerCase() === options.category!.toLowerCase()
          )
        }
        
        if (options.maxPrice) {
          const maxPrice = parseFloat(options.maxPrice)
          if (!isNaN(maxPrice)) {
            results = results.filter(item => item.price <= maxPrice)
          }
        }
        
        if (options.minRating) {
          const minRating = parseFloat(options.minRating)
          if (!isNaN(minRating)) {
            results = results.filter(item => (item.rating ?? 0) >= minRating)
          }
        }
        
        // Sort by relevance (items with query in title first)
        results.sort((a, b) => {
          const aInTitle = a.title.toLowerCase().includes(queryLower) ? 1 : 0
          const bInTitle = b.title.toLowerCase().includes(queryLower) ? 1 : 0
          if (aInTitle !== bInTitle) return bInTitle - aInTitle
          
          // Then sort by rating
          return (b.rating ?? 0) - (a.rating ?? 0)
        })
        
        s.stop(`✅ Found ${results.length} results`)

        if (results.length === 0) {
          outro(
            `${chalk.yellow(`No services found matching "${query}"`)}\n\n` +
            `${chalk.gray('Try:')}\n` +
            `${chalk.gray('• Using different keywords')}\n` +
            `${chalk.gray('• Browsing all items:')} ${chalk.cyan('ghost marketplace list')}\n` +
            `${chalk.gray('• Posting a job request:')} ${chalk.cyan('ghost marketplace jobs create')}`
          )
          return
        }

        // Display results in a table
        const table = new Table({
          head: ['Title', 'Category', 'Price', 'Rating', 'Available'],
          style: { head: ['cyan'] }
        })

        results.slice(0, 10).forEach(item => {
          table.push([
            item.title.slice(0, 30) + (item.title.length > 30 ? '...' : ''),
            item.category,
            `${item.price.toFixed(4)} SOL`,
            item.rating ? `⭐ ${item.rating.toFixed(1)}` : 'No ratinghost',
            item.available ? chalk.green('Yes') : chalk.red('No')
          ])
        })

        console.log(`\n${chalk.bold(`Search Results for "${query}":`)}\n`)
        console.log(table.toString())
        
        if (results.length > 10) {
          console.log(chalk.gray(`\nShowing 10 of ${results.length} results`))
        }

        // Allow selection for more details
        const viewDetails = await select({
          message: 'What would you like to do?',
          options: [
            { value: 'view', label: 'View item details', hint: 'Select an item to see more info' },
            { value: 'refine', label: 'Refine search', hint: 'Add more filters' },
            { value: 'exit', label: 'Exit search' }
          ]
        })

        if (isCancel(viewDetails) || viewDetails === 'exit') {
          outro(chalk.green('Search complete'))
          return
        }

        if (viewDetails === 'refine') {
          // Refine search with additional options
          const refinement = await select({
            message: 'Refine by:',
            options: [
              { value: 'price', label: 'Price range' },
              { value: 'category', label: 'Specific category' },
              { value: 'rating', label: 'Minimum rating' },
              { value: 'availability', label: 'Available only' }
            ]
          })

          if (!isCancel(refinement)) {
            log.info(`To refine search: ${chalk.cyan(`ghost marketplace search -q "${query}" --${refinement} <value>`)}`)
          }
        } else {
          // Select specific item
          const selectedItem = await select({
            message: 'Select an item:',
            options: results.slice(0, 10).map(item => ({
              value: item.id,
              label: `${item.title} - ${item.price.toFixed(4)} SOL`,
              hint: item.category
            }))
          })

          if (!isCancel(selectedItem)) {
            const item = results.find(r => r.id === selectedItem)
            if (item) {
              note(
                `${chalk.bold('Service Details:')}\n` +
                `${chalk.gray('ID:')} ${item.id}\n` +
                `${chalk.gray('Title:')} ${item.title}\n` +
                `${chalk.gray('Description:')} ${item.description}\n` +
                `${chalk.gray('Category:')} ${item.category}\n` +
                `${chalk.gray('Price:')} ${item.price.toFixed(4)} SOL\n` +
                `${chalk.gray('Seller:')} ${item.seller}\n` +
                `${chalk.gray('Rating:')} ${item.rating ? `⭐ ${item.rating.toFixed(1)}/5` : 'No ratinghost'}\n` +
                `${chalk.gray('Available:')} ${item.available ? 'Yes' : 'No'}\n` +
                `${chalk.gray('Tags:')} ${item.tags.join(', ')}`,
                'Service Information'
              )

              if (item.available) {
                log.info(`To purchase: ${chalk.cyan(`ghost marketplace purchase ${item.id}`)}`)
              }
            }
          }
        }

        outro(chalk.green('Search complete'))

      } catch (error) {
        log.error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    })
}