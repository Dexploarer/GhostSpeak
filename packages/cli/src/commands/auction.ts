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
  cancel,
  log,
  note
} from '@clack/prompts'
import { initializeClient, getExplorerUrl, handleTransactionError, toSDKSigner } from '../utils/client.js'
import { createSafeSDKClient, type ValidatedAuctionData } from '../utils/sdk-helpers.js'
import { AuctionType } from '@ghostspeak/sdk'
import Table from 'cli-table3'
import type { Address } from '@solana/addresses'


// Command option types
interface CreateAuctionOptions {
  type?: string
  startingPrice?: string
  reservePrice?: string
  duration?: string
}

interface BidAuctionOptions {
  amount?: string
}

interface ListAuctionsOptions {
  active?: boolean
  ending?: boolean
  myAuctions?: boolean
}

// Helper functions
function formatSOL(lamports: bigint): string {
  return (Number(lamports) / 1e9).toFixed(4)
}

function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * 1e9))
}

function formatTimeRemaining(endTime: bigint): string {
  const now = BigInt(Date.now())
  const remaining = Number(endTime) - Number(now)
  
  if (remaining <= 0) return 'Ended'
  
  const hours = Math.floor(remaining / 3600000)
  const minutes = Math.floor((remaining % 3600000) / 60000)
  
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  return `${hours}h ${minutes}m`
}

function getAuctionTypeString(type: string): string {
  switch (type.toLowerCase()) {
    case 'english': return '📈 English'
    case 'dutch': return '📉 Dutch' 
    case 'sealed': return '🔒 Sealed'
    default: return type
  }
}

export const auctionCommand = new Command('auction')
  .description('Manage auctions on the GhostSpeak marketplace')

