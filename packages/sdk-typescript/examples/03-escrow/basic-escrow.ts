/**
 * Basic Escrow Example
 * 
 * Shows how to create, complete, and cancel simple escrows
 */

import GhostSpeak, { sol, type GhostSpeak as GS } from '@ghostspeak/sdk'
import { Keypair } from '@solana/kit'
import type { Address } from '@solana/addresses'

async function main() {
  console.log('💰 Basic Escrow Management Example')
  console.log('═════════════════════════════════════')

  const ghostspeak = new GhostSpeak().enableDevMode()
  
  // Create test keypairs
  const buyer = await Keypair.generate()
  const seller = await Keypair.generate()
  
  console.log('👥 Test Participants:')
  console.log(`   Buyer: ${buyer.address}`)
  console.log(`   Seller: ${seller.address}`)

  // 1. Create a Basic Escrow
  console.log('\n📤 Creating basic escrow...')
  
  const escrowCost = await ghostspeak
    .escrow()
    .between(buyer.address, seller.address)
    .amount(sol(10))
    .description("Website development project")
    .getCost()
  
  console.log(`💰 Escrow creation cost: ${(Number(escrowCost) / 1e9).toFixed(6)} SOL`)
  
  try {
    const escrow = await ghostspeak
      .escrow()
      .between(buyer.address, seller.address)
      .amount(sol(10))
      .description("Website development project")
      .expiresIn(7 * 24 * 60 * 60) // 7 days
      .debug()
      .execute()

    console.log('✅ Escrow created successfully!')
    console.log(`   Address: ${escrow.address}`)
    console.log(`   Transaction: ${escrow.signature}`)
    console.log(`   Explorer: ${escrow.explorer}`)
    
    // 2. Query Escrow Status
    console.log('\n📊 Checking escrow status...')
    
    const escrowModule = ghostspeak.escrow()
    const escrowData = await escrowModule.getAccount(escrow.address)
    
    if (escrowData) {
      console.log('📋 Escrow Details:')
      console.log(`   Status: ${escrowData.status}`)
      console.log(`   Amount: ${Number(escrowData.amount) / 1e9} SOL`)
      console.log(`   Buyer: ${escrowData.buyer}`)
      console.log(`   Seller: ${escrowData.seller}`)
      console.log(`   Created: ${escrowData.createdAt}`)
      console.log(`   Expires: ${escrowData.expiresAt}`)
    }

    // 3. Add funds to escrow (buyer)
    console.log('\n💳 Buyer funding escrow...')
    
    try {
      const fundTx = await escrowModule.fund(buyer, {
        escrowAddress: escrow.address,
        amount: sol(10)
      })
      
      console.log('✅ Escrow funded successfully')
      console.log(`   Transaction: ${fundTx}`)
      
    } catch (error) {
      console.error('❌ Failed to fund escrow:', error.message)
    }

    // 4. Complete the work (seller marks as complete)
    console.log('\n✅ Seller completing work...')
    
    try {
      const completeTx = await escrowModule.complete(seller, {
        escrowAddress: escrow.address
      })
      
      console.log('✅ Work marked as complete')
      console.log(`   Transaction: ${completeTx}`)
      
    } catch (error) {
      console.error('❌ Failed to complete work:', error.message)
    }

    // 5. Release funds (buyer approves completion)
    console.log('\n💸 Buyer releasing funds...')
    
    try {
      const releaseTx = await escrowModule.release(buyer, {
        escrowAddress: escrow.address
      })
      
      console.log('✅ Funds released to seller')
      console.log(`   Transaction: ${releaseTx}`)
      
    } catch (error) {
      console.error('❌ Failed to release funds:', error.message)
    }

    // 6. Query updated status
    console.log('\n📊 Final escrow status...')
    
    const finalData = await escrowModule.getAccount(escrow.address)
    if (finalData) {
      console.log(`   Final Status: ${finalData.status}`)
      console.log(`   Completed At: ${finalData.completedAt}`)
    }

  } catch (error) {
    handleError(error)
  }

  // 7. Demonstrate Escrow Cancellation
  console.log('\n🔄 Demonstrating escrow cancellation...')
  
  try {
    const cancelEscrow = await ghostspeak
      .escrow()
      .between(buyer.address, seller.address)
      .amount(sol(5))
      .description("Test cancellation")
      .execute()

    console.log('✅ Test escrow created for cancellation demo')
    
    // Cancel the escrow
    const cancelTx = await ghostspeak.escrow().cancel(buyer, {
      escrowAddress: cancelEscrow.address
    })
    
    console.log('✅ Escrow cancelled successfully')
    console.log(`   Transaction: ${cancelTx}`)
    
  } catch (error) {
    console.error('❌ Cancellation demo failed:', error.message)
  }

  // 8. Query User's Escrows
  console.log('\n📋 Querying buyer\'s escrows...')
  
  const buyerEscrows = await ghostspeak.escrow().getUserEscrows(buyer.address, 'buyer')
  console.log(`Found ${buyerEscrows.length} escrows as buyer`)
  
  const sellerEscrows = await ghostspeak.escrow().getUserEscrows(seller.address, 'seller')
  console.log(`Found ${sellerEscrows.length} escrows as seller`)

  // 9. Query Active Escrows
  console.log('\n🔍 Querying active escrows...')
  
  const activeEscrows = await ghostspeak.escrow().getActiveEscrows()
  console.log(`Found ${activeEscrows.length} active escrows in the system`)

  console.log('\n✨ Basic escrow management complete!')
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