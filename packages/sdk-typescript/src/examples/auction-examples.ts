/**
 * Comprehensive Auction Examples
 * 
 * Demonstrates all auction functionality with real Web3.js v2 execution
 * including creation, bidding, monitoring, and settlement.
 */

import { createSolanaRpc, createDefaultRpcTransport, generateKeyPairSigner } from '@solana/kit'
import { GhostSpeakClient } from '../client/GhostSpeakClient.js'
import { GHOSTSPEAK_PROGRAM_ID } from '../types/index.js'
import { 
  deriveAuctionPda,
  AuctionTimeUtils,
  AuctionPricingUtils,
  AuctionValidationUtils
} from '../utils/auction-helpers.js'
import { deriveAgentPda, deriveUserRegistryPda } from '../utils/pda.js'
import type { AuctionType } from '../generated/index.js'

/**
 * Example 1: Create a basic English auction
 */
export async function createEnglishAuctionExample() {
  console.log('🏗️ Creating English Auction Example')
  console.log('===================================')

  try {
    // Setup
    const transport = createDefaultRpcTransport({ 
      url: 'https://api.devnet.solana.com' 
    })
    const rpc = createSolanaRpc({ transport })
    const client = GhostSpeakClient.create(rpc, GHOSTSPEAK_PROGRAM_ID)

    // Generate keypairs
    const creator = await generateKeyPairSigner()
    const agent = await generateKeyPairSigner()

    console.log(`👤 Creator: ${creator.address}`)
    console.log(`🤖 Agent: ${agent.address}`)

    // Derive PDAs
    const agentPda = await deriveAgentPda(GHOSTSPEAK_PROGRAM_ID, creator.address, 'auction-agent')
    const auctionPda = await deriveAuctionPda(GHOSTSPEAK_PROGRAM_ID, agentPda, creator.address)
    const userRegistryPda = await deriveUserRegistryPda(GHOSTSPEAK_PROGRAM_ID)

    console.log(`📍 Agent PDA: ${agentPda}`)
    console.log(`🏛️ Auction PDA: ${auctionPda}`)

    // Auction parameters
    const auctionParams = {
      auctionData: {
        auctionType: 'English' as AuctionType,
        startingPrice: AuctionPricingUtils.solToLamports(1.0), // 1 SOL
        reservePrice: AuctionPricingUtils.solToLamports(0.8),  // 0.8 SOL reserve
        auctionEndTime: AuctionTimeUtils.getEndTime(24), // 24 hours
        minimumBidIncrement: AuctionPricingUtils.solToLamports(0.1) // 0.1 SOL increments
      },
      agent: agentPda
    }

    // Validate parameters
    const validation = AuctionValidationUtils.validateAuctionParams({
      startingPrice: auctionParams.auctionData.startingPrice,
      reservePrice: auctionParams.auctionData.reservePrice,
      endTime: auctionParams.auctionData.auctionEndTime,
      increment: auctionParams.auctionData.minimumBidIncrement
    })

    if (!validation.valid) {
      console.error('❌ Validation failed:', validation.errors)
      return
    }

    console.log('✅ Parameters validated')

    // Create auction with detailed results
    const result = await client.auction.createServiceAuctionWithDetails(
      creator,
      auctionPda,
      userRegistryPda,
      auctionParams
    )

    console.log('')
    console.log('🎉 AUCTION CREATED SUCCESSFULLY!')
    console.log(`📝 Signature: ${result.signature}`)
    console.log(`🔗 View on Solana Explorer: ${result.urls.solanaExplorer}`)
    console.log(`📊 View on Solscan: ${result.urls.solscan}`)

    return {
      auctionPda,
      signature: result.signature,
      creator,
      auctionParams
    }

  } catch (error) {
    console.error('❌ Failed to create auction:', error)
    throw error
  }
}

/**
 * Example 2: Place bids on an auction
 */