// Create auction subcommand
auctionCommand
  .command('create')
  .description('Create a new service auction')
  .option('-t, --type <type>', 'Auction type (english, dutch, sealed)')
  .option('-s, --starting-price <price>', 'Starting price in SOL')
  .option('-r, --reserve-price <price>', 'Reserve price in SOL')
  .option('-d, --duration <hours>', 'Auction duration in hours')
  .action(async (options: CreateAuctionOptions) => {
    intro(chalk.cyan('🎯 Create Service Auction'))

    try {
      const s = spinner()
      s.start('Connecting to network...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)
      
      s.stop('✅ Connected to devnet')

      // Collect auction parameters
      const auctionTypeStr = options.type ?? await select({
        message: 'Select auction type:',
        options: [
          { value: 'english', label: '📈 English Auction (ascending bids)', hint: 'Traditional highest bidder wins' },
          { value: 'dutch', label: '📉 Dutch Auction (descending price)', hint: 'Price decreases until someone bids' },
          { value: 'sealed', label: '🔒 Sealed Bid Auction', hint: 'Private bids, highest wins' }
        ]
      })

      if (isCancel(auctionTypeStr)) {
        cancel('Auction creation cancelled')
        return
      }

      const serviceTitle = await text({
        message: 'Service title:',
        placeholder: 'AI Code Review Service',
        validate: (value) => {
          if (!value) return 'Service title is required'
          if (value.length < 3) return 'Title must be at least 3 characters'
          if (value.length > 100) return 'Title must be less than 100 characters'
        }
      })

      if (isCancel(serviceTitle)) {
        cancel('Auction creation cancelled')
        return
      }

      const description = await text({
        message: 'Service description:',
        placeholder: 'Professional code review with AI-powered insights...',
        validate: (value) => {
          if (!value) return 'Description is required'
          if (value.length < 10) return 'Description must be at least 10 characters'
          if (value.length > 500) return 'Description must be less than 500 characters'
        }
      })

      if (isCancel(description)) {
        cancel('Auction creation cancelled')
        return
      }

      // Starting price
      const startingPriceStr = options.startingPrice ?? await text({
        message: 'Starting price (SOL):',
        placeholder: '0.5',
        validate: (value) => {
          const num = parseFloat(value)
          if (isNaN(num) || num <= 0) return 'Please enter a valid positive number'
          if (num < 0.001) return 'Minimum price is 0.001 SOL'
          if (num > 1000) return 'Maximum price is 1000 SOL'
        }
      })

      if (isCancel(startingPriceStr)) {
        cancel('Auction creation cancelled')
        return
      }

      const startingPrice = parseFloat(startingPriceStr.toString())

      // Reserve price (optional)
      let reservePrice = 0
      if (!options.reservePrice) {
        const hasReserve = await confirm({
          message: 'Set a reserve price?',
          active: 'Yes',
          inactive: 'No'
        })

        if (isCancel(hasReserve)) {
          cancel('Auction creation cancelled')
          return
        }

        if (hasReserve) {
          const reservePriceStr = await text({
            message: 'Reserve price (SOL):',
            placeholder: (startingPrice * 1.5).toFixed(2),
            validate: (value) => {
              const num = parseFloat(value)
              if (isNaN(num) || num <= 0) return 'Please enter a valid positive number'
              if (num < startingPrice) return 'Reserve price must be at least the starting price'
              if (num > 1000) return 'Maximum price is 1000 SOL'
            }
          })

          if (isCancel(reservePriceStr)) {
            cancel('Auction creation cancelled')
            return
          }

          reservePrice = parseFloat(reservePriceStr.toString())
        }
      } else {
        reservePrice = parseFloat(options.reservePrice)
      }

      // Duration
      const durationStr = options.duration ?? await text({
        message: 'Auction duration (hours):',
        placeholder: '24',
        validate: (value) => {
          const num = parseInt(value)
          if (isNaN(num) || num <= 0) return 'Please enter a valid positive number'
          if (num < 1) return 'Minimum duration is 1 hour'
          if (num > 168) return 'Maximum duration is 7 days (168 hours)'
        }
      })

      if (isCancel(durationStr)) {
        cancel('Auction creation cancelled')
        return
      }

      const duration = parseInt(durationStr.toString())

      // Show summary
      note(
        `${chalk.bold('Auction Summary:')}\n` +
        `${chalk.gray('Type:')} ${getAuctionTypeString(auctionTypeStr.toString())}\n` +
        `${chalk.gray('Service:')} ${serviceTitle}\n` +
        `${chalk.gray('Starting Price:')} ${startingPrice} SOL\n` +
        (reservePrice > 0 ? `${chalk.gray('Reserve Price:')} ${reservePrice} SOL\n` : '') +
        `${chalk.gray('Duration:')} ${duration} hours\n` +
        `${chalk.gray('Posted by:')} ${wallet.address.slice(0, 8)}...`,
        'Review your auction'
      )

      const confirmCreate = await confirm({
        message: 'Create this auction?'
      })

      if (isCancel(confirmCreate) || !confirmCreate) {
        cancel('Auction creation cancelled')
        return
      }

      s.start('Creating auction on blockchain...')

      // Map auction type string to enum
      const auctionTypeEnum = auctionTypeStr.toString().toLowerCase() === 'english' ? AuctionType.English :
                             auctionTypeStr.toString().toLowerCase() === 'dutch' ? AuctionType.Dutch :
                             AuctionType.Sealed

      const signature = await safeClient.auction.create(toSDKSigner(wallet), {
        item: serviceTitle.toString(),
        description: description.toString(),
        startingPrice: solToLamports(startingPrice),
        reservePrice: reservePrice > 0 ? solToLamports(reservePrice) : undefined,
        auctionType: auctionTypeEnum,
        duration: duration * 3600 // Convert hours to seconds
      })

      if (!signature) {
        throw new Error('Failed to create auction')
      }

      s.stop('✅ Auction created successfully!')

      const explorerUrl = getExplorerUrl(signature, 'devnet')
      
      outro(
        `${chalk.green('🎉 Auction Created!')}\n\n` +
        `${chalk.bold('Transaction:')} ${signature}\n` +
        `${chalk.bold('Explorer:')} ${explorerUrl}\n\n` +
        `${chalk.yellow('Next steps:')}\n` +
        `• Share your auction: ${chalk.cyan('gs auction list --active')}\n` +
        `• Monitor bids: ${chalk.cyan('gs auction monitor')}\n` +
        `• View details: ${chalk.cyan('gs auction info <auction-id>')}`
      )

    } catch (error) {
      handleTransactionError(error as Error)
    }
  })

// Bid on auction subcommand
auctionCommand
  .command('bid <auction-id>')
  .description('Place a bid on an auction')
  .option('-a, --amount <amount>', 'Bid amount in SOL')
  .action(async (auctionId: string, options: BidAuctionOptions) => {
    intro(chalk.cyan('💰 Place Auction Bid'))

    try {
      const s = spinner()
      s.start('Connecting to network...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)
      
      s.stop('✅ Connected to devnet')

      // Get auction details
      s.start('Loading auction details...')
      
      let auctionAddress: Address
      try {
        auctionAddress = auctionId as Address
      } catch (error) {
        cancel('Invalid auction ID format')
        return
      }

      const auction = await safeClient.auction.getAuctionSummary(auctionAddress)
      
      if (!auction) {
        cancel('Auction not found')
        return
      }

      s.stop('✅ Auction loaded')

      // Show auction details
      note(
        `${chalk.bold('Auction Details:')}\n` +
        `${chalk.gray('Type:')} ${getAuctionTypeString(auction.auctionType)}\n` +
        `${chalk.gray('Current Price:')} ${formatSOL(auction.currentPrice)} SOL\n` +
        `${chalk.gray('Minimum Increment:')} ${formatSOL(auction.minimumBidIncrement)} SOL\n` +
        `${chalk.gray('Total Bids:')} ${auction.totalBids}\n` +
        `${chalk.gray('Time Remaining:')} ${formatTimeRemaining(auction.auctionEndTime)}\n` +
        (auction.currentWinner ? `${chalk.gray('Current Winner:')} ${auction.currentWinner.slice(0, 8)}...` : ''),
        'Current Auction Status'
      )

      // Check if auction has ended
      if (Date.now() > Number(auction.auctionEndTime)) {
        cancel('This auction has already ended')
        return
      }

      // Get bid amount
      const minBid = Number(auction.currentPrice) + Number(auction.minimumBidIncrement)
      const minBidSOL = minBid / 1e9

      const bidAmountStr = options.amount ?? await text({
        message: 'Bid amount (SOL):',
        placeholder: minBidSOL.toFixed(4),
        validate: (value) => {
          const num = parseFloat(value)
          if (isNaN(num) || num <= 0) return 'Please enter a valid positive number'
          if (num < minBidSOL) return `Minimum bid is ${minBidSOL.toFixed(4)} SOL`
          if (num > 1000) return 'Maximum bid is 1000 SOL'
        }
      })

      if (isCancel(bidAmountStr)) {
        cancel('Bid cancelled')
        return
      }

      const bidAmount = parseFloat(bidAmountStr.toString())

      const confirmBid = await confirm({
        message: `Place bid of ${bidAmount} SOL?`
      })

      if (isCancel(confirmBid) || !confirmBid) {
        cancel('Bid cancelled')
        return
      }

      s.start('Placing bid on blockchain...')

      const signature = await safeClient.auction.placeAuctionBid(
        toSDKSigner(wallet),
        {
          auctionId: auctionId,
          amount: solToLamports(bidAmount)
        }
      )

      if (!signature) {
        throw new Error('Failed to place bid')
      }

      s.stop('✅ Bid placed successfully!')

      const explorerUrl = getExplorerUrl(signature, 'devnet')
      
      outro(
        `${chalk.green('🎉 Bid Placed!')}\n\n` +
        `${chalk.bold('Amount:')} ${bidAmount} SOL\n` +
        `${chalk.bold('Transaction:')} ${signature}\n` +
        `${chalk.bold('Explorer:')} ${explorerUrl}\n\n` +
        `${chalk.yellow('Next steps:')}\n` +
        `• Monitor auction: ${chalk.cyan(`gs auction monitor ${auctionId}`)}\n` +
        `• Check your bids: ${chalk.cyan('gs auction list --my-bids')}`
      )

    } catch (error) {
      handleTransactionError(error as Error)
    }
  })

// List auctions subcommand
auctionCommand
  .command('list')
  .description('List auctions')
  .option('--active', 'Show only active auctions')
  .option('--ending', 'Show auctions ending soon')
  .option('--my-auctions', 'Show your auctions')
  .action(async (options: ListAuctionsOptions) => {
    intro(chalk.cyan('📋 Auction Listings'))

    try {
      const s = spinner()
      s.start('Loading auctions...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)
      
      // Get auctions using safe client (returns ValidatedAuctionData[])
      let auctions: ValidatedAuctionData[]
      
      if (options.ending) {
        // Get auctions ending within 24 hours
        auctions = await safeClient.auction.getAuctionsEndingSoon(24 * 3600 * 1000)
      } else {
        // Get all auctions
        auctions = await safeClient.auction.listAuctions()
      }
      
      // Apply filters if needed  
      // First cast to ensure proper typing throughout
      let validatedAuctions = auctions as ValidatedAuctionData[]
      
      if (options.active) {
        const now = BigInt(Date.now())
        validatedAuctions = validatedAuctions.filter((auction) => auction.auctionEndTime > now)
      }
      
      if (options.myAuctions) {
        validatedAuctions = validatedAuctions.filter((auction) => auction.creator === wallet.address)
      }
      
      auctions = validatedAuctions

      s.stop(`✅ Found ${auctions.length} auctions`)

      if (auctions.length === 0) {
        outro(
          `${chalk.yellow('No auctions found')}\n\n` +
          `${chalk.gray('• Create your first auction:')} ${chalk.cyan('gs auction create')}\n` +
          `${chalk.gray('• Check all auctions:')} ${chalk.cyan('gs auction list')}`
        )
        return
      }

      // Create table
      const table = new Table({
        head: ['Type', 'Current Price', 'Bids', 'Time Left', 'Status'],
        style: { head: ['cyan'] }
      })

      // Explicit type cast for the entire auctions array
      const validAuctions = auctions as ValidatedAuctionData[]
      for (const auction of validAuctions) {
        const timeLeft = formatTimeRemaining(auction.auctionEndTime)
        const isActive = Date.now() < Number(auction.auctionEndTime)
        
        table.push([
          getAuctionTypeString(auction.auctionType),
          `${formatSOL(auction.currentPrice)} SOL`,
          auction.totalBids.toString(),
          timeLeft,
          isActive ? chalk.green('Active') : chalk.red('Ended')
        ])
      }

      console.log('\n' + table.toString())

      // Interactive selection
      if (auctions.length > 0) {
        const selectedAuction = await select({
          message: 'Select an auction to view details:',
          options: (auctions as ValidatedAuctionData[]).map((auction) => ({
            value: auction.auction,
            label: `${getAuctionTypeString(auction.auctionType)} - ${formatSOL(auction.currentPrice)} SOL`,
            hint: `${auction.totalBids} bids • ${formatTimeRemaining(auction.auctionEndTime)}`
          }))
        })

        if (!isCancel(selectedAuction)) {
          log.info(`To bid on this auction: ${chalk.cyan(`gs auction bid ${selectedAuction}`)}`)
          log.info(`To view details: ${chalk.cyan(`gs auction info ${selectedAuction}`)}`)
        }
      }

      outro(chalk.green('✅ Auction listing complete'))

    } catch (error) {
      log.error(`Failed to list auctions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Monitor auction
auctionCommand
  .command('monitor [auction-id]')
  .description('Monitor auction activity in real-time')
  .action(async (auctionId?: string) => {
    intro(chalk.cyan('📊 Auction Monitor'))

    try {
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      if (!auctionId) {
        // Show user's active auctions to choose from
        const auctions = await safeClient.auction.listAuctions()
        const myAuctions: ValidatedAuctionData[] = []
        const validAuctions = auctions as ValidatedAuctionData[]
        for (const auction of validAuctions) {
          if (auction.creator === wallet.address) {
            myAuctions.push(auction)
          }
        }
        
        if (myAuctions.length === 0) {
          cancel('No auctions to monitor')
          return
        }

        const selected = await select({
          message: 'Select auction to monitor:',
          options: myAuctions.map((auction) => ({
            value: auction.auction,
            label: `${getAuctionTypeString(auction.auctionType)} - ${formatSOL(auction.currentPrice)} SOL`,
            hint: `${auction.totalBids} bids`
          }))
        })

        if (isCancel(selected)) {
          cancel('Monitor cancelled')
          return
        }

        auctionId = selected.toString()
      }

      log.info(`Monitoring auction ${auctionId}...`)
      log.info('Press Ctrl+C to stop monitoring')

      // Note: Real-time monitoring would require WebSocket or polling
      // For now, just show current status
      const auction = await safeClient.auction.getAuctionSummary(auctionId as Address)
      
      if (!auction) {
        cancel('Auction not found')
        return
      }

      note(
        `${chalk.bold('Current Status:')}\n` +
        `${chalk.gray('Type:')} ${getAuctionTypeString(auction.auctionType)}\n` +
        `${chalk.gray('Current Price:')} ${formatSOL(auction.currentPrice)} SOL\n` +
        `${chalk.gray('Total Bids:')} ${auction.totalBids}\n` +
        `${chalk.gray('Time Remaining:')} ${formatTimeRemaining(auction.auctionEndTime)}`,
        'Auction Status'
      )

      outro('Monitor mode not yet implemented - check back for updates!')

    } catch (error) {
      log.error(`Failed to monitor auction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Finalize auction
auctionCommand
  .command('finalize <auction-id>')
  .description('Finalize an ended auction')
  .action(async (auctionId: string) => {
    intro(chalk.cyan('🏁 Finalize Auction'))

    try {
      const s = spinner()
      s.start('Connecting to network...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)
      
      s.stop('✅ Connected to devnet')

      // Check auction status
      s.start('Checking auction status...')
      
      const auction = await safeClient.auction.getAuctionSummary(auctionId as Address)
      
      if (!auction) {
        cancel('Auction not found')
        return
      }

      s.stop('✅ Auction found')

      // Verify auction has ended
      if (Date.now() < Number(auction.auctionEndTime)) {
        cancel('Auction has not ended yet')
        return
      }

      // Verify user is the creator
      if (auction.creator !== wallet.address) {
        cancel('Only the auction creator can finalize')
        return
      }

      const confirmFinalize = await confirm({
        message: 'Finalize this auction and transfer funds?'
      })

      if (isCancel(confirmFinalize) || !confirmFinalize) {
        cancel('Finalization cancelled')
        return
      }

      s.start('Finalizing auction...')

      const signature = await safeClient.auction.finalizeAuction(
        toSDKSigner(wallet),
        auctionId
      )

      if (!signature) {
        throw new Error('Failed to finalize auction')
      }

      s.stop('✅ Auction finalized!')

      const explorerUrl = getExplorerUrl(signature, 'devnet')
      
      outro(
        `${chalk.green('🎉 Auction Finalized!')}\n\n` +
        `${chalk.bold('Final Price:')} ${formatSOL(auction.currentPrice)} SOL\n` +
        (auction.currentWinner ? `${chalk.bold('Winner:')} ${auction.currentWinner}\n\n` : 'No winner\n\n') +
        `${chalk.bold('Transaction:')} ${signature}\n` +
        `${chalk.bold('Explorer:')} ${explorerUrl}`
      )

    } catch (error) {
      handleTransactionError(error as Error)
    }
  })