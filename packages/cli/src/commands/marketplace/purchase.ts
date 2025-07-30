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
  cancel
} from '@clack/prompts'
import { initializeClient, getExplorerUrl, getAddressExplorerUrl, handleTransactionError, toSDKSigner } from '../../utils/client.js'
import { address } from '@solana/addresses'
import type { ServiceListing } from '@ghostspeak/sdk'
import { 
  deriveServicePurchasePda, 
  deriveWorkOrderPda,
  calculateDeadline,
  getDefaultPaymentToken
} from '../../utils/pda.js'

export function registerPurchaseCommand(parentCommand: Command): void {
  parentCommand
    .command('purchase')
    .description('Purchase a service from the marketplace')
    .argument('[listing-id]', 'Service listing ID')
    .action(async (listingId: string) => {
      intro(chalk.magenta('💳 Purchase Service'))

      try {
        // If no listing ID provided, show available services first
        if (!listingId) {
          const s = spinner()
          s.start('Loading available services...')
          
          const { client } = await initializeClient('devnet')
          
          // Fetch real services from blockchain
          const services = await client.marketplace.getServiceListings()
          s.stop('✅ Services loaded')

          if (services.length === 0) {
            console.log('\n' + chalk.yellow('No services available in the marketplace'))
            outro('Create a service with: npx ghostspeak marketplace create')
            return
          }

          console.log('\n' + chalk.bold('🏪 Available Services'))
          console.log('─'.repeat(60))
          services.forEach((serviceWithAddr: any, index: number) => {
            console.log(chalk.magenta(`${index + 1}. ${serviceWithAddr.data.title}`))
            console.log(chalk.gray(`   ID: ${serviceWithAddr.address.toString()} | Price: ${Number(serviceWithAddr.data.price) / 1_000_000} SOL | By: ${serviceWithAddr.data.agent.toString().slice(0, 8)}...`))
          })

          const selectedIndex = await select({
            message: 'Select service to purchase:',
            options: services.map((service: any, index: number) => ({
              value: index,
              label: `${service.data.title ?? 'Unknown'} - ${Number(service.data.price) / 1_000_000} SOL`
            }))
          })

          if (isCancel(selectedIndex)) {
            cancel('Purchase cancelled')
            return
          }

          listingId = services[selectedIndex as number].address.toString()
        }

        // Initialize client if needed
        const { client, wallet } = await initializeClient('devnet')
        
        // Get service details
        const s = spinner()
        s.start('Loading service details...')
        
        let service: ServiceListing | null = null
        try {
          const listing = await client.marketplace.getServiceListing(address(listingId))
          service = listing
        } catch {
          service = null
        }
        
        s.stop('✅ Service loaded')
        
        if (!service) {
          cancel('Service not found')
          return
        }

        console.log('\n' + chalk.bold('📋 Service Details'))
        console.log('─'.repeat(40))
        console.log(chalk.magenta('Service:') + ` ${service.title}`)
        console.log(chalk.magenta('Price:') + ` ${Number(service.price) / 1_000_000} SOL`)
        // @ts-expect-error agentName might not exist on ServiceListing
        console.log(chalk.magenta('Agent:') + ` ${service.agentName ?? service.agent?.toString() ?? 'Unknown'}`)
        console.log(chalk.magenta('Description:') + ` ${service.description}`)

        // Additional requirements
        const requirements = await text({
          message: 'Any special requirements? (optional)',
          placeholder: 'e.g., Need visualization in Tableau format'
        })

        if (isCancel(requirements)) {
          cancel('Purchase cancelled')
          return
        }

        // Confirmation
        console.log('\n' + chalk.bold('💳 Purchase Summary'))
        console.log('─'.repeat(40))
        console.log(chalk.magenta('Service:') + ` ${service.title}`)
        console.log(chalk.magenta('Price:') + ` ${Number(service.price) / 1_000_000} SOL`)
        if (requirements) {
          console.log(chalk.magenta('Requirements:') + ` ${requirements}`)
        }

        const confirmed = await confirm({
          message: `Proceed with purchase for ${Number(service.price) / 1_000_000} SOL?`
        })

        if (isCancel(confirmed) || !confirmed) {
          cancel('Purchase cancelled')
          return
        }

        const purchaseSpinner = spinner()
        purchaseSpinner.start('Processing payment and creating work order...')

        try {
          // Generate service purchase PDA
          const servicePurchaseAddress = await deriveServicePurchasePda(
            client.config.programId!,
            address(listingId),
            wallet.address
          )
          
          // Generate work order ID and PDA for escrow
          const orderId = BigInt(Date.now())
          const workOrderAddress = await deriveWorkOrderPda(
            client.config.programId!,
            wallet.address,
            orderId
          )
          
          // First create the purchase
          const purchaseResult = await client.marketplace.purchaseService(
            servicePurchaseAddress,
            {
              serviceListingAddress: address(listingId),
              signer: toSDKSigner(wallet),
              requirements: typeof requirements === 'string' ? [requirements] : requirements as string[] ?? [],
              deadline: calculateDeadline(14) // 14 days default
            }
          )
          
          // Then create the work order/escrow
          const escrowResult = await client.escrow.create({
            signer: toSDKSigner(wallet),
            title: service.title,
            description: service.description + (requirements ? `\n\nRequirements: ${requirements}` : ''),
            provider: service.agent,
            amount: BigInt(service.price),
            deadline: calculateDeadline(14),
            paymentToken: service.paymentToken || getDefaultPaymentToken(),
            requirements: typeof requirements === 'string' ? [requirements] : requirements as string[] ?? []
          })
          
          purchaseSpinner.stop('✅ Purchase completed!')

          console.log('\n' + chalk.green('🎉 Service purchased successfully!'))
          console.log(chalk.gray(`Purchase ID: ${servicePurchaseAddress.toString()}`))
          console.log(chalk.gray(`Work Order: ${workOrderAddress.toString()}`))
          console.log(chalk.gray('The agent will begin working on your request.'))
          console.log('')
          console.log(chalk.cyan('Purchase Transaction:'), getExplorerUrl(purchaseResult, 'devnet'))
          console.log(chalk.cyan('Escrow Transaction:'), getExplorerUrl(escrowResult, 'devnet'))
          console.log(chalk.cyan('Work Order Account:'), getAddressExplorerUrl(workOrderAddress.toString(), 'devnet'))
          console.log('\n' + chalk.yellow('💡 Track your order with: npx ghostspeak escrow list'))
          
          outro('Purchase completed')
        } catch (error: unknown) {
          purchaseSpinner.stop('❌ Purchase failed')
          throw new Error(handleTransactionError(error as Error))
        }

      } catch (error) {
        cancel(chalk.red('Purchase failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
      }
    })
}