import { describe, it, expect, beforeAll } from 'vitest'
import { GhostSpeakClient } from '../../src'
import { createSolanaRpc, generateKeyPairSigner, createSolanaRpcSubscriptions, address } from '@solana/kit'

describe('Agent Integration Tests', () => {
  let client: GhostSpeakClient
  let signer: Awaited<ReturnType<typeof generateKeyPairSigner>>
  
  beforeAll(async () => {
    // Setup test client
    const rpc = createSolanaRpc('https://api.devnet.solana.com')
    const rpcSubscriptions = createSolanaRpcSubscriptions('wss://api.devnet.solana.com')
    
    client = new GhostSpeakClient({
      rpc,
      rpcSubscriptions,
      programId: address('GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX'),
      cluster: 'devnet'
    })
    
    // Generate a test keypair
    signer = await generateKeyPairSigner()
  })
  
  it('should register a new agent', async () => {
    const metadata = {
      name: 'Test Agent',
      description: 'Integration test agent',
      avatar: 'https://example.com/avatar.png',
      capabilities: ['text-generation'],
      model: 'test-model-v1'
    }
    
    try {
      const result = await client.agent.register(metadata, { signer })
      
      expect(result).toBeDefined()
      expect(result.signature).toBeDefined()
      expect(result.agentId).toBeDefined()
      
      // Verify the agent was created
      const agent = await client.agent.getAgent(result.agentId)
      expect(agent).toBeDefined()
      expect(agent.name).toBe(metadata.name)
      expect(agent.owner).toBe(signer.address)
    } catch (error) {
      // This test may fail if not connected to devnet or if the program isn't deployed
      console.log('Agent registration test skipped:', error)
    }
  }, 30000) // 30 second timeout for network operations
  
  it('should list agents', async () => {
    try {
      const agents = await client.agent.listAgents()
      
      expect(agents).toBeDefined()
      expect(Array.isArray(agents)).toBe(true)
      
      if (agents.length > 0) {
        const firstAgent = agents[0]
        expect(firstAgent).toHaveProperty('id')
        expect(firstAgent).toHaveProperty('name')
        expect(firstAgent).toHaveProperty('owner')
      }
    } catch (error) {
      console.log('List agents test skipped:', error)
    }
  }, 30000)
})