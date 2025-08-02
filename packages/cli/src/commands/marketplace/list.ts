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
  cancel,
  log,
  note
} from '@clack/prompts'
import { initializeClient } from '../../utils/client.js'
import { createSafeSDKClient } from '../../utils/sdk-helpers.js'
import Table from 'cli-table3'

// Clean type definitions
interface MarketplaceListOptions {
  category?: string
  available?: boolean
  priceRange?: string
  sort?: 'price' | 'rating' | 'newest'
}

interface ItemDisplay {
  id: string
  title: string
  price: string
  seller: string
  category: string
  rating: string
  available: boolean
}

export function registerListCommand(parentCommand: Command): void {
  parentCommand
    .command('list')
    .description('Browse marketplace items and services')
    .option('--category <category>', 'Filter by category')
    .option('--available', 'Show only available items')
    .option('--price-range <range>', 'Filter by price range (e.g., 0.1-5.0)')
    .option('--sort <sort>', 'Sort by: price, rating, newest', 'rating')
    .action(async (options: MarketplaceListOptions) => {
      intro(chalk.magenta('🛍️ GhostSpeak Marketplace'))

      try {
        const s = spinner()
        s.start('Connecting to network...')
        
        const { client } = await initializeClient('devnet')
        const safeClient = createSafeSDKClient(client)
        
        s.stop('✅ Connected to devnet')

        s.start('Loading marketplace items...')
        
        // Get all marketplace items
        const items = await safeClient.marketplace.listItems()
        
        s.stop(`✅ Found ${items.length} marketplace items`)

        if (items.length === 0) {
          outro(
            `${chalk.yellow('No marketplace items found')}\n\n` +
            `${chalk.gray('• AI agents can list their services')}\n` +
            `${chalk.gray('• Check back later for new offerings')}\n` +
            `${chalk.gray('• Post a job instead:')} ${chalk.cyan('gs marketplace jobs create')}`
          )
          return
        }

        // Apply filters
        let filteredItems = [...items]

        // Category filter
        if (options.category) {
          filteredItems = filteredItems.filter(
            item => item.category.toLowerCase() === options.category?.toLowerCase()
          )
        }

        // Available filter
        if (options.available) {
          filteredItems = filteredItems.filter(item => item.available)
        }

        // Price range filter
        if (options.priceRange) {
          const [minStr, maxStr] = options.priceRange.split('-')
          const min = parseFloat(minStr) || 0
          const max = parseFloat(maxStr) || Infinity
          
          filteredItems = filteredItems.filter(
            item => item.price >= min && item.price <= max
          )
        }

        // Sort items
        const sortField = options.sort ?? 'rating'
        if (sortField === 'price') {
          filteredItems.sort((a, b) => a.price - b.price)
        } else if (sortField === 'rating') {
          filteredItems.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        } else {
          filteredItems.sort((a, b) => b.id.localeCompare(a.id))
        }

        // Interactive selection mode
        if (filteredItems.length > 0) {
          const displayItems: ItemDisplay[] = filteredItems.map(item => ({
            id: item.id,
            title: item.title,
            price: `${item.price.toFixed(4)} SOL`,
            seller: `${item.seller.slice(0, 6)}...${item.seller.slice(-4)}`,
            category: item.category,
            rating: item.rating ? `⭐ ${item.rating.toFixed(1)}/5` : 'No ratings',
            available: item.available
          }))

          // Show summary table
          const table = new Table({
            head: ['Title', 'Price', 'Category', 'Rating', 'Status'],
            style: { head: ['cyan'] }
          })

          displayItems.forEach(item => {
            table.push([
              item.title.slice(0, 30) + (item.title.length > 30 ? '...' : ''),
              item.price,
              item.category,
              item.rating,
              item.available ? chalk.green('Available') : chalk.red('Unavailable')
            ])
          })

          console.log('\n' + table.toString())

          // Select item for details
          const selectedId = await select({
            message: 'Select an item to view details:',
            options: displayItems.map(item => ({
              value: item.id,
              label: `${item.title} - ${item.price}`,
              hint: `${item.category} • ${item.rating}`
            }))
          })

          if (isCancel(selectedId)) {
            cancel('Marketplace browsing cancelled')
            return
          }

          const selectedItem = filteredItems.find(item => item.id === selectedId.toString())
          if (!selectedItem) {
            cancel('Item not found')
            return
          }

          // Show detailed view
          note(
            `${chalk.bold('Item Details:')}\n` +
            `${chalk.gray('ID:')} ${selectedItem.id}\n` +
            `${chalk.gray('Title:')} ${selectedItem.title}\n` +
            `${chalk.gray('Description:')} ${selectedItem.description}\n` +
            `${chalk.gray('Category:')} ${selectedItem.category}\n` +
            `${chalk.gray('Price:')} ${selectedItem.price.toFixed(4)} SOL\n` +
            `${chalk.gray('Seller:')} ${selectedItem.seller}\n` +
            `${chalk.gray('Rating:')} ${selectedItem.rating ? `⭐ ${selectedItem.rating.toFixed(1)}/5` : 'No ratings yet'}\n` +
            `${chalk.gray('Status:')} ${selectedItem.available ? chalk.green('Available') : chalk.red('Unavailable')}\n` +
            `${chalk.gray('Tags:')} ${selectedItem.tags.length > 0 ? selectedItem.tags.join(', ') : 'None'}`,
            'Service Information'
          )

          // Show actions
          if (selectedItem.available) {
            const action = await select({
              message: 'What would you like to do?',
              options: [
                { value: 'purchase', label: '💰 Purchase this service', hint: `${selectedItem.price.toFixed(4)} SOL` },
                { value: 'contact', label: '💬 Contact seller', hint: 'Open direct channel' },
                { value: 'back', label: '← Back to list' }
              ]
            })

            if (isCancel(action)) {
              cancel('Action cancelled')
              return
            }

            switch (action) {
              case 'purchase':
                log.info(`To purchase: ${chalk.cyan(`gs marketplace purchase ${selectedItem.id}`)}`)
                break
              case 'contact':
                log.info(`To contact seller: ${chalk.cyan(`gs channel create --participant ${selectedItem.seller}`)}`)
                break
              case 'back':
                log.info('Returning to list...')
                break
            }
          }

          outro(
            `${chalk.green('Marketplace Browse Complete')}\n\n` +
            `${chalk.gray('Found')} ${filteredItems.length} ${chalk.gray('items matching your criteria')}`
          )

        } else {
          outro(
            `${chalk.yellow('No items match your filters')}\n\n` +
            `${chalk.gray('Try adjusting your search criteria')}\n` +
            `${chalk.gray('• Remove category filter')}\n` +
            `${chalk.gray('• Expand price range')}\n` +
            `${chalk.gray('• Include unavailable items')}`
          )
        }

      } catch (_) {
        log.error(`Failed to list marketplace items: ${error instanceof Error ? _error.message : 'Unknown error'}`)
      }
    })
}