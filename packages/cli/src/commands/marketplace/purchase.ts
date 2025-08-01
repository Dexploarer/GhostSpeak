/**
 * Marketplace purchase service command
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
  cancel,
  log,
  note
} from '@clack/prompts'
import { initializeClient, getExplorerUrl, handleTransactionError, toSDKSigner } from '../../utils/client.js'
import { createSafeSDKClient } from '../../utils/sdk-helpers.js'
import Table from 'cli-table3'

export function registerPurchaseCommand(parentCommand: Command): void {
  parentCommand
    .command('purchase')
    .description('Purchase a service from the marketplace')
    .argument('[item-id]', 'Marketplace item ID')
    .option('--skip-confirm', 'Skip confirmation prompt')
    .action(async (itemId?: string, options?: { skipConfirm?: boolean }) => {
      intro(chalk.magenta('💳 Purchase Service'))

      try {
        const s = spinner()
        s.start('Connecting to network...')
        
        const { client, wallet } = await initializeClient('devnet')
        const safeClient = createSafeSDKClient(client)
        
        s.stop('✅ Connected to devnet')

        // If no item ID provided, show available items first
        if (!itemId) {
          s.start('Loading marketplace items...')
          
          const items = await safeClient.marketplace.listItems()
          const availableItems = items.filter(item => item.available)
          
          s.stop(`✅ Found ${availableItems.length} available items`)

          if (availableItems.length === 0) {
            outro(
              `${chalk.yellow('No items available for purchase')}\n\n` +
              `${chalk.gray('• Browse all items:')} ${chalk.cyan('gs marketplace list')}\n` +
              `${chalk.gray('• Search for specific services:')} ${chalk.cyan('gs marketplace search')}`
            )
            return
          }

          // Display available items
          const table = new Table({
            head: ['Title', 'Category', 'Price', 'Rating', 'Seller'],
            style: { head: ['cyan'] }
          })

          availableItems.forEach(item => {
            table.push([
              item.title.slice(0, 30) + (item.title.length > 30 ? '...' : ''),
              item.category,
              `${item.price.toFixed(4)} SOL`,
              item.rating ? `⭐ ${item.rating.toFixed(1)}` : 'No ratings',
              `${item.seller.slice(0, 6)}...${item.seller.slice(-4)}`
            ])
          })

          console.log('\n' + chalk.bold('Available Services:'))
          console.log(table.toString())

          // Let user select an item
          const selectedId = await select({
            message: 'Select a service to purchase:',
            options: availableItems.map(item => ({
              value: item.id,
              label: `${item.title} - ${item.price.toFixed(4)} SOL`,
              hint: item.category
            }))
          })

          if (isCancel(selectedId)) {
            cancel('Purchase cancelled')
            return
          }

          itemId = selectedId.toString()
        }

        // Get the specific item details
        s.start('Loading item details...')
        
        const items = await safeClient.marketplace.listItems()
        const item = items.find(i => i.id === itemId)
        
        if (!item) {
          s.stop('❌ Item not found')
          cancel(`Item with ID '${itemId}' not found`)
          return
        }

        if (!item.available) {
          s.stop('❌ Item unavailable')
          cancel('This item is no longer available for purchase')
          return
        }

        s.stop('✅ Item details loaded')

        // Show purchase details
        note(
          `${chalk.bold('Purchase Details:')}\n` +
          `${chalk.gray('Item:')} ${item.title}\n` +
          `${chalk.gray('Description:')} ${item.description}\n` +
          `${chalk.gray('Category:')} ${item.category}\n` +
          `${chalk.gray('Price:')} ${item.price.toFixed(4)} SOL\n` +
          `${chalk.gray('Seller:')} ${item.seller}\n` +
          `${chalk.gray('Rating:')} ${item.rating ? `⭐ ${item.rating.toFixed(1)}/5` : 'No ratings'}\n` +
          `${chalk.gray('Your Balance:')} ${wallet.address.slice(0, 8)}...`,
          'Review Purchase'
        )

        // Add custom message or requirements
        const message = await text({
          message: 'Add a message for the seller (optional):',
          placeholder: 'Any specific requirements or timeline...'
        })

        if (isCancel(message)) {
          cancel('Purchase cancelled')
          return
        }

        // Confirm purchase
        if (!options?.skipConfirm) {
          const confirmed = await confirm({
            message: `Purchase "${item.title}" for ${item.price.toFixed(4)} SOL?`
          })

          if (isCancel(confirmed) || !confirmed) {
            cancel('Purchase cancelled')
            return
          }
        }

        s.start('Processing purchase...')

        try {
          // Execute purchase through SDK
          const signature = await safeClient.marketplace.purchaseItem(
            toSDKSigner(wallet),
            {
              listingId: itemId,
              amount: BigInt(Math.floor(item.price * 1e9)) // Convert SOL to lamports
            }
          )

          if (!signature) {
            throw new Error('Failed to complete purchase')
          }

          s.stop('✅ Purchase completed!')

          const explorerUrl = getExplorerUrl(signature, 'devnet')
          
          outro(
            `${chalk.green('🎉 Purchase Successful!')}\n\n` +
            `${chalk.bold('Item:')} ${item.title}\n` +
            `${chalk.bold('Price:')} ${item.price.toFixed(4)} SOL\n` +
            `${chalk.bold('Seller:')} ${item.seller}\n\n` +
            `${chalk.bold('Transaction:')} ${signature}\n` +
            `${chalk.bold('Explorer:')} ${explorerUrl}\n\n` +
            `${chalk.yellow('Next steps:')}\n` +
            `• The seller will be notified of your purchase\n` +
            `• Check your escrow status: ${chalk.cyan('gs escrow list')}\n` +
            `• Contact seller if needed: ${chalk.cyan(`gs channel create --participant ${item.seller}`)}`
          )

        } catch {
          s.stop('❌ Purchase failed')
          handleTransactionError(error as Error)
        }

      } catch (error) {
        log.error(`Purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    })
}