export async function placeBidsExample(auctionPda: string) {
  console.log('💰 Placing Bids Example')
  console.log('=======================')

  try {
    // Setup
    const transport = createDefaultRpcTransport({ 
      url: 'https://api.devnet.solana.com' 
    })
    const rpc = createSolanaRpc({ transport })
    const client = GhostSpeakClient.create(rpc, GHOSTSPEAK_PROGRAM_ID)

    // Generate bidder keypairs
    const bidder1 = await generateKeyPairSigner()
    const bidder2 = await generateKeyPairSigner()
    const userRegistryPda = await deriveUserRegistryPda(GHOSTSPEAK_PROGRAM_ID)

    console.log(`👤 Bidder 1: ${bidder1.address}`)
    console.log(`👤 Bidder 2: ${bidder2.address}`)

    // Get current auction state
    const auctionSummary = await client.auction.getAuctionSummary(auctionPda as any)
    if (!auctionSummary) {
      throw new Error('Auction not found')
    }

    console.log('')
    console.log('📊 CURRENT AUCTION STATE:')
    console.log(`   Status: ${auctionSummary.status}`)
    console.log(`   Current Price: ${AuctionPricingUtils.lamportsToSol(auctionSummary.currentPrice)} SOL`)
    console.log(`   Total Bids: ${auctionSummary.totalBids}`)
    console.log(`   Time Remaining: ${AuctionTimeUtils.formatTimeRemaining(auctionSummary.timeRemaining || 0n)}`)

    // Calculate optimal bids
    const bid1Amount = await client.auction.calculateOptimalBid(auctionPda as any, 'conservative')
    const bid2Amount = await client.auction.calculateOptimalBid(auctionPda as any, 'aggressive')

    console.log('')
    console.log('💡 CALCULATED OPTIMAL BIDS:')
    console.log(`   Conservative bid: ${AuctionPricingUtils.lamportsToSol(bid1Amount)} SOL`)
    console.log(`   Aggressive bid: ${AuctionPricingUtils.lamportsToSol(bid2Amount)} SOL`)

    // Place first bid
    console.log('')
    console.log('📤 Placing first bid...')
    const bid1Result = await client.auction.placeAuctionBidWithDetails(
      bidder1,
      auctionPda as any,
      userRegistryPda,
      {
        auction: auctionPda as any,
        bidAmount: bid1Amount
      }
    )

    console.log(`✅ First bid placed: ${bid1Result.signature}`)
    console.log(`🔗 View transaction: ${bid1Result.urls.solanaExplorer}`)

    // Wait a moment then place second bid
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('')
    console.log('📤 Placing second bid...')
    const bid2Result = await client.auction.placeAuctionBidWithDetails(
      bidder2,
      auctionPda as any,
      userRegistryPda,
      {
        auction: auctionPda as any,
        bidAmount: bid2Amount
      }
    )

    console.log(`✅ Second bid placed: ${bid2Result.signature}`)
    console.log(`🔗 View transaction: ${bid2Result.urls.solanaExplorer}`)

    // Get updated auction state
    const updatedSummary = await client.auction.getAuctionSummary(auctionPda as any)
    if (updatedSummary) {
      console.log('')
      console.log('📊 UPDATED AUCTION STATE:')
      console.log(`   Current Price: ${AuctionPricingUtils.lamportsToSol(updatedSummary.currentPrice)} SOL`)
      console.log(`   Current Winner: ${updatedSummary.currentWinner || 'None'}`)
      console.log(`   Total Bids: ${updatedSummary.totalBids}`)
    }

    return {
      bid1: { bidder: bidder1.address, amount: bid1Amount, signature: bid1Result.signature },
      bid2: { bidder: bidder2.address, amount: bid2Amount, signature: bid2Result.signature }
    }

  } catch (error) {
    console.error('❌ Failed to place bids:', error)
    throw error
  }
}

/**
 * Example 3: Monitor auction in real-time
 */
export async function monitorAuctionExample(auctionPda: string) {
  console.log('👀 Auction Monitoring Example')
  console.log('=============================')

  try {
    // Setup
    const transport = createDefaultRpcTransport({ 
      url: 'https://api.devnet.solana.com' 
    })
    const rpc = createSolanaRpc({ transport })
    const client = GhostSpeakClient.create(rpc, GHOSTSPEAK_PROGRAM_ID)

    console.log(`📡 Starting real-time monitoring for auction: ${auctionPda}`)
    console.log('Press Ctrl+C to stop monitoring...')

    // Start monitoring
    const stopMonitoring = await client.auction.monitorAuction(
      auctionPda as any,
      (auction) => {
        console.log('')
        console.log('🔄 AUCTION UPDATE:')
        console.log(`   Time: ${new Date().toISOString()}`)
        console.log(`   Status: ${auction.status}`)
        console.log(`   Current Price: ${AuctionPricingUtils.lamportsToSol(auction.currentPrice)} SOL`)
        console.log(`   Current Winner: ${auction.currentWinner || 'None'}`)
        console.log(`   Total Bids: ${auction.totalBids}`)
        console.log(`   Time Remaining: ${AuctionTimeUtils.formatTimeRemaining(auction.timeRemaining || 0n)}`)

        // Check for alerts
        const alert = require('../utils/auction-helpers.js').AuctionNotificationUtils.checkAuctionAlerts(auction)
        if (alert.type) {
          console.log(`🚨 ALERT (${alert.urgency.toUpperCase()}): ${alert.message}`)
        }
      }
    )

    // Monitor for 30 seconds then stop
    setTimeout(() => {
      console.log('')
      console.log('⏹️ Stopping monitoring...')
      stopMonitoring()
    }, 30000)

    return stopMonitoring

  } catch (error) {
    console.error('❌ Failed to monitor auction:', error)
    throw error
  }
}

