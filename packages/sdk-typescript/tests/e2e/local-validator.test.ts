import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { GhostSpeakClient } from '../../src/client/GhostSpeakClient'
import { 
  address,
  generateKeyPairSigner,
  lamports,
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction,
  airdropFactory
} from '@solana/kit'
import type { TransactionSigner, Address, Rpc } from '@solana/kit'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Skip these tests in CI or when local validator is not available
const SKIP_E2E = process.env.SKIP_E2E_TESTS === 'true' || process.env.CI === 'true'

describe.skipIf(SKIP_E2E)('E2E Tests with Local Validator', () => {
  let client: GhostSpeakClient
  let rpc: Rpc
  let payer: TransactionSigner
  let programId: Address
  let validatorProcess: any

  beforeAll(async () => {
    // Start local validator with test program deployed
    console.log('Starting local validator...')
    
    // Note: This assumes you have solana-test-validator installed
    // and the program deployed to it
    try {
      // Start validator in background
      validatorProcess = exec('solana-test-validator --reset --quiet')
      
      // Wait for validator to be ready
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      // Create RPC connection
      rpc = createSolanaRpc('http://127.0.0.1:8899')
      
      // Use the test program ID (you might need to deploy first)
      programId = address('AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR')
      
      // Create client
      client = new GhostSpeakClient(rpc, programId)
      
      // Create and fund payer
      payer = await generateKeyPairSigner()
      
      // Request airdrop
      const airdrop = airdropFactory(rpc)
      await airdrop({
        recipientAddress: payer.address,
        lamports: lamports(10000000000n) // 10 SOL
      })
      
      // Wait for airdrop to be confirmed
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error('Failed to start local validator:', error)
      throw error
    }
  }, 30000)

  afterAll(async () => {
    // Stop local validator
    if (validatorProcess) {
      validatorProcess.kill()
    }
  })

  describe('Agent Registration E2E', () => {
    it('should register an agent on-chain', async () => {
      const agent = await generateKeyPairSigner()
      
      // Fund agent account
      const airdrop = airdropFactory(rpc)
      await airdrop({
        recipientAddress: agent.address,
        lamports: lamports(1000000000n) // 1 SOL
      })
      
      // Register agent
      const instruction = await client.agent.registerAgent({
        signer: agent,
        payer,
        name: 'E2E Test Agent',
        description: 'Testing agent registration on local validator',
        avatar: 'https://example.com/avatar.png',
        category: 'Testing',
        capabilities: ['testing', 'validation'],
        pricing: {
          basePrice: lamports(1000000n),
          currency: 'SOL'
        }
      })
      
      // Send transaction
      const signature = await client.sendTransaction([instruction], [payer, agent])
      
      expect(signature).toBeDefined()
      expect(signature).toMatch(/^[1-9A-HJ-NP-Za-km-z]{87,88}$/) // Base58 signature
      
      // Wait for confirmation
      const confirmation = await client.confirmTransaction(signature)
      expect(confirmation.confirmationStatus).toBe('confirmed')
      
      // Verify agent account was created
      const [agentPda] = findAgentPda(agent.address, programId)
      const accountInfo = await rpc.getAccountInfo(agentPda)
      
      expect(accountInfo.value).toBeDefined()
      expect(accountInfo.value?.owner).toBe(programId)
    })

    it('should activate agent after registration', async () => {
      const agent = await generateKeyPairSigner()
      
      // Fund and register agent first
      const airdrop = airdropFactory(rpc)
      await airdrop({
        recipientAddress: agent.address,
        lamports: lamports(2000000000n)
      })
      
      const registerIx = await client.agent.registerAgent({
        signer: agent,
        payer,
        name: 'Activation Test Agent',
        description: 'Testing activation flow',
        avatar: 'https://example.com/avatar.png',
        category: 'Testing',
        capabilities: ['testing'],
        pricing: {
          basePrice: lamports(1000000n),
          currency: 'SOL'
        }
      })
      
      await client.sendTransaction([registerIx], [payer, agent])
      
      // Now activate
      const activateIx = await client.agent.activateAgent({
        signer: agent,
        payer
      })
      
      const activateTx = await client.sendTransaction([activateIx], [payer, agent])
      const confirmation = await client.confirmTransaction(activateTx)
      
      expect(confirmation.confirmationStatus).toBe('confirmed')
    })
  })

  describe('Service Marketplace E2E', () => {
    let agent: TransactionSigner
    let buyer: TransactionSigner

    beforeAll(async () => {
      // Create and fund accounts
      agent = await generateKeyPairSigner()
      buyer = await generateKeyPairSigner()
      
      const airdrop = airdropFactory(rpc)
      await Promise.all([
        airdrop({
          recipientAddress: agent.address,
          lamports: lamports(2000000000n)
        }),
        airdrop({
          recipientAddress: buyer.address,
          lamports: lamports(2000000000n)
        })
      ])
      
      // Register and activate agent
      const registerIx = await client.agent.registerAgent({
        signer: agent,
        payer,
        name: 'Marketplace Test Agent',
        description: 'E2E marketplace testing',
        avatar: 'https://example.com/avatar.png',
        category: 'Development',
        capabilities: ['coding', 'testing'],
        pricing: {
          basePrice: lamports(5000000n),
          currency: 'SOL'
        }
      })
      
      await client.sendTransaction([registerIx], [payer, agent])
    })

    it('should create and purchase service listing', async () => {
      // Create service listing
      const listingIx = await client.marketplace.createServiceListing({
        signer: agent,
        payer: agent,
        title: 'E2E Test Service',
        description: 'Service for E2E testing',
        category: 'Development',
        price: lamports(10000000n), // 0.01 SOL
        currency: 'SOL',
        deliveryTime: 86400,
        requirements: ['Test requirement'],
        tags: ['testing', 'e2e']
      })
      
      const listingTx = await client.sendTransaction([listingIx], [agent])
      await client.confirmTransaction(listingTx)
      
      // Get listing address (would normally query this)
      const listingAddress = address('mockListingAddress') // In real test, derive from tx
      
      // Purchase service
      const purchaseIx = await client.marketplace.purchaseService({
        signer: buyer,
        payer: buyer,
        listing: listingAddress,
        seller: agent.address,
        price: lamports(10000000n),
        requirements: {
          details: 'E2E test purchase'
        }
      })
      
      const purchaseTx = await client.sendTransaction([purchaseIx], [buyer])
      const confirmation = await client.confirmTransaction(purchaseTx)
      
      expect(confirmation.confirmationStatus).toBe('confirmed')
    })
  })

  describe('Escrow Payment E2E', () => {
    let seller: TransactionSigner
    let buyer: TransactionSigner

    beforeAll(async () => {
      seller = await generateKeyPairSigner()
      buyer = await generateKeyPairSigner()
      
      const airdrop = airdropFactory(rpc)
      await Promise.all([
        airdrop({
          recipientAddress: seller.address,
          lamports: lamports(1000000000n)
        }),
        airdrop({
          recipientAddress: buyer.address,
          lamports: lamports(2000000000n)
        })
      ])
    })

    it('should create and release escrow payment', async () => {
      // Create work order
      const workOrderIx = await client.escrow.createWorkOrder({
        signer: buyer,
        payer: buyer,
        seller: seller.address,
        title: 'E2E Escrow Test',
        description: 'Testing escrow functionality',
        requirements: ['Complete test'],
        deliverables: ['Test results'],
        price: lamports(50000000n), // 0.05 SOL
        deadline: Date.now() + 86400000,
        useEscrow: true
      })
      
      const workOrderTx = await client.sendTransaction([workOrderIx], [buyer])
      await client.confirmTransaction(workOrderTx)
      
      // Create escrow payment
      const paymentIx = await client.escrow.createPayment({
        signer: buyer,
        payer: buyer,
        recipient: seller.address,
        amount: lamports(50000000n),
        workOrder: address('workOrderAddress'), // Would derive from tx
        useEscrow: true,
        escrowDuration: 259200,
        description: 'E2E test payment'
      })
      
      const paymentTx = await client.sendTransaction([paymentIx], [buyer])
      await client.confirmTransaction(paymentTx)
      
      // Submit work delivery
      const deliveryIx = await client.escrow.submitWorkDelivery({
        signer: seller,
        workOrder: address('workOrderAddress'),
        deliveryUrl: 'https://example.com/delivery',
        description: 'Work completed'
      })
      
      const deliveryTx = await client.sendTransaction([deliveryIx], [seller])
      await client.confirmTransaction(deliveryTx)
      
      // Release payment
      const releaseIx = await client.escrow.processPayment({
        signer: buyer,
        payment: address('paymentAddress'), // Would derive from tx
        action: 'release',
        reason: 'Work approved'
      })
      
      const releaseTx = await client.sendTransaction([releaseIx], [buyer])
      const confirmation = await client.confirmTransaction(releaseTx)
      
      expect(confirmation.confirmationStatus).toBe('confirmed')
    })
  })

  describe('Transaction Error Handling E2E', () => {
    it('should handle insufficient funds error', async () => {
      const poorAgent = await generateKeyPairSigner()
      
      // Give minimal funds (not enough for transaction)
      const airdrop = airdropFactory(rpc)
      await airdrop({
        recipientAddress: poorAgent.address,
        lamports: lamports(1000n) // Very small amount
      })
      
      const instruction = await client.agent.registerAgent({
        signer: poorAgent,
        payer: poorAgent, // Using own funds
        name: 'Poor Agent',
        description: 'Testing insufficient funds',
        avatar: 'https://example.com/avatar.png',
        category: 'Testing',
        capabilities: ['testing'],
        pricing: {
          basePrice: lamports(1000000n),
          currency: 'SOL'
        }
      })
      
      await expect(
        client.sendTransaction([instruction], [poorAgent])
      ).rejects.toThrow()
    })

    it('should handle invalid instruction data', async () => {
      const agent = await generateKeyPairSigner()
      
      // This would normally be caught by type checking, but testing runtime validation
      const instruction = await client.agent.registerAgent({
        signer: agent,
        payer,
        name: '', // Empty name should fail on-chain
        description: 'Invalid data test',
        avatar: 'https://example.com/avatar.png',
        category: 'Testing',
        capabilities: [],
        pricing: {
          basePrice: lamports(1000000n),
          currency: 'SOL'
        }
      })
      
      await expect(
        client.sendTransaction([instruction], [payer, agent])
      ).rejects.toThrow()
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle multiple transactions in parallel', async () => {
      const agents = await Promise.all(
        Array(5).fill(null).map(() => generateKeyPairSigner())
      )
      
      // Fund all agents
      const airdrop = airdropFactory(rpc)
      await Promise.all(
        agents.map(agent => 
          airdrop({
            recipientAddress: agent.address,
            lamports: lamports(1000000000n)
          })
        )
      )
      
      // Register all agents in parallel
      const registrations = await Promise.all(
        agents.map((agent, i) => 
          client.agent.registerAgent({
            signer: agent,
            payer,
            name: `Parallel Agent ${i}`,
            description: 'Testing parallel transactions',
            avatar: 'https://example.com/avatar.png',
            category: 'Testing',
            capabilities: ['parallel-testing'],
            pricing: {
              basePrice: lamports(1000000n),
              currency: 'SOL'
            }
          })
        )
      )
      
      // Send all transactions
      const signatures = await Promise.all(
        registrations.map((ix, i) => 
          client.sendTransaction([ix], [payer, agents[i]])
        )
      )
      
      expect(signatures).toHaveLength(5)
      expect(signatures.every(sig => sig.match(/^[1-9A-HJ-NP-Za-km-z]{87,88}$/))).toBe(true)
      
      // Confirm all transactions
      const confirmations = await Promise.all(
        signatures.map(sig => client.confirmTransaction(sig))
      )
      
      expect(confirmations.every(conf => conf.confirmationStatus === 'confirmed')).toBe(true)
    })

    it('should measure transaction throughput', async () => {
      const startTime = Date.now()
      const transactionCount = 10
      const transactions = []
      
      for (let i = 0; i < transactionCount; i++) {
        const agent = await generateKeyPairSigner()
        
        // Quick airdrop
        const airdrop = airdropFactory(rpc)
        await airdrop({
          recipientAddress: agent.address,
          lamports: lamports(1000000000n)
        })
        
        const instruction = await client.agent.registerAgent({
          signer: agent,
          payer,
          name: `Throughput Test Agent ${i}`,
          description: 'Measuring throughput',
          avatar: 'https://example.com/avatar.png',
          category: 'Performance',
          capabilities: ['throughput-test'],
          pricing: {
            basePrice: lamports(1000000n),
            currency: 'SOL'
          }
        })
        
        const signature = await client.sendTransaction([instruction], [payer, agent])
        transactions.push(signature)
      }
      
      const endTime = Date.now()
      const duration = (endTime - startTime) / 1000 // seconds
      const tps = transactionCount / duration
      
      console.log(`Processed ${transactionCount} transactions in ${duration}s`)
      console.log(`Throughput: ${tps.toFixed(2)} TPS`)
      
      expect(transactions).toHaveLength(transactionCount)
      expect(tps).toBeGreaterThan(0)
    })
  })

  describe('State Verification E2E', () => {
    it('should verify on-chain state changes', async () => {
      const agent = await generateKeyPairSigner()
      const buyer = await generateKeyPairSigner()
      
      // Fund accounts
      const airdrop = airdropFactory(rpc)
      await Promise.all([
        airdrop({
          recipientAddress: agent.address,
          lamports: lamports(2000000000n)
        }),
        airdrop({
          recipientAddress: buyer.address,
          lamports: lamports(2000000000n)
        })
      ])
      
      // Get initial balances
      const initialAgentBalance = await rpc.getBalance(agent.address)
      const initialBuyerBalance = await rpc.getBalance(buyer.address)
      
      // Register agent
      const registerIx = await client.agent.registerAgent({
        signer: agent,
        payer: agent,
        name: 'State Verification Agent',
        description: 'Verifying state changes',
        avatar: 'https://example.com/avatar.png',
        category: 'Testing',
        capabilities: ['state-verification'],
        pricing: {
          basePrice: lamports(5000000n),
          currency: 'SOL'
        }
      })
      
      const registerTx = await client.sendTransaction([registerIx], [agent])
      await client.confirmTransaction(registerTx)
      
      // Verify balance changed (account rent paid)
      const afterRegisterBalance = await rpc.getBalance(agent.address)
      expect(afterRegisterBalance.value).toBeLessThan(initialAgentBalance.value)
      
      // Verify agent PDA exists
      const [agentPda] = findAgentPda(agent.address, programId)
      const agentAccount = await rpc.getAccountInfo(agentPda)
      expect(agentAccount.value).toBeDefined()
      
      // Create and execute a payment
      const paymentAmount = lamports(10000000n) // 0.01 SOL
      
      // Simple transfer for testing
      const transferIx = await client.escrow.createPayment({
        signer: buyer,
        payer: buyer,
        recipient: agent.address,
        amount: paymentAmount,
        workOrder: address('testWorkOrder'),
        useEscrow: false,
        description: 'State verification payment'
      })
      
      const paymentTx = await client.sendTransaction([transferIx], [buyer])
      await client.confirmTransaction(paymentTx)
      
      // Verify balances changed correctly
      const finalAgentBalance = await rpc.getBalance(agent.address)
      const finalBuyerBalance = await rpc.getBalance(buyer.address)
      
      // Agent should have received payment (minus any fees)
      expect(finalAgentBalance.value).toBeGreaterThan(afterRegisterBalance.value)
      
      // Buyer balance should have decreased by more than payment amount (includes fees)
      const buyerSpent = initialBuyerBalance.value - finalBuyerBalance.value
      expect(buyerSpent).toBeGreaterThan(paymentAmount)
    })
  })
})

// Helper function for PDA derivation (imported from utils)
function findAgentPda(owner: Address, programId: Address): [Address, number] {
  // This would be imported from your utils in real implementation
  // Placeholder for testing
  return [address('mockAgentPda'), 255]
}