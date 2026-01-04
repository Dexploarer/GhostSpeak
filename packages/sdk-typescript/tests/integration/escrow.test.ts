/**
 * Integration tests for escrow operations
 * Tests the full lifecycle of escrow transactions including disputes and refunds
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { 
  Keypair,
  generateKeyPairSigner,
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction
} from '@solana/web3.js'
// Mock compute budget instruction since @solana-program/compute-budget is not installed
const getSetComputeUnitLimitInstruction = ({ units }: { units: number }) => ({
  programAddress: '11111111111111111111111111111111',
  accounts: [],
  data: new Uint8Array([0, units & 0xff, (units >> 8) & 0xff, (units >> 16) & 0xff, (units >> 24) & 0xff])
})
import type { Address, Rpc } from '@solana/web3.js'
import { GhostSpeakClient } from '../../src/client/GhostSpeakClient.js'
import { MarketplaceInstructions } from '../../src/client/instructions/MarketplaceInstructions.js'
import { EscrowInstructions } from '../../src/client/instructions/EscrowInstructions.js'
import { EscrowStatus } from '../../src/generated/index.js'
import { createMint, createAssociatedTokenAccount, mintTo } from '@solana/spl-token'
import type { TypedRpcClient } from '../../src/types/rpc-client-types.js'

describe('Escrow Integration Tests', () => {
  let rpc: Rpc<unknown>
  let typedRpc: TypedRpcClient
  let client: GhostSpeakClient
  let payer: Keypair
  let buyer: Keypair
  let seller: Keypair
  let arbitrator: Keypair
  let serviceListing: Address
  let escrow: Address
  let paymentMint: Address
  let buyerTokenAccount: Address
  let sellerTokenAccount: Address

  // Test configuration
  const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'http://localhost:8899'
  const PROGRAM_ID = process.env.PROGRAM_ID || 'GHOST1VYEzX9gPsJdDVMXQmL8aZAQoLZfxCMbKfYohcvy' as Address
  
  beforeAll(async () => {
    // Initialize RPC and client
    rpc = createSolanaRpc(RPC_ENDPOINT)
    typedRpc = rpc as TypedRpcClient
    
    // Generate test keypairs
    payer = await generateKeyPairSigner()
    buyer = await generateKeyPairSigner()
    seller = await generateKeyPairSigner()
    arbitrator = await generateKeyPairSigner()

    // Initialize client
    client = new GhostSpeakClient(
      typedRpc,
      PROGRAM_ID,
      payer
    )

    // Fund test accounts
    await fundAccount(rpc, payer.address, 10)
    await fundAccount(rpc, buyer.address, 5)
    await fundAccount(rpc, seller.address, 1)
    await fundAccount(rpc, arbitrator.address, 1)

    // Create test token mint
    paymentMint = await createTestToken(rpc, payer)
    
    // Create token accounts
    buyerTokenAccount = await createAssociatedTokenAccount(
      rpc,
      buyer,
      paymentMint,
      buyer.address
    )
    
    sellerTokenAccount = await createAssociatedTokenAccount(
      rpc,
      seller,
      paymentMint,
      seller.address
    )

    // Mint tokens to buyer
    await mintTo(
      rpc,
      payer,
      paymentMint,
      buyerTokenAccount,
      payer,
      1000000000n // 1000 tokens with 6 decimals
    )

    // Create a test service listing
    serviceListing = await createTestServiceListing(
      client,
      seller,
      paymentMint,
      100000000n // 100 tokens
    )
  })

  describe('Basic Escrow Flow', () => {
    it('should create escrow for service purchase', async () => {
      const amount = 100000000n // 100 tokens
      const duration = 7 * 24 * 60 * 60 // 7 days in seconds
      
      // Create escrow
      const createIx = await EscrowInstructions.createEscrow(
        client,
        {
          buyer: buyer.address,
          seller: seller.address,
          paymentMint,
          amount,
          duration,
          description: 'Test service escrow',
          autoRelease: false
        }
      )

      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(buyer.address, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstructions(
          [
            getSetComputeUnitLimitInstruction({ units: 300000 }),
            createIx
          ],
          tx
        )
      )

      const signedTx = await signTransactionMessageWithSigners(message)
      const signature = getSignatureFromTransaction(signedTx)
      
      await rpc.sendTransaction(signedTx, { skipPreflight: false })
      await confirmTransaction(rpc, signature)

      // Verify escrow was created
      escrow = createIx.accounts.escrow

      const escrowAccount = await client.fetchEscrow(escrow)
      expect(escrowAccount).toBeDefined()
      expect(escrowAccount.buyer).toBe(buyer.address)
      expect(escrowAccount.seller).toBe(seller.address)
      expect(escrowAccount.amount).toBe(amount)
      expect(escrowAccount.status).toBe(EscrowStatus.Active)
    })

    it('should process escrow payment', async () => {
      // Process payment from buyer's token account
      const processIx = await EscrowInstructions.processEscrowPayment(
        client,
        {
          escrow,
          buyer: buyer.address,
          sourceTokenAccount: buyerTokenAccount,
          remainingAccounts: []
        }
      )

      const { value: blockhash2 } = await rpc.getLatestBlockhash().send()
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(buyer.address, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(blockhash2, tx),
        tx => appendTransactionMessageInstructions(
          [
            getSetComputeUnitLimitInstruction({ units: 300000 }),
            processIx
          ],
          tx
        )
      )

      const signedTx = await signTransactionMessageWithSigners(message)
      const signature = getSignatureFromTransaction(signedTx)
      
      await rpc.sendTransaction(signedTx, { skipPreflight: false })
      await confirmTransaction(rpc, signature)

      // Verify payment was processed
      const escrowAccount = await client.fetchEscrow(escrow)
      expect(escrowAccount.status).toBe(EscrowStatus.Funded)
      
      // Check buyer's token balance decreased
      const buyerBalance = await getTokenBalance(rpc, buyerTokenAccount)
      expect(buyerBalance).toBe(900000000n) // 900 tokens remaining
    })

    it('should complete escrow and release funds', async () => {
      // Complete escrow as buyer
      const completeIx = await EscrowInstructions.completeEscrow(
        client,
        {
          escrow,
          buyer: buyer.address,
          seller: seller.address,
          paymentMint,
          sellerTokenAccount,
          remainingAccounts: []
        }
      )

      const { value: blockhash3 } = await rpc.getLatestBlockhash().send()
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(buyer.address, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(blockhash3, tx),
        tx => appendTransactionMessageInstructions(
          [
            getSetComputeUnitLimitInstruction({ units: 300000 }),
            completeIx
          ],
          tx
        )
      )

      const signedTx = await signTransactionMessageWithSigners(message)
      const signature = getSignatureFromTransaction(signedTx)

      await rpc.sendTransaction(signedTx, { skipPreflight: false })
      await confirmTransaction(rpc, signature)

      // Verify escrow was completed
      const escrowAccount = await client.fetchEscrow(escrow)
      expect(escrowAccount.status).toBe(EscrowStatus.Released)
      
      // Check seller received payment
      const sellerBalance = await getTokenBalance(rpc, sellerTokenAccount)
      expect(sellerBalance).toBe(100000000n) // 100 tokens received
    })
  })

  describe('Escrow Dispute Flow', () => {
    let disputedEscrow: Address

    beforeAll(async () => {
      // Create new escrow for dispute test
      const createIx = await EscrowInstructions.createEscrow(
        client,
        {
          buyer: buyer.address,
          seller: seller.address,
          paymentMint,
          amount: 50000000n, // 50 tokens
          duration: 7 * 24 * 60 * 60,
          description: 'Test dispute escrow',
          autoRelease: false
        }
      )

      disputedEscrow = createIx.accounts.escrow

      // Fund the escrow
      await executeTransaction(rpc, buyer, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        createIx
      ])

      const processIx = await EscrowInstructions.processEscrowPayment(
        client,
        {
          escrow: disputedEscrow,
          buyer: buyer.address,
          sourceTokenAccount: buyerTokenAccount,
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, buyer, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        processIx
      ])
    })

    it('should file dispute on escrow', async () => {
      const disputeIx = await EscrowInstructions.disputeEscrow(
        client,
        {
          escrow: disputedEscrow,
          disputer: buyer.address,
          reason: 'Service not delivered as promised',
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, buyer, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        disputeIx
      ])

      // Verify dispute was filed
      const escrowAccount = await client.fetchEscrow(disputedEscrow)
      expect(escrowAccount.status).toBe(EscrowStatus.Disputed)
      expect(escrowAccount.disputeReason).toBe('Service not delivered as promised')
    })

    it('should assign arbitrator to dispute', async () => {
      const assignIx = await EscrowInstructions.assignArbitrator(
        client,
        {
          escrow: disputedEscrow,
          arbitrator: arbitrator.address,
          authority: seller.address, // In real scenario, this would be platform authority
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, seller, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        assignIx
      ])

      // Verify arbitrator was assigned
      const escrowAccount = await client.fetchEscrow(disputedEscrow)
      expect(escrowAccount.arbitrator).toBe(arbitrator.address)
    })

    it('should submit evidence for dispute', async () => {
      // Buyer submits evidence
      const buyerEvidenceIx = await EscrowInstructions.submitDisputeEvidence(
        client,
        {
          escrow: disputedEscrow,
          submitter: buyer.address,
          evidence: 'Screenshots showing incomplete work',
          evidenceUrl: 'ipfs://QmBuyerEvidence123',
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, buyer, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        buyerEvidenceIx
      ])

      // Seller submits evidence
      const sellerEvidenceIx = await EscrowInstructions.submitDisputeEvidence(
        client,
        {
          escrow: disputedEscrow,
          submitter: seller.address,
          evidence: 'Proof of partial completion',
          evidenceUrl: 'ipfs://QmSellerEvidence456',
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, seller, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        sellerEvidenceIx
      ])

      // Verify evidence was submitted
      const escrowAccount = await client.fetchEscrow(disputedEscrow)
      expect(escrowAccount.evidenceCount).toBe(2)
    })

    it('should resolve dispute with partial refund', async () => {
      const refundPercentage = 60 // 60% refund to buyer
      
      const resolveIx = await EscrowInstructions.resolveDispute(
        client,
        {
          escrow: disputedEscrow,
          arbitrator: arbitrator.address,
          resolution: `Partial refund: ${refundPercentage}% to buyer`,
          refundPercentage,
          buyerTokenAccount,
          sellerTokenAccount,
          remainingAccounts: []
        }
      )

      const initialBuyerBalance = await getTokenBalance(rpc, buyerTokenAccount)
      const initialSellerBalance = await getTokenBalance(rpc, sellerTokenAccount)

      await executeTransaction(rpc, arbitrator, [
        getSetComputeUnitLimitInstruction({ units: 400000 }),
        resolveIx
      ])

      // Verify dispute was resolved
      const escrowAccount = await client.fetchEscrow(disputedEscrow)
      expect(escrowAccount.status).toBe(EscrowStatus.Resolved)

      // Verify funds were distributed correctly
      const finalBuyerBalance = await getTokenBalance(rpc, buyerTokenAccount)
      const finalSellerBalance = await getTokenBalance(rpc, sellerTokenAccount)

      const buyerRefund = 50000000n * BigInt(refundPercentage) / 100n // 30 tokens
      const sellerPayment = 50000000n - buyerRefund // 20 tokens

      expect(finalBuyerBalance - initialBuyerBalance).toBe(buyerRefund)
      expect(finalSellerBalance - initialSellerBalance).toBe(sellerPayment)
    })
  })

  describe('Escrow Cancellation and Refunds', () => {
    it('should cancel unfunded escrow', async () => {
      // Create escrow but don't fund it
      const createIx = await EscrowInstructions.createEscrow(
        client,
        {
          buyer: buyer.address,
          seller: seller.address,
          paymentMint,
          amount: 25000000n, // 25 tokens
          duration: 7 * 24 * 60 * 60,
          description: 'Test cancellation escrow',
          autoRelease: false
        }
      )

      const cancelEscrow = createIx.accounts.escrow

      await executeTransaction(rpc, buyer, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        createIx
      ])

      // Cancel the unfunded escrow
      const cancelIx = await EscrowInstructions.cancelEscrow(
        client,
        {
          escrow: cancelEscrow,
          canceller: buyer.address,
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, buyer, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        cancelIx
      ])

      // Verify escrow was cancelled
      const escrowAccount = await client.fetchEscrow(cancelEscrow)
      expect(escrowAccount.status).toBe(EscrowStatus.Cancelled)
    })

    it('should refund expired escrow', async () => {
      // Create and fund an escrow with very short duration
      const createIx = await EscrowInstructions.createEscrow(
        client,
        {
          buyer: buyer.address,
          seller: seller.address,
          paymentMint,
          amount: 30000000n, // 30 tokens
          duration: 1, // 1 second - will expire immediately
          description: 'Test expired escrow',
          autoRelease: false
        }
      )

      const expiredEscrow = createIx.accounts.escrow

      await executeTransaction(rpc, buyer, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        createIx
      ])

      // Fund the escrow
      const processIx = await EscrowInstructions.processEscrowPayment(
        client,
        {
          escrow: expiredEscrow,
          buyer: buyer.address,
          sourceTokenAccount: buyerTokenAccount,
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, buyer, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        processIx
      ])

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2000))

      const initialBalance = await getTokenBalance(rpc, buyerTokenAccount)

      // Refund expired escrow
      const refundIx = await EscrowInstructions.refundExpiredEscrow(
        client,
        {
          escrow: expiredEscrow,
          buyer: buyer.address,
          paymentMint,
          buyerTokenAccount,
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, buyer, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        refundIx
      ])

      // Verify refund was processed
      const escrowAccount = await client.fetchEscrow(expiredEscrow)
      expect(escrowAccount.status).toBe(EscrowStatus.Refunded)

      const finalBalance = await getTokenBalance(rpc, buyerTokenAccount)
      expect(finalBalance - initialBalance).toBe(30000000n) // Full refund
    })
  })

  describe('Work Order Integration', () => {
    it('should create work order with escrow', async () => {
      // Create work order with milestones
      const milestones = [
        { description: 'Design phase', amount: 30000000n }, // 30 tokens
        { description: 'Implementation', amount: 50000000n }, // 50 tokens
        { description: 'Testing & delivery', amount: 20000000n } // 20 tokens
      ]

      const createWorkOrderIx = await MarketplaceInstructions.createWorkOrder(
        client,
        {
          buyer: buyer.address,
          seller: seller.address,
          title: 'Full stack development',
          description: 'Build complete web application',
          totalAmount: 100000000n, // 100 tokens total
          paymentMint,
          duration: 30 * 24 * 60 * 60, // 30 days
          milestones,
          requiresVerification: true,
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, buyer, [
        getSetComputeUnitLimitInstruction({ units: 400000 }),
        createWorkOrderIx
      ])

      const workOrder = createWorkOrderIx.accounts.workOrder
      const workOrderAccount = await client.fetchWorkOrder(workOrder)
      
      expect(workOrderAccount).toBeDefined()
      expect(workOrderAccount.buyer).toBe(buyer.address)
      expect(workOrderAccount.seller).toBe(seller.address)
      expect(workOrderAccount.milestones.length).toBe(3)
      expect(workOrderAccount.currentMilestone).toBe(0)
    })

    it('should submit and verify work delivery', async () => {
      // First create a work order
      const createWorkOrderIx = await MarketplaceInstructions.createWorkOrder(
        client,
        {
          buyer: buyer.address,
          seller: seller.address,
          title: 'Logo design',
          description: 'Create company logo',
          totalAmount: 50000000n, // 50 tokens
          paymentMint,
          duration: 7 * 24 * 60 * 60, // 7 days
          milestones: [],
          requiresVerification: true,
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, buyer, [
        getSetComputeUnitLimitInstruction({ units: 400000 }),
        createWorkOrderIx
      ])

      const workOrder = createWorkOrderIx.accounts.workOrder

      // Submit work delivery
      const submitDeliveryIx = await MarketplaceInstructions.submitWorkDelivery(
        client,
        {
          workOrder,
          seller: seller.address,
          deliveryUrl: 'ipfs://QmLogoDesigns123',
          description: 'Logo design package with variations',
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, seller, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        submitDeliveryIx
      ])

      // Verify work delivery as buyer
      const verifyDeliveryIx = await MarketplaceInstructions.verifyWorkDelivery(
        client,
        {
          workOrder,
          buyer: buyer.address,
          approved: true,
          feedback: 'Excellent work, exactly what we wanted',
          remainingAccounts: []
        }
      )

      await executeTransaction(rpc, buyer, [
        getSetComputeUnitLimitInstruction({ units: 300000 }),
        verifyDeliveryIx
      ])

      // Check work order status
      const workOrderAccount = await client.fetchWorkOrder(workOrder)
      expect(workOrderAccount.status).toBe('Completed')
      expect(workOrderAccount.deliveryUrl).toBe('ipfs://QmLogoDesigns123')
    })
  })
})

// Helper Functions

async function fundAccount(rpc: Rpc<unknown>, address: Address, lamports: number) {
  const airdropSignature = await rpc.requestAirdrop(address, lamports * 1e9).send()
  await confirmTransaction(rpc, airdropSignature)
}

async function confirmTransaction(rpc: Rpc<unknown>, signature: string) {
  const latestBlockhash = await rpc.getLatestBlockhash().send()
  await rpc.confirmTransaction({
    signature,
    blockhash: latestBlockhash.value.blockhash,
    lastValidBlockHeight: latestBlockhash.value.lastValidBlockHeight
  }).send()
}

async function createTestToken(rpc: Rpc<unknown>, payer: Keypair): Promise<Address> {
  const mint = await generateKeyPairSigner()
  
  const createMintIx = await createMint(
    rpc,
    payer,
    payer.address,
    payer.address,
    6, // 6 decimals
    mint
  )

  return mint.address
}

async function createTestServiceListing(
  client: GhostSpeakClient,
  seller: Keypair,
  paymentMint: Address,
  price: bigint
): Promise<Address> {
  const createListingIx = await MarketplaceInstructions.createServiceListing(
    client,
    {
      seller: seller.address,
      title: 'Test Service',
      description: 'Integration test service',
      price,
      duration: 7 * 24 * 60 * 60, // 7 days
      category: 'Development',
      tags: ['test', 'integration'],
      requiresEscrow: true,
      paymentMints: [paymentMint],
      deliveryTime: 3 * 24 * 60 * 60, // 3 days
      revisions: 2,
      remainingAccounts: []
    }
  )

  await executeTransaction(client.rpc as Rpc<unknown>, seller, [
    getSetComputeUnitLimitInstruction({ units: 300000 }),
    createListingIx
  ])

  return createListingIx.accounts.listing
}

async function executeTransaction(
  rpc: Rpc<unknown>,
  payer: Keypair,
  instructions: any[]
) {
  const { value: blockhash } = await rpc.getLatestBlockhash().send()
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayer(payer.address, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
    tx => appendTransactionMessageInstructions(instructions, tx)
  )

  const signedTx = await signTransactionMessageWithSigners(message)
  const signature = getSignatureFromTransaction(signedTx)

  await rpc.sendTransaction(signedTx, { skipPreflight: false })
  await confirmTransaction(rpc, signature)
}

async function getTokenBalance(rpc: Rpc<unknown>, tokenAccount: Address): Promise<bigint> {
  const accountInfo = await rpc.getAccountInfo(tokenAccount, { encoding: 'jsonParsed' }).send()
  
  if (!accountInfo.value?.data || typeof accountInfo.value.data !== 'object' || !('parsed' in accountInfo.value.data)) {
    throw new Error('Invalid token account data')
  }

  return BigInt(accountInfo.value.data.parsed.info.tokenAmount.amount)
}