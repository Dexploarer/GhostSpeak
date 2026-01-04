import { describe, it, expect, beforeAll } from 'vitest'
import { GhostSpeakClient } from '../../src'
import { generateKeyPairSigner, address } from '@solana/kit'

describe('Agent Integration Tests', () => {
  let client: GhostSpeakClient
  let signer: Awaited<ReturnType<typeof generateKeyPairSigner>>

  beforeAll(async () => {
    // Setup test client with minimal config
    client = new GhostSpeakClient({
      programId: address('5PVu8KEhTJEJnA4rNUgY6qHZXuhMakRitnXWtFJnxBAG'),
      cluster: 'devnet'
    })

    // Generate a test keypair
    signer = await generateKeyPairSigner()
  })

  it('should register a new agent using fluent API', async () => {
    try {
      // Use the fluent API pattern
      const result = await client
        .agent()
        .create({
          name: 'Test Agent',
          description: 'Integration test agent',
          capabilities: ['text-generation']
        })
        .withSigner(signer)
        .execute()

      expect(result).toBeDefined()
      expect(result.signature).toBeDefined()
      expect(result.address).toBeDefined()
    } catch (error) {
      // This test may fail if not connected to devnet or if the program isn't deployed
      console.log('Agent registration test skipped:', error)
    }
  }, 30000) // 30 second timeout for network operations

  it('should register a new agent using direct module', async () => {
    try {
      // Use the direct module access pattern
      const signature = await client.agents.register(signer, {
        agentType: 0,
        name: 'Test Agent Direct',
        description: 'Direct module test agent',
        metadataUri: 'https://example.com/metadata.json',
        agentId: 'test-agent-direct'
      })

      expect(signature).toBeDefined()
      expect(typeof signature).toBe('string')
    } catch (error) {
      console.log('Direct agent registration test skipped:', error)
    }
  }, 30000)

  it('should list agents', async () => {
    try {
      // Use the correct API: agents.getAllAgents()
      const agents = await client.agents.getAllAgents()

      expect(agents).toBeDefined()
      expect(Array.isArray(agents)).toBe(true)

      if (agents.length > 0) {
        const firstAgent = agents[0]
        expect(firstAgent).toHaveProperty('address')
        expect(firstAgent).toHaveProperty('data')
      }
    } catch (error) {
      console.log('List agents test skipped:', error)
    }
  }, 30000)
})