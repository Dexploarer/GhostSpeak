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
import { auctionTypeToString, formatSOL, solToLamports } from '../utils/auction-helpers.js'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import { AuctionStatus, AuctionType, NATIVE_MINT_ADDRESS } from '@ghostspeak/sdk'
import type {
  CreateAuctionOptions,
  BidAuctionOptions,
  ListAuctionsOptions
} from '../types/cli-types.js'

// Auction types for better type safety
interface AuctionListItem {
  address: string
  creator: Address
  auctionType: string
  startingPrice: bigint
  currentBid?: bigint
  currentPrice: bigint
  currentBidder?: Address
  minimumBidIncrement: bigint
  totalBids: number
  status: string
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
  .action(async (_options: CreateAuctionOptions) => {
    intro(chalk.cyan('🎯 Create Service Auction'))

    try {
      // Collect auction parameters
      const auctionType = _options.type ?? await select({
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

      const startingPrice = _options.startingPrice ?? await text({
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

      const reservePrice = _options.reservePrice ?? await text({
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

      const duration = _options.duration ?? await select({
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
        
        // Map string to AuctionType enum
        const auctionTypeMap: Record<string, AuctionType> = {
          'english': AuctionType.English,
          'dutch': AuctionType.Dutch,
          'sealed': AuctionType.SealedBid
        }
        
        // Create auction params matching SDK expectations
        const auctionParams = {
          title: serviceTitle,
          description: serviceDescription,
          category: auctionType as string, // Use auction type as category
          requirements: ['Complete the service as described'], // Default requirement
          startPrice: solToLamports(startingPrice),
          minIncrement: solToLamports(minBidIncrement),
          duration: BigInt(duration), // duration in hours
          paymentToken: NATIVE_MINT_ADDRESS, // SOL
          agentAddress: wallet.address // Using wallet as agent for now
        }

        const signature = await client.auction.create(
          toSDKSigner(wallet),
          auctionParams
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

      let auctions: {
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
      }[] = []
      if (options.mine) {
        // Use listAuctions with creator filter
        try {
          const rawAuctions = await client.auction.listAuctions({
            creator: wallet.address
          })
          auctions = rawAuctions.map(a => ({
            address: a.auction.toString(),
            auctionType: auctionTypeToString(a.auctionType),
            currentBid: a.currentPrice,
            startingPrice: a.startingPrice,
            reservePrice: a.reservePrice,
            auctionEndTime: a.auctionEndTime,
            totalBids: a.totalBids,
            minimumBidIncrement: a.minimumBidIncrement,
            currentBidder: a.currentWinner?.toString(),
            creator: a.creator.toString()
          }))
        } catch (error) {
          console.error('Failed to fetch auctions:', error)
          auctions = []
        }
      } else if (options.status === 'ending') {
        try {
          const rawAuctions = await client.auction.getAuctionsEndingSoon(3600) // Next hour
          auctions = rawAuctions.map(a => ({
            address: a.auction.toString(),
            auctionType: auctionTypeToString(a.auctionType),
            currentBid: a.currentPrice,
            startingPrice: a.startingPrice,
            reservePrice: a.reservePrice,
            auctionEndTime: a.auctionEndTime,
            totalBids: a.totalBids,
            minimumBidIncrement: a.minimumBidIncrement,
            currentBidder: a.currentWinner?.toString(),
            creator: a.creator.toString()
          }))
        } catch (error) {
          console.error('Failed to fetch auctions:', error)
          auctions = []
        }
      } else {
        try {
          const typeMap: Record<string, AuctionType> = {
            'english': AuctionType.English,
            'dutch': AuctionType.Dutch,
            'sealed': AuctionType.SealedBid,
            'vickrey': AuctionType.Vickrey
          }
          const rawAuctions = await client.auction.listAuctions({
            auctionType: options.type ? typeMap[options.type] : undefined
          })
          auctions = rawAuctions.map(a => ({
            address: a.auction.toString(),
            auctionType: auctionTypeToString(a.auctionType),
            currentBid: a.currentPrice,
            startingPrice: a.startingPrice,
            reservePrice: a.reservePrice,
            auctionEndTime: a.auctionEndTime,
            totalBids: a.totalBids,
            minimumBidIncrement: a.minimumBidIncrement,
            currentBidder: a.currentWinner?.toString(),
            creator: a.creator.toString()
          }))
        } catch (error) {
          console.error('Failed to fetch auctions:', error)
          auctions = []
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
      
      auctions.forEach((auction, index) => {
        const timeLeft = Number(auction.auctionEndTime) - Math.floor(Date.now() / 1000)
        const hoursLeft = Math.max(0, Math.floor(timeLeft / 3600))
        const minutesLeft = Math.max(0, Math.floor((timeLeft % 3600) / 60))
        
        const currentPriceSOL = formatSOL(auction.currentBid ?? auction.startingPrice)
        const reservePriceSOL = formatSOL(auction.reservePrice)
        
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
  .action(async (_options: BidAuctionOptions) => {
    intro(chalk.cyan('💰 Place Auction Bid'))

    try {
      const s = spinner()
      s.start('Loading active auctions...')
      
      const { client, wallet } = await initializeClient('devnet')
      
      let auctions: any[] = []
      try {
        const rawAuctions = await client.auction.listAuctions({ status: AuctionStatus.Active })
        auctions = rawAuctions
      } catch {
        // Fetch all auctions without specific filters
        auctions = await client.auction.listAuctions()
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
      let selectedAuction = _options.auction
      if (!selectedAuction) {
        const auctionChoice = await select({
          message: 'Select auction to bid on:',
          options: auctions.map((auction) => {
            const currentPriceSOL = formatSOL(auction.currentPrice ?? auction.startingPrice)
            const timeLeft = Number(auction.auctionEndTime) - Math.floor(Date.now() / 1000)
            const hoursLeft = Math.floor(timeLeft / 3600)
            
            return {
              value: auction.auction.toString(),
              label: `${auction.auctionType.toString().toUpperCase()} - ${currentPriceSOL} SOL`,
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

      const auction = auctions.find((a) => a.auction.toString() === selectedAuction)
      if (!auction) {
        log.error('Auction not found')
        return
      }

      // Calculate suggested bid
      const auctionData = auction as unknown as AuctionListItem
      const currentPriceSOL = Number(auctionData.currentBid ?? auctionData.startingPrice) / 1_000_000_000
      const minIncrementSOL = Number(auctionData.minimumBidIncrement) / 1_000_000_000
      const suggestedBid = currentPriceSOL + minIncrementSOL

      // Get bid amount
      let bidAmount: string = _options.bid ?? ''
      if (!bidAmount) {
        const bidInput = await text({
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

        if (isCancel(bidInput)) {
          cancel('Bidding cancelled')
          return
        }
        bidAmount = bidInput
      }

      // Show bid strategy suggestion
      const bidAmountNum = parseFloat(bidAmount as string)
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
        `${chalk.gray('Auction:')} ${auction.auctionType.toString().toUpperCase()}\n` +
        `${chalk.gray('Current Price:')} ${currentPriceSOL.toFixed(3)} SOL\n` +
        `${chalk.gray('Your Bid:')} ${bidAmount as string} SOL\n` +
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
          auction: address(selectedAuction as string),
          bidAmount: solToLamports(bidAmount) // SOL to lamports
        }

        const signature = await client.auction.placeAuctionBid(
          userRegistryPda,
          {
            ...bidParams,
            signer: toSDKSigner(wallet) as any
          }
        )

        s.stop('✅ Bid placed successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('💰 Bid Placed Successfully!')}\n\n` +
          `${chalk.bold('Bid Details:')}\n` +
          `${chalk.gray('Amount:')} ${bidAmount} SOL\n` +
          `${chalk.gray('Auction:')} ${auction.auctionType.toString().toUpperCase()}\n\n` +
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
  .action(async (_options: { auction?: string }) => {
    intro(chalk.cyan('📡 Auction Monitor'))

    try {
      const { client, wallet } = await initializeClient('devnet')
      // Acknowledge unused variables for future development
      void client
      void wallet

      if (_options.auction) {
        // Monitor specific auction
        log.info(`Monitoring auction: ${_options.auction}`)
        
        let lastBidAmount = 0n
        let lastStatus = ''
        // Acknowledge unused variables for future monitoring implementation
        void lastBidAmount
        void lastStatus
        
        // Implement real-time monitoring using SDK
        const auctionAddress = address(_options.auction)
        
        // Get initial auction state
        const initialAuction = await client.auction.getAuctionSummary(auctionAddress)
        if (!initialAuction) {
          cancel('Auction not found')
          return
        }
        
        lastBidAmount = initialAuction.currentPrice
        lastStatus = initialAuction.status.toString()
        
        log.info(`Monitoring auction: ${_options.auction}`)
        log.info(`Initial status: ${lastStatus}`)
        log.info(`Starting price: ${formatSOL(initialAuction.startingPrice)} SOL`)
        log.info(`Current price: ${formatSOL(initialAuction.currentPrice)} SOL`)
        log.info(`Time remaining: ${Number(initialAuction.timeRemaining ?? 0)} seconds`)
        log.info('')
        log.info(chalk.yellow('🔄 Monitoring for updates... (Press Ctrl+C to stop)'))
        
        // Start monitoring with SDK method
        const stopMonitoring = await client.auction.monitorAuction(
          auctionAddress,
          (auction) => {
            // Check for bid updates
            if (auction.currentPrice !== lastBidAmount) {
              const bidDiff = Number(auction.currentPrice - lastBidAmount) / 1_000_000_000
              log.info(`${chalk.green('💰 New bid!')} ${formatSOL(auction.currentPrice)} SOL (+${bidDiff.toFixed(3)} SOL)`)
              if (auction.currentWinner) {
                log.info(`   Bidder: ${auction.currentWinner.toString().slice(0, 8)}...`)
              }
              lastBidAmount = auction.currentPrice
            }
            
            // Check for status updates
            if (auction.status.toString() !== lastStatus) {
              log.info(`${chalk.yellow('🔄 Status change:')} ${lastStatus} → ${auction.status.toString()}`)
              lastStatus = auction.status.toString()
              
              if (auction.status === AuctionStatus.Settled && auction.winner) {
                log.info(`${chalk.green('🏆 Auction won by:')} ${auction.winner.toString()}`)
                log.info(`${chalk.green('💵 Final price:')} ${formatSOL(auction.currentPrice)} SOL`)
                stopMonitoring()
              }
            }
            
            // Update time remaining
            if (auction.timeRemaining && auction.timeRemaining > 0n) {
              const hours = Math.floor(Number(auction.timeRemaining) / 3600)
              const minutes = Math.floor((Number(auction.timeRemaining) % 3600) / 60)
              const seconds = Number(auction.timeRemaining) % 60
              process.stdout.write(`\r${chalk.gray('Time remaining:')} ${hours}h ${minutes}m ${seconds}s  `)
            }
          }
        )
        
        // Handle Ctrl+C gracefully
        process.on('SIGINT', () => {
          console.log('\n')
          stopMonitoring()
          outro('Monitoring stopped')
          process.exit(0)
        })
      } else {
        // Monitor all active auctions
        const auctions = await client.auction.getAuctionsEndingSoon(24 * 3600) // Next 24 hours
        
        if (auctions.length === 0) {
          outro('No auctions ending soon')
          return
        }

        log.info(`\n${chalk.bold('Auctions Ending Soon:')}\n`)
        
        auctions.forEach((auction) => {
          const timeLeft = Number(auction.auctionEndTime) - Math.floor(Date.now() / 1000)
          const hoursLeft = Math.floor(timeLeft / 3600)
          const minutesLeft = Math.floor((timeLeft % 3600) / 60)
          const currentPriceSOL = formatSOL(auction.currentPrice ?? auction.startingPrice)
          
          const urgency = timeLeft < 3600 ? chalk.red('🔥 URGENT') : 
                         timeLeft < 6 * 3600 ? chalk.yellow('⚠️  SOON') : 
                         chalk.blue('📅 SCHEDULED')
          
          log.info(
            `${urgency} ${chalk.bold(auction.auctionType.toString().toUpperCase())}\n` +
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
  .action(async (_options: { auction?: string }) => {
    intro(chalk.cyan('🏁 Finalize Auction'))

    try {
      const s = spinner()
      s.start('Loading completed auctions...')
      
      const { client, wallet } = await initializeClient('devnet')
      
      // Fetch completed/settled auctions
      const auctions = await client.auction.listAuctions({ status: AuctionStatus.Settled })
      const myAuctions = auctions.filter((a) => a.creator === wallet.address)
      
      s.stop(`✅ Found ${myAuctions.length} completed auctions`)

      if (myAuctions.length === 0) {
        outro(
          `${chalk.yellow('No completed auctions to finalize')}\n\n` +
          `${chalk.gray('Completed auctions will appear here when they end')}`
        )
        return
      }

      // Select auction if not provided
      let selectedAuction = _options.auction
      if (!selectedAuction) {
        const auctionChoice = await select({
          message: 'Select auction to finalize:',
          options: myAuctions.map(auction => {
            const finalPriceSOL = formatSOL(auction.currentPrice ?? auction.startingPrice)
            
            return {
              value: auction.auction.toString(),
              label: `${auction.auctionType.toString().toUpperCase()} - ${finalPriceSOL} SOL`,
              hint: `${auction.totalBids} bids, winner: ${auction.currentWinner?.toString() ?? 'No bids'}`
            }
          })
        })

        if (isCancel(auctionChoice)) {
          cancel('Finalization cancelled')
          return
        }

        selectedAuction = auctionChoice
      }

      const auction = myAuctions.find((a) => a.auction.toString() === selectedAuction)
      if (!auction) {
        log.error('Auction not found or not owned by you')
        return
      }

      // Show finalization details
      const finalPriceSOL = formatSOL(auction.currentPrice ?? auction.startingPrice)
      const hasWinner = auction.currentWinner && auction.currentPrice
      
      note(
        `${chalk.bold('Auction Results:')}\n` +
        `${chalk.gray('Type:')} ${auction.auctionType.toString().toUpperCase()}\n` +
        `${chalk.gray('Final Price:')} ${finalPriceSOL} SOL\n` +
        `${chalk.gray('Total Bids:')} ${auction.totalBids}\n` +
        `${chalk.gray('Winner:')} ${hasWinner ? auction.currentWinner?.toString() : 'No winner (reserve not met)'}\n` +
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
        const signature = await client.auction.finalizeAuction({
          auction: address(selectedAuction),
          signer: toSDKSigner(wallet)
        })

        s.stop('✅ Auction finalized successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('🏁 Auction Finalized!')}\n\n` +
          `${chalk.bold('Results:')}\n` +
          `${chalk.gray('Final Price:')} ${finalPriceSOL} SOL\n` +
          `${chalk.gray('Winner:')} ${hasWinner ? auction.currentWinner ?? 'Unknown' : 'No winner'}\n` +
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
  .action(async (_options: { mine?: boolean }) => {
    intro(chalk.cyan('📊 Auction Analytics'))
    
    // Acknowledge options for future analytics filtering implementation
    void _options

    try {
      const s = spinner()
      s.start('Generating analytics...')
      
      const { client, wallet: _wallet } = await initializeClient('devnet')
      // Acknowledge unused variables for future analytics implementation
      void client
      void _wallet
      
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
        `${chalk.gray('Total Auctions:')} ${analytics.totalAuctions ?? 0}\n` +
        `${chalk.gray('Active Auctions:')} ${analytics.activeAuctions ?? 0}\n` +
        `${chalk.gray('Completed Auctions:')} ${analytics.completedAuctions ?? 0}\n` +
        `${chalk.gray('Success Rate:')} ${((analytics.successRate ?? 0) * 100).toFixed(1)}%\n`
      )

      log.info(`\n${chalk.bold('💰 Financial Metrics:')}\n`)
      
      log.info(
        `${chalk.gray('Total Volume:')} ${formatSOL(analytics.totalVolume ?? 0)} SOL\n` +
        `${chalk.gray('Average Price:')} ${formatSOL(analytics.averagePrice ?? 0)} SOL\n` +
        `${chalk.gray('Highest Sale:')} ${formatSOL(analytics.highestSale ?? 0)} SOL\n` +
        `${chalk.gray('Total Fees Collected:')} ${formatSOL(analytics.totalFees ?? 0)} SOL\n`
      )

      log.info(`\n${chalk.bold('🎯 Auction Type Breakdown:')}\n`)
      
      if (analytics.auctionTypeStats) {
        Object.entries(analytics.auctionTypeStats).forEach(([type, stats]) => {
          log.info(
            `${chalk.bold(type.toUpperCase())}:\n` +
            `   ${chalk.gray('Count:')} ${stats && typeof stats === 'object' && 'count' in stats ? stats.count : 0}\n` +
            `   ${chalk.gray('Success Rate:')} ${stats && typeof stats === 'object' && 'successRate' in stats ? ((stats.successRate as number) * 100).toFixed(1) : '0.0'}%\n` +
            `   ${chalk.gray('Avg Price:')} ${stats && typeof stats === 'object' && 'averagePrice' in stats ? formatSOL(Number(stats.averagePrice)) : '0.000'} SOL\n`
          )
        })
      }

      if (analytics.topPerformers?.length > 0) {
        log.info(`\n${chalk.bold('🏆 Top Performers:')}\n`)
        
        analytics.topPerformers.slice(0, 5).forEach((performer: { creator?: string; auctionCount?: number; totalVolume?: bigint; successRate?: number }, index: number) => {
          log.info(
            `${index + 1}. ${performer?.creator ?? 'Unknown'}\n` +
            `   ${chalk.gray('Auctions:')} ${performer?.auctionCount ?? 0}\n` +
            `   ${chalk.gray('Total Volume:')} ${formatSOL(performer?.totalVolume ?? 0)} SOL\n` +
            `   ${chalk.gray('Success Rate:')} ${((performer?.successRate ?? 0) * 100).toFixed(1)}%\n`
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