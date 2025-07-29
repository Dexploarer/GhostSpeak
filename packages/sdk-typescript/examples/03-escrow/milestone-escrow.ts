/**
 * Milestone Escrow Example
 * 
 * Shows how to create escrows with payment milestones and progressive release
 */

import GhostSpeak, { sol, type GhostSpeak as GS } from '@ghostspeak/sdk'
import { Keypair } from '@solana/kit'
import type { Address } from '@solana/addresses'

async function main() {
  console.log('🎯 Milestone Escrow Management Example')
  console.log('════════════════════════════════════════')

  const ghostspeak = new GhostSpeak().enableDevMode()
  
  // Create test keypairs
  const buyer = await Keypair.generate()
  const seller = await Keypair.generate()
  
  console.log('👥 Test Participants:')
  console.log(`   Buyer: ${buyer.address}`)
  console.log(`   Seller: ${seller.address}`)

  // 1. Create Milestone Escrow
  console.log('\n📤 Creating milestone escrow...')
  
  const milestones: GS.Milestone[] = [
    {
      amount: sol(20),
      description: "Project setup and initial mockups",
      completed: false
    },
    {
      amount: sol(30),
      description: "Frontend development and basic functionality",
      completed: false
    },
    {
      amount: sol(25),
      description: "Backend API and database integration",
      completed: false
    },
    {
      amount: sol(25),
      description: "Testing, deployment, and documentation",
      completed: false
    }
  ]
  
  const totalAmount = milestones.reduce((sum, m) => sum + Number(m.amount), 0)
  console.log(`💰 Total project value: ${totalAmount / 1e9} SOL across ${milestones.length} milestones`)
  
  try {
    const escrow = await ghostspeak
      .escrow()
      .between(buyer.address, seller.address)
      .amount(BigInt(totalAmount))
      .description("Full-stack web application development")
      .withMilestones(milestones)
      .expiresIn(30 * 24 * 60 * 60) // 30 days
      .debug()
      .execute()

    console.log('✅ Milestone escrow created successfully!')
    console.log(`   Address: ${escrow.address}`)
    console.log(`   Transaction: ${escrow.signature}`)
    
    // 2. Fund the escrow
    console.log('\n💳 Buyer funding milestone escrow...')
    
    const escrowModule = ghostspeak.escrow()
    const fundTx = await escrowModule.fund(buyer, {
      escrowAddress: escrow.address,
      amount: BigInt(totalAmount)
    })
    
    console.log('✅ Escrow fully funded')
    console.log(`   Transaction: ${fundTx}`)

    // 3. Complete milestones progressively
    console.log('\n🎯 Processing milestones...')
    
    for (let i = 0; i < milestones.length; i++) {
      const milestone = milestones[i]
      console.log(`\n📝 Milestone ${i + 1}: ${milestone.description}`)
      console.log(`   Amount: ${Number(milestone.amount) / 1e9} SOL`)
      
      // Seller completes milestone
      try {
        const completeTx = await escrowModule.completeMilestone(seller, {
          escrowAddress: escrow.address,
          milestoneIndex: i
        })
        
        console.log('   ✅ Milestone marked complete by seller')
        console.log(`   Transaction: ${completeTx}`)
        
        // Buyer releases milestone payment
        const releaseTx = await escrowModule.releaseMilestone(buyer, {
          escrowAddress: escrow.address,
          milestoneIndex: i
        })
        
        console.log('   💸 Payment released by buyer')
        console.log(`   Transaction: ${releaseTx}`)
        
        // Query updated escrow state
        const escrowData = await escrowModule.getAccount(escrow.address)
        if (escrowData && escrowData.milestones) {
          const completedCount = escrowData.milestones.filter(m => m.completed).length
          const remainingAmount = escrowData.milestones
            .filter(m => !m.completed)
            .reduce((sum, m) => sum + Number(m.amount), 0)
          
          console.log(`   📊 Progress: ${completedCount}/${milestones.length} milestones complete`)
          console.log(`   💰 Remaining: ${remainingAmount / 1e9} SOL`)
        }
        
        // Simulate some work time
        console.log('   ⏳ Simulating work time...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`   ❌ Failed to process milestone ${i + 1}:`, error.message)
        break
      }
    }

    // 4. Query final escrow state
    console.log('\n📊 Final escrow status...')
    
    const finalData = await escrowModule.getAccount(escrow.address)
    if (finalData) {
      console.log('📋 Final Escrow State:')
      console.log(`   Status: ${finalData.status}`)
      console.log(`   Milestones completed: ${finalData.milestones?.filter(m => m.completed).length || 0}/${milestones.length}`)
      console.log(`   Total paid out: ${(totalAmount - Number(finalData.amount)) / 1e9} SOL`)
      console.log(`   Remaining: ${Number(finalData.amount) / 1e9} SOL`)
    }

  } catch (error) {
    handleError(error)
  }

  // 5. Demonstrate Milestone Dispute
  console.log('\n⚖️ Demonstrating milestone dispute...')
  
  try {
    const disputeEscrow = await ghostspeak
      .escrow()
      .between(buyer.address, seller.address)
      .amount(sol(50))
      .description("Dispute demo project")
      .withMilestones([
        { amount: sol(25), description: "Phase 1", completed: false },
        { amount: sol(25), description: "Phase 2", completed: false }
      ])
      .execute()

    console.log('✅ Demo escrow created for dispute')
    
    // Fund it
    await escrowModule.fund(buyer, {
      escrowAddress: disputeEscrow.address,
      amount: sol(50)
    })
    
    // Seller completes milestone but buyer disputes
    await escrowModule.completeMilestone(seller, {
      escrowAddress: disputeEscrow.address,
      milestoneIndex: 0
    })
    
    // Buyer files dispute instead of releasing payment
    const disputeTx = await escrowModule.dispute(buyer, {
      escrowAddress: disputeEscrow.address,
      reason: "Work does not meet specifications outlined in milestone 1"
    })
    
    console.log('⚖️ Dispute filed for milestone payment')
    console.log(`   Transaction: ${disputeTx}`)
    
  } catch (error) {
    console.error('❌ Dispute demo failed:', error.message)
  }

  // 6. Best Practices Demo
  console.log('\n💡 Milestone Best Practices:')
  console.log('   ✅ Break large projects into 4-8 milestones')
  console.log('   ✅ Front-load smaller milestones to reduce seller risk')
  console.log('   ✅ Include clear deliverable descriptions')
  console.log('   ✅ Set reasonable milestone amounts (10-40% each)')
  console.log('   ✅ Plan for disputes with detailed evidence requirements')

  console.log('\n✨ Milestone escrow management complete!')
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