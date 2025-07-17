import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { GhostSpeakClient, type KeyPairSigner } from '@ghostspeak/sdk'
import { createKeyPairSignerFromBytes, generateKeyPairSigner } from '@solana/signers'
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/rpc'
import { devnet } from '@solana/kit'
import { readFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

// Live blockchain integration tests
describe('Live Blockchain Integration Tests', () => {
  let client: GhostSpeakClient
  let wallet: KeyPairSigner
  let testAgentId: string
  const DEVNET_RPC = 'https://api.devnet.solana.com'
  const DEVNET_WS = 'wss://api.devnet.solana.com'

  beforeAll(async () => {
    // Use dev wallet or create test wallet
    const walletPath = join(homedir(), '.config/solana/id.json')
    if (existsSync(walletPath)) {
      const walletData = JSON.parse(readFileSync(walletPath, 'utf-8'))
      wallet = await createKeyPairSignerFromBytes(new Uint8Array(walletData))
    } else {
      wallet = await generateKeyPairSigner()
    }

    // Create real RPC connections
    const rpc = createSolanaRpc(DEVNET_RPC)
    const rpcSubscriptions = createSolanaRpcSubscriptions(DEVNET_WS)

    // Initialize client with real connections
    client = new GhostSpeakClient({
      rpc: rpc as any,
      rpcSubscriptions: rpcSubscriptions as any,
      rpcEndpoint: DEVNET_RPC,
      programId: 'AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR' as any,
      defaultFeePayer: wallet.address,
      commitment: 'confirmed',
      cluster: 'devnet'
    })
  })

  describe('Agent Registration Flow', () => {
    it('should register a new agent on-chain', async () => {
      // Generate unique agent ID
      testAgentId = `test-agent-${Date.now()}`

      // Register agent
      const signature = await client.agent.register(wallet, {
        agentId: testAgentId,
        agentType: 1,
        metadataUri: `https://ghostspeak.ai/test/${testAgentId}.json`
      })

      expect(signature).toBeTruthy()
      expect(signature).toMatch(/^[1-9A-HJ-NP-Za-km-z]{88}$/) // Solana signature format
    }, 60000) // 60 second timeout for blockchain

    it('should fetch registered agent from blockchain', async () => {
      // Wait for finalization
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Fetch agent
      const agent = await client.agent.getByWallet(wallet.address)
      
      expect(agent).toBeTruthy()
      expect(agent.wallet).toBe(wallet.address)
      expect(agent.agentId).toBe(testAgentId)
      expect(agent.isActive).toBe(true)
    })

    it('should list all agents for wallet', async () => {
      const agents = await client.agent.list({ wallet: wallet.address })
      
      expect(agents).toBeTruthy()
      expect(agents.length).toBeGreaterThanOrEqual(1)
      expect(agents.some(a => a.agentId === testAgentId)).toBe(true)
    })
  })

  describe('Marketplace Integration', () => {
    let listingId: string

    it('should create a marketplace listing', async () => {
      listingId = `listing-${Date.now()}`

      const signature = await client.marketplace.createListing(wallet, {
        agentId: testAgentId,
        title: 'Test Service',
        description: 'Integration test service',
        price: 1000000, // 1 USDC
        category: 'testing',
        deliveryTime: 86400, // 1 day
        maxOrders: 10
      })

      expect(signature).toBeTruthy()
      expect(signature).toMatch(/^[1-9A-HJ-NP-Za-km-z]{88}$/)
    }, 60000)

    it('should fetch created listing', async () => {
      // Wait for finalization
      await new Promise(resolve => setTimeout(resolve, 5000))

      const listings = await client.marketplace.listByAgent(testAgentId)
      
      expect(listings).toBeTruthy()
      expect(listings.length).toBeGreaterThanOrEqual(1)
      expect(listings.some(l => l.agentId === testAgentId)).toBe(true)
    })
  })

  describe('Escrow Payment Flow', () => {
    let escrowId: string
    let buyerWallet: KeyPairSigner

    beforeAll(async () => {
      // Create buyer wallet
      buyerWallet = await generateKeyPairSigner()
    })

    it('should create escrow payment', async () => {
      escrowId = `escrow-${Date.now()}`

      const signature = await client.escrow.create(buyerWallet, {
        escrowId,
        seller: wallet.address,
        amount: 1000000, // 1 USDC
        workOrderId: `work-${Date.now()}`,
        duration: 86400 // 1 day
      })

      expect(signature).toBeTruthy()
      expect(signature).toMatch(/^[1-9A-HJ-NP-Za-km-z]{88}$/)
    }, 60000)

    it('should fetch escrow details', async () => {
      // Wait for finalization
      await new Promise(resolve => setTimeout(resolve, 5000))

      const escrow = await client.escrow.get(escrowId)
      
      expect(escrow).toBeTruthy()
      expect(escrow.buyer).toBe(buyerWallet.address)
      expect(escrow.seller).toBe(wallet.address)
      expect(escrow.amount).toBe(1000000)
      expect(escrow.status).toBe('pending')
    })
  })

  describe('A2A Communication', () => {
    let channelId: string
    let secondAgent: KeyPairSigner

    beforeAll(async () => {
      // Create second agent
      secondAgent = await generateKeyPairSigner()
      
      // Register second agent
      await client.agent.register(secondAgent, {
        agentId: `agent2-${Date.now()}`,
        agentType: 1,
        metadataUri: 'https://ghostspeak.ai/test/agent2.json'
      })
    })

    it('should create communication channel', async () => {
      channelId = `channel-${Date.now()}`

      const signature = await client.a2a.createChannel(wallet, {
        channelId,
        participants: [wallet.address, secondAgent.address],
        metadata: { type: 'test', purpose: 'integration' }
      })

      expect(signature).toBeTruthy()
      expect(signature).toMatch(/^[1-9A-HJ-NP-Za-km-z]{88}$/)
    }, 60000)

    it('should send message in channel', async () => {
      // Wait for channel creation
      await new Promise(resolve => setTimeout(resolve, 5000))

      const signature = await client.a2a.sendMessage(wallet, {
        channelId,
        content: 'Hello from integration test',
        messageType: 'text'
      })

      expect(signature).toBeTruthy()
      expect(signature).toMatch(/^[1-9A-HJ-NP-Za-km-z]{88}$/)
    }, 60000)
  })

  describe('Transaction Error Handling', () => {
    it('should handle insufficient funds gracefully', async () => {
      const poorWallet = await generateKeyPairSigner()

      await expect(
        client.agent.register(poorWallet, {
          agentId: 'poor-agent',
          agentType: 1,
          metadataUri: 'test.json'
        })
      ).rejects.toThrow(/insufficient/i)
    })

    it('should handle duplicate registration', async () => {
      await expect(
        client.agent.register(wallet, {
          agentId: testAgentId, // Already registered
          agentType: 1,
          metadataUri: 'test.json'
        })
      ).rejects.toThrow(/already registered/i)
    })
  })

  afterAll(() => {
    // Clean up any test data if needed
    console.log('Integration tests completed')
  })
})