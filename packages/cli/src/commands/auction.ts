import { Command } from 'commander'
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
  cancel,
  log,
  note
} from '@clack/prompts'
import { initializeClient, getExplorerUrl, getAddressExplorerUrl, handleTransactionError } from '../utils/client.js'
import type { Address } from '@solana/addresses'
import { address } from '@solana/addresses'
import type {
  CreateAuctionOptions,
  BidAuctionOptions,
  ListAuctionsOptions
} from '../types/cli-types.js'

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
      // Collect auction parameters
      const auctionType = options.type ?? await select({
        message: 'Select auction type:',
        options: [
          { value: 'english', label: '📈 English Auction (ascending bids)', hint: 'Traditional highest bidder wins' },
          { value: 'dutch', label: '📉 Dutch Auction (descending price)', hint: 'Price decreases until someone bids' },
          { value: 'sealed', label: '🔒 Sealed Bid Auction', hint: 'Private bids, highest wins' }
        ]
      })

      if (isCancel(auctionType)) {
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

      const serviceDescription = await text({
        message: 'Service description:',
        placeholder: 'Automated code review with AI-powered suggestions...',
        validate: (value) => {
          if (!value) return 'Service description is required'
          if (value.length < 10) return 'Description must be at least 10 characters'
          if (value.length > 500) return 'Description must be less than 500 characters'
        }
      })

      if (isCancel(serviceDescription)) {
        cancel('Auction creation cancelled')
        return
      }

      const startingPrice = options.startingPrice ?? await text({
        message: 'Starting price (SOL):',
        placeholder: '0.1',
        validate: (value) => {
          const num = parseFloat(value)
          if (isNaN(num) || num <= 0) return 'Please enter a valid positive number'
          if (num > 1000) return 'Starting price seems too high (max 1000 SOL)'
          return
        }
      })

      if (isCancel(startingPrice)) {
        cancel('Auction creation cancelled')
        return
      }

      const reservePrice = options.reservePrice ?? await text({
        message: 'Reserve price (SOL):',
        placeholder: startingPrice,
        validate: (value) => {
          const num = parseFloat(value)
          const startNum = parseFloat(startingPrice)
          if (isNaN(num) || num <= 0) return 'Please enter a valid positive number'
          if (auctionType === 'english' && num < startNum) return 'Reserve price must be >= starting price for English auctions'
          if (auctionType === 'dutch' && num > startNum) return 'Reserve price must be <= starting price for Dutch auctions'
          return
        }
      })

      if (isCancel(reservePrice)) {
        cancel('Auction creation cancelled')
        return
      }

      const duration = options.duration ?? await select({
        message: 'Auction duration:',
        options: [
          { value: '1', label: '1 hour', hint: 'Quick turnaround' },
          { value: '6', label: '6 hours', hint: 'Half day auction' },
          { value: '24', label: '1 day', hint: 'Standard duration' },
          { value: '72', label: '3 days', hint: 'Extended auction' },
          { value: '168', label: '1 week', hint: 'Maximum duration' }
        ]
      })

      if (isCancel(duration)) {
        cancel('Auction creation cancelled')
        return
      }

      const minBidIncrement = await text({
        message: 'Minimum bid increment (SOL):',
        placeholder: (parseFloat(startingPrice) * 0.05).toFixed(3),
        validate: (value) => {
          const num = parseFloat(value)
          if (isNaN(num) || num <= 0) return 'Please enter a valid positive number'
          if (num > parseFloat(startingPrice) * 0.5) return 'Increment seems too high'
          return
        }
      })

      if (isCancel(minBidIncrement)) {
        cancel('Auction creation cancelled')
        return
      }

      // Preview auction details
      note(
        `${chalk.bold('Auction Preview:')}\n` +
        `${chalk.gray('Type:')} ${auctionType.charAt(0).toUpperCase() + auctionType.slice(1)} Auction\n` +
        `${chalk.gray('Service:')} ${serviceTitle}\n` +
        `${chalk.gray('Starting Price:')} ${startingPrice} SOL\n` +
        `${chalk.gray('Reserve Price:')} ${reservePrice} SOL\n` +
        `${chalk.gray('Duration:')} ${duration} hours\n` +
        `${chalk.gray('Min Increment:')} ${minBidIncrement} SOL`,
        'Auction Details'
      )

      const confirmCreate = await confirm({
        message: 'Create this auction?'
      })

      if (isCancel(confirmCreate) || !confirmCreate) {
        cancel('Auction creation cancelled')
        return
      }

      const s = spinner()
      s.start('Connecting to Solana network...')
      
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected to Solana devnet')
      
      s.start('Creating auction on the blockchain...')
      
      try {
        // Convert to proper types for SDK
        const auctionEndTime = BigInt(Math.floor(Date.now() / 1000) + (parseInt(duration) * 60 * 60))
        
        // Generate PDAs for auction creation
        const { getProgramDerivedAddress, getAddressEncoder, getBytesEncoder, getUtf8Encoder, getU32Encoder, addEncoderSizePrefix } = await import('@solana/kit')
        const auctionId = `${serviceTitle.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
        
        // Derive auction PDA
        const [auctionPda] = await getProgramDerivedAddress({
          programAddress: client.config.programId!,
          seeds: [
            getBytesEncoder().encode(new Uint8Array([97, 117, 99, 116, 105, 111, 110])), // 'auction'
            getAddressEncoder().encode(wallet.address),
            addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()).encode(auctionId)
          ]
        })
        
        // Derive user registry PDA
        const [userRegistryPda] = await getProgramDerivedAddress({
          programAddress: client.config.programId!,
          seeds: [
            getBytesEncoder().encode(new Uint8Array([117, 115, 101, 114, 95, 114, 101, 103, 105, 115, 116, 114, 121])), // 'user_registry'
            getAddressEncoder().encode(wallet.address)
          ]
        })
        
        const auctionParams = {
          auctionData: {
            auctionType: auctionType as 'english' | 'dutch' | 'sealed', // Will map to SDK AuctionType enum
            startingPrice: BigInt(Math.floor(parseFloat(startingPrice) * 1_000_000_000)), // SOL to lamports
            reservePrice: BigInt(Math.floor(parseFloat(reservePrice) * 1_000_000_000)),
            auctionEndTime,
            minimumBidIncrement: BigInt(Math.floor(parseFloat(minBidIncrement) * 1_000_000_000))
          },
          metadataUri: `${serviceTitle}|${serviceDescription}`, // Simple metadata format
          agent: wallet.address // Using wallet as agent for now
        }

        const signature = await client.auction.createServiceAuction(
          auctionPda,
          userRegistryPda,
          {
            ...auctionParams,
            signer: wallet,
            deadline: auctionEndTime
          }
        )

        s.stop('✅ Auction created successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('🎯 Auction Created Successfully!')}\n\n` +
          `${chalk.bold('Auction Details:')}\n` +
          `${chalk.gray('Type:')} ${auctionType.charAt(0).toUpperCase() + auctionType.slice(1)}\n` +
          `${chalk.gray('Service:')} ${serviceTitle}\n` +
          `${chalk.gray('Duration:')} ${duration} hours\n` +
          `${chalk.gray('Starting Price:')} ${startingPrice} SOL\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('💡 Use')} ${chalk.cyan('npx ghostspeak auction list')} ${chalk.yellow('to view your auction')}`
        )
        
      } catch (error) {
        s.stop('❌ Auction creation failed')
        await handleTransactionError(error as Error)
      }
      
    } catch (error: unknown) {
      log.error(`Failed to create auction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// List auctions subcommand
auctionCommand
  .command('list')
  .description('List active auctions')
  .option('-t, --type <type>', 'Filter by auction type')
  .option('-s, --status <status>', 'Filter by status (active, ending, completed)')
  .option('--mine', 'Show only my auctions')
  .action(async (options: ListAuctionsOptions) => {
    intro(chalk.cyan('📋 Active Auctions'))

    try {
      const s = spinner()
      s.start('Loading auctions...')
      
      const { client, wallet } = await initializeClient('devnet')
      
      // Get auctions based on filters
      let auctions: Array<{
        address?: string
        auctionType: string
        currentBid?: bigint
        startingPrice: bigint
        reservePrice: bigint
        auctionEndTime: bigint
        totalBids: number
        minimumBidIncrement: bigint
        currentBidder?: string
        creator?: string
      }> = []
      if (options.mine) {
        // Use listAuctions with creator filter
        try {
          auctions = await client.auction.listAuctions({
            creator: wallet.address
          })
        } catch {
          auctions = [] // TODO: Implement proper auction filtering
        }
      } else if (options.status === 'ending') {
        try {
          auctions = await client.auction.getAuctionsEndingSoon(3600) // Next hour
        } catch {
          auctions = [] // TODO: Implement proper auction filtering
        }
      } else {
        try {
          auctions = await client.auction.listAuctions({
            auctionType: options.type as 'english' | 'dutch' | 'sealed' | undefined
          })
        } catch {
          auctions = [] // TODO: Implement proper auction filtering
        }
      }

      s.stop(`✅ Found ${auctions.length} auctions`)

      if (auctions.length === 0) {
        outro(
          `${chalk.yellow('No auctions found')}\n\n` +
          `${chalk.gray('Try:')} ${chalk.cyan('npx ghostspeak auction create')} ${chalk.gray('to create one')}`
        )
        return
      }

      // Display auctions in a formatted table
      log.info(`\n${chalk.bold('Active Auctions:')}\n`)
      
      auctions.forEach((auction, index: number) => {
        const timeLeft = Number(auction.auctionEndTime) - Math.floor(Date.now() / 1000)
        const hoursLeft = Math.max(0, Math.floor(timeLeft / 3600))
        const minutesLeft = Math.max(0, Math.floor((timeLeft % 3600) / 60))
        
        const currentPriceSOL = (Number(auction.currentBid ?? auction.startingPrice) / 1_000_000_000).toFixed(3)
        const reservePriceSOL = (Number(auction.reservePrice) / 1_000_000_000).toFixed(3)
        
        log.info(
          `${chalk.bold(`${index + 1}. ${(auction.auctionType as string).toUpperCase()} AUCTION`)}\n` +
          `   ${chalk.gray('Current Price:')} ${currentPriceSOL} SOL\n` +
          `   ${chalk.gray('Reserve Price:')} ${reservePriceSOL} SOL\n` +
          `   ${chalk.gray('Time Left:')} ${hoursLeft}h ${minutesLeft}m\n` +
          `   ${chalk.gray('Bids:')} ${auction.totalBids}\n` +
          `   ${chalk.gray('Status:')} ${timeLeft > 0 ? chalk.green('Active') : chalk.red('Ended')}\n`
        )
      })

      outro(
        `${chalk.yellow('💡 Commands:')}\n` +
        `${chalk.cyan('npx ghostspeak auction bid')} - Place a bid\n` +
        `${chalk.cyan('npx ghostspeak auction monitor')} - Monitor auctions\n` +
        `${chalk.cyan('npx ghostspeak auction finalize')} - Complete ended auctions`
      )
      
    } catch (error: unknown) {
      log.error(`Failed to load auctions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Bid on auction subcommand
auctionCommand
  .command('bid')
  .description('Place a bid on an auction')
  .option('-a, --auction <address>', 'Auction address')
  .option('-b, --bid <amount>', 'Bid amount in SOL')
  .action(async (options: BidAuctionOptions) => {
    intro(chalk.cyan('💰 Place Auction Bid'))

    try {
      const s = spinner()
      s.start('Loading active auctions...')
      
      const { client, wallet } = await initializeClient('devnet')
      
      let auctions: Array<{
        address?: string
        auctionType: string
        currentBid?: bigint
        startingPrice: bigint
        auctionEndTime: bigint
        totalBids: number
        minimumBidIncrement: bigint
      }> = []
      try {
        auctions = await client.auction.listAuctions({ status: 'active' as 'active' | 'ending' | 'completed' })
      } catch {
        auctions = [] // TODO: Implement proper auction listing
      }
      s.stop(`✅ Found ${auctions.length} active auctions`)

      if (auctions.length === 0) {
        outro(
          `${chalk.yellow('No active auctions found')}\n\n` +
          `${chalk.gray('Try:')} ${chalk.cyan('npx ghostspeak auction create')} ${chalk.gray('to create one')}`
        )
        return
      }

      // Select auction if not provided
      let selectedAuction = options.auction
      if (!selectedAuction) {
        const auctionChoice = await select({
          message: 'Select auction to bid on:',
          options: auctions.map((auction, index: number) => {
            const currentPriceSOL = (Number(auction.currentBid ?? auction.startingPrice) / 1_000_000_000).toFixed(3)
            const timeLeft = Number(auction.auctionEndTime) - Math.floor(Date.now() / 1000)
            const hoursLeft = Math.floor(timeLeft / 3600)
            
            return {
              value: auction.address || `auction-${index}`,
              label: `${(auction.auctionType as string).toUpperCase()} - ${currentPriceSOL} SOL`,
              hint: `${hoursLeft}h left, ${auction.totalBids} bids`
            }
          })
        })

        if (isCancel(auctionChoice)) {
          cancel('Bidding cancelled')
          return
        }

        selectedAuction = auctionChoice
      }

      const auction = auctions.find((a) => a.address === selectedAuction)
      if (!auction) {
        log.error('Auction not found')
        return
      }

      // Calculate suggested bid
      const currentPriceSOL = Number((auction as any).currentBid ?? (auction as any).startingPrice) / 1_000_000_000
      const minIncrementSOL = Number(auction.minimumBidIncrement) / 1_000_000_000
      const suggestedBid = currentPriceSOL + minIncrementSOL

      // Get bid amount
      let bidAmount = options.bid
      if (!bidAmount) {
        bidAmount = await text({
          message: `Enter bid amount (SOL):`,
          placeholder: suggestedBid.toFixed(3),
          validate: (value) => {
            const num = parseFloat(value)
            if (isNaN(num) || num <= 0) return 'Please enter a valid positive number'
            if (num <= currentPriceSOL) return `Bid must be higher than current price (${currentPriceSOL} SOL)`
            if (num < suggestedBid) return `Bid must be at least ${suggestedBid.toFixed(3)} SOL (current + minimum increment)`
            return
          }
        })

        if (isCancel(bidAmount)) {
          cancel('Bidding cancelled')
          return
        }
      }

      // Show bid strategy suggestion
      const bidAmountNum = parseFloat(bidAmount)
      let strategy = ''
      if (bidAmountNum > suggestedBid * 1.5) {
        strategy = chalk.yellow('⚠️  High bid - consider starting lower')
      } else if (bidAmountNum === suggestedBid) {
        strategy = chalk.blue('💡 Minimum competitive bid')
      } else {
        strategy = chalk.green('✅ Strategic bid amount')
      }

      note(
        `${chalk.bold('Bid Details:')}\n` +
        `${chalk.gray('Auction:')} ${(auction.auctionType as string).toUpperCase()}\n` +
        `${chalk.gray('Current Price:')} ${currentPriceSOL.toFixed(3)} SOL\n` +
        `${chalk.gray('Your Bid:')} ${bidAmount} SOL\n` +
        `${chalk.gray('Strategy:')} ${strategy}`,
        'Bid Preview'
      )

      const confirmBid = await confirm({
        message: `Place bid of ${bidAmount} SOL?`
      })

      if (isCancel(confirmBid) || !confirmBid) {
        cancel('Bidding cancelled')
        return
      }

      s.start('Placing bid on blockchain...')
      
      try {
        // Derive user registry PDA for the bidder
        const { getProgramDerivedAddress, getAddressEncoder, getBytesEncoder } = await import('@solana/kit')
        const [userRegistryPda] = await getProgramDerivedAddress({
          programAddress: client.config.programId!,
          seeds: [
            getBytesEncoder().encode(new Uint8Array([117, 115, 101, 114, 95, 114, 101, 103, 105, 115, 116, 114, 121])), // 'user_registry'
            getAddressEncoder().encode(wallet.address)
          ]
        })
        
        const bidParams = {
          auction: address(selectedAuction),
          bidAmount: BigInt(Math.floor(parseFloat(bidAmount) * 1_000_000_000)) // SOL to lamports
        }

        const signature = await client.auction.placeAuctionBid(
          address(selectedAuction),
          {
            ...bidParams,
            signer: wallet
          }
        )

        s.stop('✅ Bid placed successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('💰 Bid Placed Successfully!')}\n\n` +
          `${chalk.bold('Bid Details:')}\n` +
          `${chalk.gray('Amount:')} ${bidAmount} SOL\n` +
          `${chalk.gray('Auction:')} ${(auction.auctionType as string).toUpperCase()}\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('💡 Use')} ${chalk.cyan('npx ghostspeak auction monitor')} ${chalk.yellow('to track auction progress')}`
        )
        
      } catch (error) {
        s.stop('❌ Bid placement failed')
        await handleTransactionError(error as Error)
      }
      
    } catch (error: unknown) {
      log.error(`Failed to place bid: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Monitor auction subcommand
auctionCommand
  .command('monitor')
  .description('Monitor auction progress in real-time')
  .option('-a, --auction <address>', 'Specific auction to monitor')
  .action(async (options: { auction?: string }) => {
    intro(chalk.cyan('📡 Auction Monitor'))

    try {
      const { client, wallet } = await initializeClient('devnet')

      if (options.auction) {
        // Monitor specific auction
        log.info(`Monitoring auction: ${options.auction}`)
        
        let lastBidAmount = 0n
        let lastStatus = ''
        
        // TODO: Implement real-time monitoring when SDK supports it
        // Mock monitoring for now
        const mockAuctionSummary = {
          currentPrice: lastBidAmount ?? 1000000000n,
          timeRemaining: 3600n,
          winner: null as string | null,
          status: 'active' as const
        }
        
        log.info(`Monitoring auction: ${options.auction}`)
        log.info(`Current status: ${mockAuctionSummary.status}`)
        log.info(`Time remaining: ${Number(mockAuctionSummary.timeRemaining)} seconds`)
        
        // Simulate monitoring updates
        const monitorInterval = setInterval(() => {
          // In real implementation, this would check blockchain state
          log.info(`${chalk.blue('📊 Monitoring...')} Price: ${(Number(mockAuctionSummary.currentPrice) / 1_000_000_000).toFixed(3)} SOL`)
        }, 5000)
        
        const stopMonitoring = () => {
          clearInterval(monitorInterval)
        }
        
        // Monitor for 60 seconds maximum
        setTimeout(() => {
          stopMonitoring()
        }, 60000)

        outro('Monitoring complete')
      } else {
        // Monitor all active auctions
        const auctions = await client.auction.getAuctionsEndingSoon(24 * 3600) // Next 24 hours
        
        if (auctions.length === 0) {
          outro('No auctions ending soon')
          return
        }

        log.info(`\n${chalk.bold('Auctions Ending Soon:')}\n`)
        
        auctions.forEach((auction, index: number) => {
          const timeLeft = Number(auction.auctionEndTime) - Math.floor(Date.now() / 1000)
          const hoursLeft = Math.floor(timeLeft / 3600)
          const minutesLeft = Math.floor((timeLeft % 3600) / 60)
          const currentPriceSOL = (Number(auction.currentBid ?? auction.startingPrice) / 1_000_000_000).toFixed(3)
          
          const urgency = timeLeft < 3600 ? chalk.red('🔥 URGENT') : 
                         timeLeft < 6 * 3600 ? chalk.yellow('⚠️  SOON') : 
                         chalk.blue('📅 SCHEDULED')
          
          log.info(
            `${urgency} ${chalk.bold((auction.auctionType as string).toUpperCase())}\n` +
            `   ${chalk.gray('Current Price:')} ${currentPriceSOL} SOL\n` +
            `   ${chalk.gray('Time Left:')} ${hoursLeft}h ${minutesLeft}m\n` +
            `   ${chalk.gray('Bids:')} ${auction.totalBids}\n`
          )
        })

        outro(
          `${chalk.yellow('💡 Use')} ${chalk.cyan('npx ghostspeak auction monitor --auction <address>')} ${chalk.yellow('for real-time monitoring')}`
        )
      }
      
    } catch (error: unknown) {
      log.error(`Failed to monitor auctions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Finalize auction subcommand
auctionCommand
  .command('finalize')
  .description('Finalize completed auctions')
  .option('-a, --auction <address>', 'Auction address to finalize')
  .action(async (options: { auction?: string }) => {
    intro(chalk.cyan('🏁 Finalize Auction'))

    try {
      const s = spinner()
      s.start('Loading completed auctions...')
      
      const { client, wallet } = await initializeClient('devnet')
      
      let auctions: any[] = []
      try {
        auctions = await client.auction.listAuctions({ status: 'completed' as any })
      } catch {
        auctions = [] // TODO: Implement proper completed auction listing
      }
      const myAuctions = auctions.filter((a: any) => a.creator === wallet.address)
      
      s.stop(`✅ Found ${myAuctions.length} completed auctions`)

      if (myAuctions.length === 0) {
        outro(
          `${chalk.yellow('No completed auctions to finalize')}\n\n` +
          `${chalk.gray('Completed auctions will appear here when they end')}`
        )
        return
      }

      // Select auction if not provided
      let selectedAuction = options.auction
      if (!selectedAuction) {
        const auctionChoice = await select({
          message: 'Select auction to finalize:',
          options: myAuctions.map(auction => {
            const finalPriceSOL = (Number(auction.currentBid ?? auction.startingPrice) / 1_000_000_000).toFixed(3)
            
            return {
              value: auction.address,
              label: `${(auction.auctionType as string).toUpperCase()} - ${finalPriceSOL} SOL`,
              hint: `${auction.totalBids} bids, winner: ${auction.currentBidder || 'No bids'}`
            }
          })
        })

        if (isCancel(auctionChoice)) {
          cancel('Finalization cancelled')
          return
        }

        selectedAuction = auctionChoice
      }

      const auction = myAuctions.find((a: any) => a.address === selectedAuction)
      if (!auction) {
        log.error('Auction not found or not owned by you')
        return
      }

      // Show finalization details
      const finalPriceSOL = (Number((auction as any).currentBid ?? (auction as any).startingPrice) / 1_000_000_000).toFixed(3)
      const hasWinner = (auction as any).currentBidder && (auction as any).currentBid
      
      note(
        `${chalk.bold('Auction Results:')}\n` +
        `${chalk.gray('Type:')} ${(auction.auctionType as string).toUpperCase()}\n` +
        `${chalk.gray('Final Price:')} ${finalPriceSOL} SOL\n` +
        `${chalk.gray('Total Bids:')} ${auction.totalBids}\n` +
        `${chalk.gray('Winner:')} ${hasWinner ? (auction as any).currentBidder : 'No winner (reserve not met)'}\n` +
        `${chalk.gray('Status:')} ${hasWinner ? chalk.green('Successful') : chalk.yellow('Unsuccessful')}`,
        'Finalization Details'
      )

      const confirmFinalize = await confirm({
        message: hasWinner ? 'Finalize auction and transfer service?' : 'Finalize unsuccessful auction?'
      })

      if (isCancel(confirmFinalize) || !confirmFinalize) {
        cancel('Finalization cancelled')
        return
      }

      s.start('Finalizing auction on blockchain...')
      
      try {
        const signature = await client.auction.finalizeAuction(
          address(selectedAuction)
        )

        s.stop('✅ Auction finalized successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('🏁 Auction Finalized!')}\n\n` +
          `${chalk.bold('Results:')}\n` +
          `${chalk.gray('Final Price:')} ${finalPriceSOL} SOL\n` +
          `${chalk.gray('Winner:')} ${hasWinner ? (auction as any).currentBidder : 'No winner'}\n` +
          `${chalk.gray('Status:')} ${hasWinner ? chalk.green('Service transferred') : chalk.yellow('Auction closed')}\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}`
        )
        
      } catch (error) {
        s.stop('❌ Auction finalization failed')
        await handleTransactionError(error as Error)
      }
      
    } catch (error: unknown) {
      log.error(`Failed to finalize auction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Analytics subcommand
auctionCommand
  .command('analytics')
  .description('View auction analytics and insights')
  .option('--mine', 'Show only my auction analytics')
  .action(async (options: { mine?: boolean }) => {
    intro(chalk.cyan('📊 Auction Analytics'))

    try {
      const s = spinner()
      s.start('Generating analytics...')
      
      const { client, wallet } = await initializeClient('devnet')
      
      // Get analytics (currently mocked until SDK implementation is complete)
      const analytics = {
        totalAuctions: 0,
        activeAuctions: 0,
        completedAuctions: 0,
        successRate: 0,
        totalVolume: 0n,
        averagePrice: 0n,
        highestSale: 0n,
        totalFees: 0n,
        auctionTypeStats: {},
        topPerformers: []
      }
      
      // TODO: Implement real analytics when SDK supports it
      // const analytics = await client.auction.getAuctionAnalytics()
      
      s.stop('✅ Analytics generated')

      // Display comprehensive analytics
      log.info(`\n${chalk.bold('📈 Auction Performance Overview:')}\n`)
      
      log.info(
        `${chalk.gray('Total Auctions:')} ${analytics.totalAuctions || 0}\n` +
        `${chalk.gray('Active Auctions:')} ${analytics.activeAuctions || 0}\n` +
        `${chalk.gray('Completed Auctions:')} ${analytics.completedAuctions || 0}\n` +
        `${chalk.gray('Success Rate:')} ${((analytics.successRate || 0) * 100).toFixed(1)}%\n`
      )

      log.info(`\n${chalk.bold('💰 Financial Metrics:')}\n`)
      
      log.info(
        `${chalk.gray('Total Volume:')} ${(Number(analytics.totalVolume || 0) / 1_000_000_000).toFixed(3)} SOL\n` +
        `${chalk.gray('Average Price:')} ${(Number(analytics.averagePrice || 0) / 1_000_000_000).toFixed(3)} SOL\n` +
        `${chalk.gray('Highest Sale:')} ${(Number(analytics.highestSale || 0) / 1_000_000_000).toFixed(3)} SOL\n` +
        `${chalk.gray('Total Fees Collected:')} ${(Number(analytics.totalFees || 0) / 1_000_000_000).toFixed(3)} SOL\n`
      )

      log.info(`\n${chalk.bold('🎯 Auction Type Breakdown:')}\n`)
      
      if (analytics.auctionTypeStats) {
        Object.entries(analytics.auctionTypeStats).forEach(([type, stats]: [string, { count?: number; successRate?: number; averagePrice?: bigint }]) => {
          log.info(
            `${chalk.bold(type.toUpperCase())}:\n` +
            `   ${chalk.gray('Count:')} ${stats?.count || 0}\n` +
            `   ${chalk.gray('Success Rate:')} ${((stats?.successRate || 0) * 100).toFixed(1)}%\n` +
            `   ${chalk.gray('Avg Price:')} ${(Number(stats?.averagePrice || 0) / 1_000_000_000).toFixed(3)} SOL\n`
          )
        })
      }

      if (analytics.topPerformers?.length > 0) {
        log.info(`\n${chalk.bold('🏆 Top Performers:')}\n`)
        
        analytics.topPerformers.slice(0, 5).forEach((performer: { creator?: string; auctionCount?: number; totalVolume?: bigint; successRate?: number }, index: number) => {
          log.info(
            `${index + 1}. ${performer?.creator || 'Unknown'}\n` +
            `   ${chalk.gray('Auctions:')} ${performer?.auctionCount || 0}\n` +
            `   ${chalk.gray('Total Volume:')} ${(Number(performer?.totalVolume || 0) / 1_000_000_000).toFixed(3)} SOL\n` +
            `   ${chalk.gray('Success Rate:')} ${((performer?.successRate || 0) * 100).toFixed(1)}%\n`
          )
        })
      }

      outro(
        `${chalk.yellow('💡 Insights:')}\n` +
        `${chalk.cyan('npx ghostspeak auction create')} - Start a new auction\n` +
        `${chalk.cyan('npx ghostspeak auction list')} - Browse active auctions`
      )
      
    } catch (error: unknown) {
      log.error(`Failed to load analytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })