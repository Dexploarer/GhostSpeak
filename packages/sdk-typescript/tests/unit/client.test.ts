import { describe, it, expect } from 'vitest'
import { GhostSpeakClient } from '../../src'
import { createSolanaRpc } from '@solana/web3.js'
import { address } from '@solana/addresses'

describe('GhostSpeakClient', () => {
  it('should create a client instance', () => {
    const rpc = createSolanaRpc('https://api.devnet.solana.com')
    
    const client = new GhostSpeakClient({
      rpc,
      programId: address('GHOSTuTpw1dsLYRYDEM9dHsFvPw6cGfKxe6UtXyPVRHN'),
      cluster: 'devnet'
    })
    
    expect(client).toBeDefined()
    expect(client.agent).toBeDefined()
    expect(client.marketplace).toBeDefined()
    expect(client.escrow).toBeDefined()
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