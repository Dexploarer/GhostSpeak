/**
 * Real Escrow Workflow Integration Test
 * 
 * Tests complete escrow lifecycle on actual Solana devnet:
 * 1. Escrow creation with funding
 * 2. Work delivery submission
 * 3. Escrow completion and payment release
 * 4. Dispute handling scenarios
 * 5. Partial refunds and milestone payments
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { TransactionSigner } from '@solana/web3.js'
import type { Address } from '@solana/addresses'

import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  type BlockchainTestEnvironment,
  type TestDataGenerator,
  type BlockchainAssertions,
  TEST_CONFIG
} from './setup/blockchain-setup'
import { 
  deriveEscrowPDA, 
  deriveWorkOrderPda, 
  deriveWorkDeliveryPda 
} from '../../src/utils/pda'
import { 
  fetchEscrowAccount, 
  fetchWorkOrder, 
  fetchWorkDelivery 
} from '../../src/generated/accounts'

describe('Real Escrow Workflow Integration', () => {
  let env: BlockchainTestEnvironment
  let dataGen: TestDataGenerator
  let assert: BlockchainAssertions
  let buyer: TransactionSigner
  let seller: TransactionSigner
  let escrow: Address
  let workOrder: Address
  let workDelivery: Address

  beforeAll(async () => {
    // Setup real blockchain test environment
    const setup = await setupIntegrationTest()
    env = setup.env
    dataGen = setup.dataGen
    assert = setup.assert

    // Create funded test accounts
    buyer = await env.createFundedSigner()
    seller = await env.createFundedSigner()
    
    console.log(`🧪 Testing with buyer: ${buyer.address}`)
    console.log(`🧪 Testing with seller: ${seller.address}`)
  }, TEST_CONFIG.TRANSACTION_TIMEOUT)

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  describe('Escrow Creation and Funding', () => {
    it('should create and fund an escrow on devnet', async () => {
      const escrowAmount = 10_000_000n // 0.01 SOL
      const escrowData = {
        buyer: buyer.address,
        seller: seller.address,
        amount: escrowAmount,
        description: 'Integration test escrow - development work',
        deliveryTime: 7200, // 2 hours
        requiresApproval: true
      }
      
      console.log(`💰 Creating escrow with ${escrowAmount} lamports`)
      
      // Create escrow using real blockchain
      const result = await env.client.createEscrow({
        buyer: buyer.address,
        signer: buyer,
        ...escrowData
      })

      // Verify transaction was successful
      await assert.assertTransactionSuccess(result.signature)
      
      // Derive expected escrow PDA
      const orderId = BigInt(Date.now()) // Simple order ID for testing
      const [expectedEscrow] = deriveEscrowPDA(buyer.address, seller.address, orderId)
      escrow = expectedEscrow
      
      console.log(`✅ Escrow created at: ${escrow}`)
      
      // Wait for escrow account to be created on blockchain
      await env.waitForAccount(escrow)
      
      // Verify escrow account exists and has correct data
      await assert.assertAccountExists(escrow)
      
      // Fetch and validate escrow data from blockchain
      const escrowAccount = await fetchEscrowAccount(env.rpc, escrow)
      expect(escrowAccount).toBeDefined()
      expect(escrowAccount.data.buyer).toBe(buyer.address)
      expect(escrowAccount.data.seller).toBe(seller.address)
      expect(escrowAccount.data.amount).toBe(escrowAmount)
      expect(escrowAccount.data.status).toBe('funded') // Should be funded after creation
      
      console.log(`📊 Escrow verified on blockchain:`, {
        buyer: escrowAccount.data.buyer,
        seller: escrowAccount.data.seller,
        amount: escrowAccount.data.amount,
        status: escrowAccount.data.status
      })
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)

    it('should create associated work order', async () => {
      const workOrderData = {
        employer: buyer.address,
        agent: seller.address,
        description: 'Integration test work order',
        requirements: ['Complete API integration', 'Write documentation'],
        deadline: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
        compensation: 10_000_000n
      }
      
      console.log(`📋 Creating work order`)
      
      // Create work order
      const result = await env.client.createWorkOrder({
        employer: buyer.address,
        signer: buyer,
        ...workOrderData
      })

      await assert.assertTransactionSuccess(result.signature)
      
      // Derive work order PDA
      const orderId = BigInt(Date.now())
      const [expectedWorkOrder] = deriveWorkOrderPda(buyer.address, orderId)
      workOrder = expectedWorkOrder
      
      // Wait for work order creation
      await env.waitForAccount(workOrder)
      
      // Verify work order data
      const workOrderAccount = await fetchWorkOrder(env.rpc, workOrder)
      expect(workOrderAccount.data.employer).toBe(buyer.address)
      expect(workOrderAccount.data.agent).toBe(seller.address)
      expect(workOrderAccount.data.status).toBe('active')
      
      console.log(`✅ Work order created and verified`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })

  describe('Work Delivery and Completion', () => {
    it('should submit work delivery', async () => {
      const deliveryData = {
        workOrder,
        agent: seller.address,
        deliverables: ['API integration completed', 'Documentation provided'],
        notes: 'Work completed as requested',
        attachments: ['https://github.com/example/repo', 'https://docs.example.com']
      }
      
      console.log(`📦 Submitting work delivery`)
      
      // Submit work delivery
      const result = await env.client.submitWorkDelivery({
        agent: seller.address,
        signer: seller,
        ...deliveryData
      })

      await assert.assertTransactionSuccess(result.signature)
      
      // Derive work delivery PDA
      const [expectedDelivery] = deriveWorkDeliveryPda(workOrder, seller.address)
      workDelivery = expectedDelivery
      
      // Wait for delivery account creation
      await env.waitForAccount(workDelivery)
      
      // Verify delivery data
      const deliveryAccount = await fetchWorkDelivery(env.rpc, workDelivery)
      expect(deliveryAccount.data.workOrder).toBe(workOrder)
      expect(deliveryAccount.data.agent).toBe(seller.address)
      expect(deliveryAccount.data.status).toBe('submitted')
      
      console.log(`✅ Work delivery submitted and verified`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)

    it('should complete escrow and release payment', async () => {
      console.log(`✅ Completing escrow and releasing payment`)
      
      // Get initial balances
      const initialSellerBalance = await env.rpc.getBalance(seller.address).send()
      
      // Complete escrow (buyer approves and releases payment)
      const result = await env.client.completeEscrow({
        buyer: buyer.address,
        signer: buyer,
        escrow,
        workDelivery
      })

      await assert.assertTransactionSuccess(result.signature)
      
      // Small delay for balance update
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Verify escrow status updated
      const completedEscrow = await fetchEscrowAccount(env.rpc, escrow)
      expect(completedEscrow.data.status).toBe('completed')
      
      // Verify payment was released to seller
      const finalSellerBalance = await env.rpc.getBalance(seller.address).send()
      expect(finalSellerBalance).toBeGreaterThan(initialSellerBalance)
      
      console.log(`💸 Payment released - seller balance increased by: ${finalSellerBalance - initialSellerBalance} lamports`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })

  describe('Dispute Handling', () => {
    it('should handle escrow dispute scenario', async () => {
      // Create a new escrow for dispute testing
      const buyer2 = await env.createFundedSigner()
      const seller2 = await env.createFundedSigner()
      
      const disputeEscrowData = {
        buyer: buyer2.address,
        seller: seller2.address,
        amount: 5_000_000n, // 0.005 SOL
        description: 'Dispute test escrow',
        deliveryTime: 3600,
        requiresApproval: true
      }
      
      console.log(`⚖️ Creating escrow for dispute testing`)
      
      // Create escrow
      const createResult = await env.client.createEscrow({
        buyer: buyer2.address,
        signer: buyer2,
        ...disputeEscrowData
      })

      await assert.assertTransactionSuccess(createResult.signature)
      
      // Derive dispute escrow PDA
      const orderId2 = BigInt(Date.now() + 1000)
      const [disputeEscrow] = deriveEscrowPDA(buyer2.address, seller2.address, orderId2)
      
      await env.waitForAccount(disputeEscrow)
      
      // Initiate dispute
      const disputeResult = await env.client.disputeEscrow({
        initiator: buyer2.address,
        signer: buyer2,
        escrow: disputeEscrow,
        reason: 'Work not delivered as specified',
        evidence: ['Screenshot of incomplete work', 'Communication logs']
      })

      await assert.assertTransactionSuccess(disputeResult.signature)
      
      // Verify dispute status
      const disputedEscrow = await fetchEscrowAccount(env.rpc, disputeEscrow)
      expect(disputedEscrow.data.status).toBe('disputed')
      
      console.log(`✅ Dispute successfully initiated`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })

  describe('Milestone-Based Escrow', () => {
    it('should handle milestone-based payments', async () => {
      const buyer3 = await env.createFundedSigner()
      const seller3 = await env.createFundedSigner()
      
      const milestoneEscrowData = {
        buyer: buyer3.address,
        seller: seller3.address,
        amount: 20_000_000n, // 0.02 SOL
        description: 'Milestone-based escrow test',
        milestones: [
          { description: 'Design phase', percentage: 30, amount: 6_000_000n },
          { description: 'Development phase', percentage: 50, amount: 10_000_000n },
          { description: 'Testing phase', percentage: 20, amount: 4_000_000n }
        ]
      }
      
      console.log(`🎯 Creating milestone-based escrow`)
      
      // Create milestone escrow
      const result = await env.client.createMilestoneEscrow({
        buyer: buyer3.address,
        signer: buyer3,
        ...milestoneEscrowData
      })

      await assert.assertTransactionSuccess(result.signature)
      
      // Derive milestone escrow PDA
      const orderId3 = BigInt(Date.now() + 2000)
      const [milestoneEscrow] = deriveEscrowPDA(buyer3.address, seller3.address, orderId3)
      
      await env.waitForAccount(milestoneEscrow)
      
      // Complete first milestone
      const milestoneResult = await env.client.completeMilestone({
        buyer: buyer3.address,
        signer: buyer3,
        escrow: milestoneEscrow,
        milestoneIndex: 0,
        deliverables: ['Design mockups completed', 'User flow diagrams']
      })

      await assert.assertTransactionSuccess(milestoneResult.signature)
      
      console.log(`✅ First milestone completed and paid`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })

  describe('Partial Refunds', () => {
    it('should process partial refund correctly', async () => {
      const buyer4 = await env.createFundedSigner()
      const seller4 = await env.createFundedSigner()
      
      // Create escrow for partial refund test
      const refundEscrowData = {
        buyer: buyer4.address,
        seller: seller4.address,
        amount: 15_000_000n, // 0.015 SOL
        description: 'Partial refund test escrow',
        deliveryTime: 3600,
        requiresApproval: true
      }
      
      console.log(`💰 Creating escrow for partial refund test`)
      
      const createResult = await env.client.createEscrow({
        buyer: buyer4.address,
        signer: buyer4,
        ...refundEscrowData
      })

      await assert.assertTransactionSuccess(createResult.signature)
      
      const orderId4 = BigInt(Date.now() + 3000)
      const [refundEscrow] = deriveEscrowPDA(buyer4.address, seller4.address, orderId4)
      
      await env.waitForAccount(refundEscrow)
      
      // Get initial buyer balance
      const initialBuyerBalance = await env.rpc.getBalance(buyer4.address).send()
      
      // Process partial refund (50%)
      const refundAmount = 7_500_000n // 50% of escrow
      const refundResult = await env.client.processPartialRefund({
        authority: buyer4.address, // Or could be arbitrator
        signer: buyer4,
        escrow: refundEscrow,
        refundAmount,
        reason: 'Partial completion of work'
      })

      await assert.assertTransactionSuccess(refundResult.signature)
      
      // Small delay for balance update
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Verify partial refund processed
      const finalBuyerBalance = await env.rpc.getBalance(buyer4.address).send()
      expect(finalBuyerBalance).toBeGreaterThan(initialBuyerBalance)
      
      console.log(`💸 Partial refund processed - buyer received: ${finalBuyerBalance - initialBuyerBalance} lamports`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })

  describe('Error Scenarios', () => {
    it('should reject unauthorized escrow operations', async () => {
      const unauthorized = await env.createFundedSigner()
      
      console.log(`🚫 Testing unauthorized escrow completion`)
      
      // Try to complete escrow with unauthorized signer
      await expect(
        env.client.completeEscrow({
          buyer: unauthorized.address,
          signer: unauthorized,
          escrow, // Use existing escrow
          workDelivery
        })
      ).rejects.toThrow()
      
      console.log(`✅ Unauthorized operation correctly rejected`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)

    it('should handle insufficient balance scenarios', async () => {
      // Create unfunded account
      const unfundedKeyPair = await env.env.createKeyPairSignerFromBytes((await env.env.generateKeyPair()).privateKey)
      const unfundedSigner = unfundedKeyPair
      
      const insufficientEscrowData = {
        buyer: unfundedSigner.address,
        seller: seller.address,
        amount: 100_000_000n, // 0.1 SOL - more than unfunded account has
        description: 'Insufficient balance test',
        deliveryTime: 3600,
        requiresApproval: true
      }
      
      console.log(`💸 Testing insufficient balance scenario`)
      
      // Try to create escrow with insufficient balance
      await expect(
        env.client.createEscrow({
          buyer: unfundedSigner.address,
          signer: unfundedSigner,
          ...insufficientEscrowData
        })
      ).rejects.toThrow()
      
      console.log(`✅ Insufficient balance correctly handled`)
    }, TEST_CONFIG.TRANSACTION_TIMEOUT)
  })
})