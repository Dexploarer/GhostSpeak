/**
 * Dispute Resolution Example
 * 
 * Shows how to handle disputes, submit evidence, and resolve conflicts
 */

import GhostSpeak, { sol, type GhostSpeak as GS } from '@ghostspeak/sdk'
import { Keypair } from '@solana/kit'
import type { Address } from '@solana/addresses'

async function main() {
  console.log('⚖️ Dispute Resolution Example')
  console.log('══════════════════════════════')

  const ghostspeak = new GhostSpeak().enableDevMode()
  
  // Create test keypairs
  const buyer = await Keypair.generate()
  const seller = await Keypair.generate()
  const arbitrator = await Keypair.generate()
  
  console.log('👥 Test Participants:')
  console.log(`   Buyer: ${buyer.address}`)
  console.log(`   Seller: ${seller.address}`)
  console.log(`   Arbitrator: ${arbitrator.address}`)

  // 1. Create Escrow with Arbitrator
  console.log('\n📤 Creating escrow with arbitrator...')
  
  try {
    const escrow = await ghostspeak
      .escrow()
      .between(buyer.address, seller.address)
      .amount(sol(25))
      .description("Logo design project")
      .withArbitrator(arbitrator.address)
      .arbitrationFee(sol(1)) // 1 SOL fee for arbitration
      .expiresIn(14 * 24 * 60 * 60) // 14 days
      .debug()
      .execute()

    console.log('✅ Escrow with arbitrator created!')
    console.log(`   Address: ${escrow.address}`)
    console.log(`   Transaction: ${escrow.signature}`)
    
    const escrowModule = ghostspeak.escrow()
    
    // 2. Fund the escrow
    console.log('\n💳 Buyer funding escrow...')
    
    const fundTx = await escrowModule.fund(buyer, {
      escrowAddress: escrow.address,
      amount: sol(25)
    })
    
    console.log('✅ Escrow funded')
    console.log(`   Transaction: ${fundTx}`)

    // 3. Seller completes work
    console.log('\n✅ Seller completing work...')
    
    const completeTx = await escrowModule.complete(seller, {
      escrowAddress: escrow.address
    })
    
    console.log('✅ Work marked as complete by seller')
    console.log(`   Transaction: ${completeTx}`)

    // 4. Buyer disputes the work
    console.log('\n⚖️ Buyer filing dispute...')
    
    const disputeTx = await escrowModule.dispute(buyer, {
      escrowAddress: escrow.address,
      reason: "The logo design does not match the agreed specifications. Colors are wrong and style is completely different from the brief."
    })
    
    console.log('⚖️ Dispute filed successfully')
    console.log(`   Transaction: ${disputeTx}`)
    
    // Check escrow status after dispute
    const disputedData = await escrowModule.getAccount(escrow.address)
    if (disputedData) {
      console.log(`   Status changed to: ${disputedData.status}`)
      console.log(`   Dispute reason: ${disputedData.disputeReason}`)
    }

    // 5. Submit Evidence (Buyer)
    console.log('\n📋 Buyer submitting evidence...')
    
    const buyerEvidence = {
      type: 'documentation',
      description: 'Original project brief and comparison images',
      files: [
        'https://ipfs.io/ipfs/QmBuyerBrief123',
        'https://ipfs.io/ipfs/QmComparisonImages456'
      ],
      statement: "The delivered logo fails to meet the specifications outlined in our original brief. Attached are the original requirements and side-by-side comparisons showing the discrepancies."
    }
    
    const buyerEvidenceTx = await escrowModule.submitEvidence(buyer, {
      escrowAddress: escrow.address,
      evidence: JSON.stringify(buyerEvidence)
    })
    
    console.log('✅ Buyer evidence submitted')
    console.log(`   Transaction: ${buyerEvidenceTx}`)

    // 6. Submit Evidence (Seller)
    console.log('\n📋 Seller submitting counter-evidence...')
    
    const sellerEvidence = {
      type: 'documentation',
      description: 'Work process documentation and client communications',
      files: [
        'https://ipfs.io/ipfs/QmSellerWork789',
        'https://ipfs.io/ipfs/QmCommunications012'
      ],
      statement: "The logo was created according to the brief as I understood it. Attached are my design process notes and our previous communications where the client approved the initial concept."
    }
    
    const sellerEvidenceTx = await escrowModule.submitEvidence(seller, {
      escrowAddress: escrow.address,
      evidence: JSON.stringify(sellerEvidence)
    })
    
    console.log('✅ Seller evidence submitted')
    console.log(`   Transaction: ${sellerEvidenceTx}`)

    // 7. Arbitrator Reviews and Resolves
    console.log('\n⚖️ Arbitrator reviewing dispute...')
    
    // Simulate arbitrator review time
    console.log('   📖 Arbitrator reviewing evidence...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Arbitrator decides: 70% to seller, 30% refund to buyer
    const resolutionTx = await escrowModule.resolveDispute(arbitrator, {
      escrowAddress: escrow.address,
      buyerAmount: sol(7.5), // 30% refund
      sellerAmount: sol(16.5), // 70% payment minus arbitration fee
      resolution: "The work partially meets the specifications. While there are some discrepancies from the brief, the seller delivered a professional logo. Awarding 70% to seller, 30% refund to buyer."
    })
    
    console.log('⚖️ Dispute resolved by arbitrator')
    console.log(`   Transaction: ${resolutionTx}`)
    console.log('   💰 Resolution: 70% to seller, 30% refund to buyer')

    // 8. Check final escrow state
    console.log('\n📊 Final escrow status...')
    
    const finalData = await escrowModule.getAccount(escrow.address)
    if (finalData) {
      console.log('📋 Final State:')
      console.log(`   Status: ${finalData.status}`)
      console.log(`   Resolution: ${finalData.disputeResolution}`)
      console.log(`   Resolved At: ${finalData.resolvedAt}`)
    }

  } catch (error) {
    handleError(error)
  }

  // 9. Demonstrate Auto-Resolution for Timeout
  console.log('\n⏰ Demonstrating timeout resolution...')
  
  try {
    const timeoutEscrow = await ghostspeak
      .escrow()
      .between(buyer.address, seller.address)
      .amount(sol(10))
      .description("Timeout demo")
      .expiresIn(1) // 1 second for demo
      .execute()

    console.log('✅ Demo escrow created with 1-second timeout')
    
    // Fund it
    await escrowModule.fund(buyer, {
      escrowAddress: timeoutEscrow.address,
      amount: sol(10)
    })
    
    // Wait for timeout
    console.log('   ⏳ Waiting for timeout...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Try to claim refund after timeout
    const refundTx = await escrowModule.claimRefund(buyer, {
      escrowAddress: timeoutEscrow.address
    })
    
    console.log('✅ Automatic refund claimed after timeout')
    console.log(`   Transaction: ${refundTx}`)
    
  } catch (error) {
    console.error('❌ Timeout demo failed:', error.message)
  }

  // 10. Best Practices for Disputes
  console.log('\n💡 Dispute Resolution Best Practices:')
  console.log('   ✅ Set clear project specifications upfront')
  console.log('   ✅ Choose reputable arbitrators with relevant expertise')
  console.log('   ✅ Document all communications and deliverables')
  console.log('   ✅ Submit comprehensive evidence with timestamps')
  console.log('   ✅ Be professional and factual in dispute descriptions')
  console.log('   ✅ Consider mediation before formal arbitration')

  // 11. Query Dispute Statistics
  console.log('\n📊 Dispute statistics...')
  
  const disputeStats = await ghostspeak.escrow().getDisputeStats()
  console.log(`   Total disputes filed: ${disputeStats.totalDisputes}`)
  console.log(`   Resolved disputes: ${disputeStats.resolvedDisputes}`)
  console.log(`   Average resolution time: ${disputeStats.averageResolutionTime} hours`)
  console.log(`   Buyer success rate: ${(disputeStats.buyerWinRate * 100).toFixed(1)}%`)

  console.log('\n✨ Dispute resolution example complete!')
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