/**
 * Example 4: Get auction analytics and history
 */
export async function auctionAnalyticsExample(auctionPda: string) {
  console.log('📊 Auction Analytics Example')
  console.log('============================')

  try {
    // Setup
    const transport = createDefaultRpcTransport({ 
      url: 'https://api.devnet.solana.com' 
    })
    const rpc = createSolanaRpc({ transport })
    const client = GhostSpeakClient.create(rpc, GHOSTSPEAK_PROGRAM_ID)

    // Get auction summary
    const auction = await client.auction.getAuctionSummary(auctionPda as any)
    if (!auction) {
      throw new Error('Auction not found')
    }

    console.log('📋 AUCTION DETAILS:')
    console.log(`   Auction: ${auction.auction}`)
    console.log(`   Creator: ${auction.creator}`)
    console.log(`   Agent: ${auction.agent}`)
    console.log(`   Type: ${auction.auctionType}`)
    console.log(`   Status: ${auction.status}`)

    console.log('')
    console.log('💰 PRICING INFORMATION:')
    console.log(`   Starting Price: ${AuctionPricingUtils.lamportsToSol(auction.startingPrice)} SOL`)
    console.log(`   Reserve Price: ${AuctionPricingUtils.lamportsToSol(auction.reservePrice)} SOL`)
    console.log(`   Current Price: ${AuctionPricingUtils.lamportsToSol(auction.currentPrice)} SOL`)
    console.log(`   Bid Increment: ${AuctionPricingUtils.lamportsToSol(auction.minimumBidIncrement)} SOL`)

    // Calculate price appreciation
    const appreciation = auction.currentPrice > auction.startingPrice 
      ? Number(((auction.currentPrice - auction.startingPrice) * 100n) / auction.startingPrice)
      : 0
    
    console.log(`   Price Appreciation: ${appreciation.toFixed(2)}%`)

    console.log('')
    console.log('⏰ TIMING INFORMATION:')
    const endDate = new Date(Number(auction.auctionEndTime) * 1000)
    console.log(`   End Time: ${endDate.toISOString()}`)
    console.log(`   Time Remaining: ${AuctionTimeUtils.formatTimeRemaining(auction.timeRemaining || 0n)}`)

    console.log('')
    console.log('🎯 ACTIVITY METRICS:')
    console.log(`   Total Bids: ${auction.totalBids}`)
    console.log(`   Current Winner: ${auction.currentWinner || 'None'}`)

    // Get bid history
    const bidHistory = await client.auction.getBidHistory(auctionPda as any)
    
    console.log('')
    console.log('📈 BID HISTORY:')
    if (bidHistory.length === 0) {
      console.log('   No bids yet')
    } else {
      bidHistory.forEach((bid, index) => {
        const bidDate = new Date(Number(bid.timestamp) * 1000)
        const winningStatus = bid.isWinning ? '👑 WINNING' : '   '
        console.log(`   ${index + 1}. ${AuctionPricingUtils.lamportsToSol(bid.amount)} SOL by ${bid.bidder} ${winningStatus}`)
        console.log(`      Time: ${bidDate.toISOString()}`)
      })
    }

    // Get overall analytics
    const analytics = await client.auction.getAuctionAnalytics()
    
    console.log('')
    console.log('🌐 GLOBAL AUCTION ANALYTICS:')
    console.log(`   Total Auctions: ${analytics.totalAuctions}`)
    console.log(`   Active Auctions: ${analytics.activeAuctions}`)
    console.log(`   Settled Auctions: ${analytics.settledAuctions}`)
    console.log(`   Total Volume: ${AuctionPricingUtils.lamportsToSol(analytics.totalVolume)} SOL`)
    console.log(`   Average Bid Count: ${analytics.averageBidCount.toFixed(1)}`)

    return {
      auction,
      bidHistory,
      analytics,
      appreciation
    }

  } catch (error) {
    console.error('❌ Failed to get auction analytics:', error)
    throw error
  }
}

/**
 * Example 5: Finalize auction and settlement
 */
