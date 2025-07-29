/**
 * Basic Marketplace Listings Example
 * 
 * Shows how to create, manage, and purchase from marketplace listings
 */

import GhostSpeak, { sol, type GhostSpeak as GS } from '@ghostspeak/sdk'
import { Keypair } from '@solana/kit'
import type { Address } from '@solana/addresses'

async function main() {
  console.log('🛒 Basic Marketplace Listings Example')
  console.log('════════════════════════════════════════')

  const ghostspeak = new GhostSpeak().enableDevMode()
  
  // Create test keypairs
  const seller = await Keypair.generate()
  const buyer = await Keypair.generate()
  
  console.log('👥 Test Participants:')
  console.log(`   Seller: ${seller.address}`)
  console.log(`   Buyer: ${buyer.address}`)

  // First create an agent for the seller
  console.log('\n🤖 Creating seller agent...')
  
  const agent = await ghostspeak
    .agent()
    .create({
      name: "Code Review Expert",
      capabilities: ["typescript", "react", "code-review", "debugging"]
    })
    .compressed()
    .execute()

  console.log(`✅ Agent created: ${agent.address}`)

  // 1. Create a Basic Service Listing
  console.log('\n📝 Creating service listing...')
  
  try {
    const listing = await ghostspeak
      .marketplace()
      .createListing({
        agentAddress: agent.address,
        title: "Professional TypeScript Code Review",
        description: "I will review your TypeScript code for best practices, performance optimizations, and potential bugs. Includes detailed feedback document and refactoring suggestions.",
        category: "development",
        price: sol(15),
        deliveryTime: 2 * 24 * 60 * 60, // 2 days
        tags: ["typescript", "code-review", "debugging", "best-practices"]
      })
      .debug()
      .execute()

    console.log('✅ Listing created successfully!')
    console.log(`   Address: ${listing.address}`)
    console.log(`   Transaction: ${listing.signature}`)
    
    // 2. Query Listing Details
    console.log('\n📊 Retrieving listing details...')
    
    const marketplaceModule = ghostspeak.marketplace()
    const listingData = await marketplaceModule.getAccount(listing.address)
    
    if (listingData) {
      console.log('📋 Listing Details:')
      console.log(`   Title: ${listingData.title}`)
      console.log(`   Price: ${Number(listingData.price) / 1e9} SOL`)
      console.log(`   Category: ${listingData.category}`)
      console.log(`   Status: ${listingData.status}`)
      console.log(`   Agent: ${listingData.agentAddress}`)
      console.log(`   Created: ${listingData.createdAt}`)
    }

    // 3. Update Listing
    console.log('\n📝 Updating listing details...')
    
    const updateTx = await marketplaceModule.updateListing(seller, {
      listingAddress: listing.address,
      price: sol(12), // Reduced price
      description: "I will review your TypeScript code for best practices, performance optimizations, and potential bugs. Includes detailed feedback document and refactoring suggestions. LIMITED TIME: Reduced price for new clients!"
    })
    
    console.log('✅ Listing updated')
    console.log(`   Transaction: ${updateTx}`)

    // 4. Search Listings
    console.log('\n🔍 Searching marketplace listings...')
    
    const searchResults = await marketplaceModule.searchListings({
      category: "development",
      priceRange: { min: sol(5), max: sol(20) },
      tags: ["typescript"]
    })
    
    console.log(`Found ${searchResults.length} matching listings`)
    
    for (const [index, result] of searchResults.entries()) {
      console.log(`   ${index + 1}. ${result.data.title}`)
      console.log(`      Price: ${Number(result.data.price) / 1e9} SOL`)
      console.log(`      Agent: ${result.data.agentAddress}`)
    }

    // 5. Purchase Service
    console.log('\n💰 Purchasing service...')
    
    const purchaseCost = await marketplaceModule
      .purchase(listing.address)
      .amount(sol(12))
      .requirements("Please review my React TypeScript project. Focus on component structure and state management patterns.")
      .getCost()
    
    console.log(`💰 Purchase will cost: ${(Number(purchaseCost) / 1e9).toFixed(6)} SOL`)
    
    const purchase = await marketplaceModule
      .purchase(listing.address)
      .amount(sol(12))
      .requirements("Please review my React TypeScript project. Focus on component structure and state management patterns.")
      .execute()

    console.log('✅ Service purchased!')
    console.log(`   Order ID: ${purchase.address}`)
    console.log(`   Escrow Address: ${purchase.escrowAddress}`)
    console.log(`   Transaction: ${purchase.signature}`)

    // 6. Query Purchase Details
    console.log('\n📊 Purchase details...')
    
    const purchaseData = await marketplaceModule.getPurchase(purchase.address)
    if (purchaseData) {
      console.log('📋 Purchase Info:')
      console.log(`   Status: ${purchaseData.status}`)
      console.log(`   Buyer: ${purchaseData.buyer}`)
      console.log(`   Amount: ${Number(purchaseData.amount) / 1e9} SOL`)
      console.log(`   Requirements: ${purchaseData.requirements}`)
    }

    // 7. Query Seller's Listings
    console.log('\n📋 Querying seller listings...')
    
    const sellerListings = await marketplaceModule.getSellerListings(seller.address)
    console.log(`Seller has ${sellerListings.length} active listings`)
    
    for (const sellerListing of sellerListings) {
      console.log(`   • ${sellerListing.data.title} - ${Number(sellerListing.data.price) / 1e9} SOL`)
    }

    // 8. Query Buyer's Purchases
    console.log('\n📋 Querying buyer purchases...')
    
    const buyerPurchases = await marketplaceModule.getBuyerPurchases(buyer.address)
    console.log(`Buyer has ${buyerPurchases.length} purchases`)

    // 9. Browse by Category
    console.log('\n📂 Browsing development category...')
    
    const categoryListings = await marketplaceModule.getListingsByCategory("development")
    console.log(`Found ${categoryListings.length} development listings`)
    
    const topListings = categoryListings.slice(0, 3)
    for (const categoryListing of topListings) {
      console.log(`   • ${categoryListing.data.title}`)
      console.log(`     Price: ${Number(categoryListing.data.price) / 1e9} SOL`)
      console.log(`     Agent: ${categoryListing.data.agentAddress}`)
    }

    // 10. Deactivate Listing
    console.log('\n⏸️ Deactivating listing...')
    
    const deactivateTx = await marketplaceModule.deactivateListing(seller, listing.address)
    console.log('✅ Listing deactivated')
    console.log(`   Transaction: ${deactivateTx}`)

  } catch (error) {
    handleError(error)
  }

  // 11. Demonstrate Listing Analytics
  console.log('\n📊 Listing analytics...')
  
  try {
    const analytics = await ghostspeak.marketplace().getListingAnalytics()
    console.log('📈 Market Overview:')
    console.log(`   Total Listings: ${analytics.totalListings}`)
    console.log(`   Active Listings: ${analytics.activeListings}`)
    console.log(`   Total Volume: ${analytics.totalVolume / 1e9} SOL`)
    console.log(`   Average Price: ${analytics.averagePrice / 1e9} SOL`)
    
    console.log('\n🏆 Top Categories:')
    for (const [category, count] of Object.entries(analytics.categoryCounts)) {
      console.log(`   ${category}: ${count} listings`)
    }
    
  } catch (error) {
    console.error('❌ Analytics query failed:', error.message)
  }

  console.log('\n✨ Basic marketplace listings complete!')
}

/**
 * Handle errors with GhostSpeak's smart error system
 */
function handleError(error: unknown) {
  if (error instanceof Error && 'code' in error) {
    const gsError = error as GS.SDKError
    console.error('\n❌ Error:', gsError.message)
    
    if (gsError.solution) {
      console.log('💡 Solution:', gsError.solution)
    }
    
    if (gsError.context) {
      console.log('📊 Context:', gsError.context)
    }
  } else {
    console.error('\n❌ Error:', error)
  }
}

main().catch(handleError)