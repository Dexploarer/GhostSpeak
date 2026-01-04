import { describe, it, expect } from 'vitest'
import { GhostSpeakClient } from '../../../src/index.js'
import { createSolanaRpc } from '@solana/rpc'
import { address } from '@solana/addresses'

describe('GhostSpeakClient', () => {
  it('should create a client instance', () => {
    const rpc = createSolanaRpc('https://api.devnet.solana.com')
    
    const client = new GhostSpeakClient({
      rpc,
      programId: address('11111111111111111111111111111112'),
      cluster: 'devnet'
    })
    
    expect(client).toBeDefined()
    expect(client.agent).toBeDefined()
    expect(client.agents).toBeDefined()
    expect(client.reputation).toBeDefined()
    expect(client.governance).toBeDefined()
  })
  
  it('should have correct default configuration', () => {
    const rpc = createSolanaRpc('https://api.devnet.solana.com')
    
    const client = new GhostSpeakClient({
      rpc,
      cluster: 'devnet'
    })
    
    expect(client.config.cluster).toBe('devnet')
    expect(client.config.commitment).toBe('confirmed')
  })
})