export async function finalizeAuctionExample(auctionPda: string, creator: any) {
  console.log('🏁 Auction Finalization Example')
  console.log('===============================')

  try {
    // Setup
    const transport = createDefaultRpcTransport({ 
      url: 'https://api.devnet.solana.com' 
    })
    const rpc = createSolanaRpc({ transport })
    const client = GhostSpeakClient.create(rpc, GHOSTSPEAK_PROGRAM_ID)

    // Check auction state before finalization
    const auction = await client.auction.getAuctionSummary(auctionPda as any)
    if (!auction) {
      throw new Error('Auction not found')
    }

    console.log('📊 PRE-FINALIZATION STATE:')
    console.log(`   Status: ${auction.status}`)
    console.log(`   End Time: ${new Date(Number(auction.auctionEndTime) * 1000).toISOString()}`)
    console.log(`   Current Price: ${AuctionPricingUtils.lamportsToSol(auction.currentPrice)} SOL`)
    console.log(`   Current Winner: ${auction.currentWinner || 'None'}`)
    console.log(`   Total Bids: ${auction.totalBids}`)

    // Check if auction can be finalized
    const now = AuctionTimeUtils.now()
    if (now < auction.auctionEndTime) {
      const remaining = auction.auctionEndTime - now
      console.log(`⏳ Auction cannot be finalized yet. ${AuctionTimeUtils.formatTimeRemaining(remaining)} remaining.`)
      return { error: 'Auction not ended' }
    }

    if (auction.status !== 'Active') {
      console.log(`⚠️ Auction already finalized with status: ${auction.status}`)
      return { error: 'Already finalized' }
    }

    console.log('')
    console.log('🏁 Finalizing auction...')

    // Finalize auction
    const result = await client.auction.finalizeAuctionWithDetails(
      creator,
      auctionPda as any
    )

    console.log('')
    console.log('🎉 AUCTION FINALIZED SUCCESSFULLY!')
    console.log(`📝 Signature: ${result.signature}`)
    console.log(`🔗 View transaction: ${result.urls.solanaExplorer}`)

    // Get final auction state
    const finalAuction = await client.auction.getAuctionSummary(auctionPda as any)
    if (finalAuction) {
      console.log('')
      console.log('📊 FINAL AUCTION STATE:')
      console.log(`   Status: ${finalAuction.status}`)
      console.log(`   Winner: ${finalAuction.winner || 'None'}`)
      console.log(`   Final Price: ${AuctionPricingUtils.lamportsToSol(finalAuction.currentPrice)} SOL`)
      
      if (finalAuction.status === 'Settled') {
        console.log('✅ Auction settled successfully!')
        console.log('💼 Work order can now be created for winner')
      } else if (finalAuction.status === 'Cancelled') {
        console.log('❌ Auction cancelled - reserve price not met')
      }
    }

    return {
      signature: result.signature,
      finalState: finalAuction
    }

  } catch (error) {
    console.error('❌ Failed to finalize auction:', error)
    throw error
  }
}

/**
 * Example 6: Complete auction workflow
 */
export async function completeAuctionWorkflowExample() {
  console.log('🔄 Complete Auction Workflow Example')
  console.log('===================================')

  try {
    console.log('Step 1: Creating auction...')
    const auctionResult = await createEnglishAuctionExample()
    
    console.log('')
    console.log('Step 2: Placing bids...')
    await placeBidsExample(auctionResult.auctionPda)
    
    console.log('')
    console.log('Step 3: Getting analytics...')
    await auctionAnalyticsExample(auctionResult.auctionPda)
    
    console.log('')
    console.log('Step 4: Starting monitoring (for 10 seconds)...')
    const stopMonitoring = await monitorAuctionExample(auctionResult.auctionPda)
    
    // Stop monitoring after 10 seconds
    setTimeout(async () => {
      stopMonitoring()
      
      console.log('')
      console.log('Step 5: Finalizing auction...')
      // Note: In real scenarios, you'd wait for the auction to actually end
      // For demo purposes, we'll skip finalization since auction hasn't ended
      console.log('⏳ Skipping finalization - auction still active')
      
      console.log('')
      console.log('🎉 COMPLETE WORKFLOW DEMONSTRATION FINISHED!')
      console.log('In production, you would:')
      console.log('  1. Wait for auction to end naturally')
      console.log('  2. Call finalizeAuction() after end time')
      console.log('  3. Create work order for winner')
      console.log('  4. Process payment and delivery')
      
    }, 10000)

  } catch (error) {
    console.error('❌ Workflow failed:', error)
    throw error
  }
}

/**
 * Run examples
 * 
 * Uncomment the examples you want to run:
 */

// Single examples:
// createEnglishAuctionExample().catch(console.error)
// placeBidsExample('your-auction-pda-here').catch(console.error)
// monitorAuctionExample('your-auction-pda-here').catch(console.error)
// auctionAnalyticsExample('your-auction-pda-here').catch(console.error)

// Complete workflow:
// completeAuctionWorkflowExample().catch(console.error)

export {
  createEnglishAuctionExample,
  placeBidsExample,
  monitorAuctionExample,
  auctionAnalyticsExample,
  finalizeAuctionExample,
  completeAuctionWorkflowExample
}