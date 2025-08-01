# Testing Strategy

## Overview

This guide outlines the comprehensive testing strategy for the manually-implemented GhostSpeak SDK, covering unit tests, integration tests, and end-to-end testing approaches.

## Testing Philosophy

### Core Principles

1. **Test Behavior, Not Implementation** - Focus on what the code does, not how
2. **Comprehensive Coverage** - Aim for >90% code coverage
3. **Fast Feedback** - Unit tests should run in milliseconds
4. **Realistic Scenarios** - Integration tests should mirror real usage
5. **Deterministic Results** - Tests should be reliable and repeatable

## Testing Layers

```
┌─────────────────────────────────────────┐
│          E2E Tests (Devnet)             │  Real transactions
├─────────────────────────────────────────┤
│       Integration Tests (Local)         │  Local validator
├─────────────────────────────────────────┤
│           Unit Tests                    │  Isolated functions
├─────────────────────────────────────────┤
│         Type Tests                      │  TypeScript compiler
└─────────────────────────────────────────┘
```

## Unit Testing

### Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
})
```

### Testing Utilities

```typescript
// tests/utils/test-helpers.ts
import { address } from '@solana/addresses'
import type { Address, TransactionSigner } from '@solana/kit'

/**
 * Generate a mock address
 */
export function mockAddress(seed = 'test'): Address {
  // Generate deterministic address from seed
  const bytes = new Uint8Array(32)
  for (let i = 0; i < seed.length && i < 32; i++) {
    bytes[i] = seed.charCodeAt(i)
  }
  return address(bs58.encode(bytes))
}

/**
 * Generate a mock transaction signer
 */
export function mockSigner(seed = 'signer'): TransactionSigner {
  const addr = mockAddress(seed)
  return {
    address: addr,
    signTransactions: async (txs) => txs,
    signAllTransactions: async (txs) => txs
  } as TransactionSigner
}

/**
 * Create test data factory
 */
export function createTestFactory<T>(
  defaults: T
): (overrides?: Partial<T>) => T {
  return (overrides = {}) => ({
    ...defaults,
    ...overrides
  })
}

// Example factories
export const createTestAgent = createTestFactory({
  discriminator: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
  owner: mockAddress('owner'),
  agentId: 'test-agent',
  agentType: 0,
  metadataUri: 'ipfs://test',
  isActive: true,
  createdAt: 1234567890n,
  updatedAt: 1234567890n,
  reputation: 5000,
  transactionCount: 0,
  totalVolume: 0n,
  stakedAmount: null,
  verificationStatus: 0,
  customData: '{}'
})
```

### Instruction Builder Tests

```typescript
// tests/unit/instructions/register-agent.test.ts
import { describe, it, expect } from 'vitest'
import { createRegisterAgentInstruction } from '../../../src/instructions/agent/register-agent'
import { mockAddress, mockSigner } from '../../utils/test-helpers'
import { DISCRIMINATORS } from '../../../src/constants/discriminators'

describe('createRegisterAgentInstruction', () => {
  const defaultAccounts = {
    agentAccount: mockAddress('agent'),
    userRegistry: mockAddress('registry'),
    signer: mockSigner('owner')
  }
  
  const defaultArgs = {
    agentType: 0,
    metadataUri: 'ipfs://QmTest',
    agentId: 'test-agent-001'
  }
  
  it('should create valid instruction', () => {
    const instruction = createRegisterAgentInstruction(
      defaultAccounts,
      defaultArgs
    )
    
    expect(instruction.programAddress).toBe(GHOSTSPEAK_PROGRAM_ID)
    expect(instruction.accounts).toHaveLength(4)
    expect(instruction.data).toBeInstanceOf(Uint8Array)
  })
  
  it('should include correct discriminator', () => {
    const instruction = createRegisterAgentInstruction(
      defaultAccounts,
      defaultArgs
    )
    
    const discriminator = instruction.data.slice(0, 8)
    expect(discriminator).toEqual(DISCRIMINATORS.registerAgent)
  })
  
  it('should validate agent type', () => {
    expect(() => 
      createRegisterAgentInstruction(defaultAccounts, {
        ...defaultArgs,
        agentType: 99 // Invalid
      })
    ).toThrow('Invalid agent type')
  })
  
  it('should validate agent ID length', () => {
    expect(() => 
      createRegisterAgentInstruction(defaultAccounts, {
        ...defaultArgs,
        agentId: 'a'.repeat(33) // Too long
      })
    ).toThrow('Agent ID must be 1-32 characters')
  })
  
  it('should include optional clock account', () => {
    const instruction = createRegisterAgentInstruction(
      {
        ...defaultAccounts,
        clock: mockAddress('clock')
      },
      defaultArgs
    )
    
    expect(instruction.accounts).toHaveLength(5)
    expect(instruction.accounts[4]).toEqual({
      address: mockAddress('clock'),
      role: 'readonly'
    })
  })
})
```

### Serialization Tests

```typescript
// tests/unit/codecs/borsh.test.ts
import { describe, it, expect } from 'vitest'
import { BorshEncoder, BorshDecoder } from '../../../src/codecs/borsh'
import { mockAddress } from '../../utils/test-helpers'

describe('Borsh Serialization', () => {
  describe('BorshEncoder', () => {
    it('should encode primitives correctly', () => {
      const encoder = new BorshEncoder()
      
      encoder.writeU8(255)
      encoder.writeU32(4294967295)
      encoder.writeU64(18446744073709551615n)
      encoder.writeBool(true)
      
      const buffer = encoder.toBuffer()
      expect(buffer).toEqual(Buffer.from([
        255,                                    // u8
        255, 255, 255, 255,                    // u32
        255, 255, 255, 255, 255, 255, 255, 255, // u64
        1                                       // bool
      ]))
    })
    
    it('should encode strings correctly', () => {
      const encoder = new BorshEncoder()
      encoder.writeString('hello')
      
      const buffer = encoder.toBuffer()
      expect(buffer).toEqual(Buffer.from([
        5, 0, 0, 0,              // length (u32)
        104, 101, 108, 108, 111  // "hello"
      ]))
    })
    
    it('should encode public keys correctly', () => {
      const encoder = new BorshEncoder()
      const addr = mockAddress('test')
      encoder.writePublicKey(addr)
      
      const buffer = encoder.toBuffer()
      expect(buffer.length).toBe(32)
    })
  })
  
  describe('BorshDecoder', () => {
    it('should decode primitives correctly', () => {
      const data = Buffer.from([
        255,                                    // u8
        255, 255, 255, 255,                    // u32
        255, 255, 255, 255, 255, 255, 255, 255, // u64
        1                                       // bool
      ])
      
      const decoder = new BorshDecoder(data)
      
      expect(decoder.readU8()).toBe(255)
      expect(decoder.readU32()).toBe(4294967295)
      expect(decoder.readU64()).toBe(18446744073709551615n)
      expect(decoder.readBool()).toBe(true)
    })
    
    it('should decode strings correctly', () => {
      const data = Buffer.from([
        5, 0, 0, 0,              // length
        104, 101, 108, 108, 111  // "hello"
      ])
      
      const decoder = new BorshDecoder(data)
      expect(decoder.readString()).toBe('hello')
    })
  })
  
  describe('Round-trip serialization', () => {
    it('should serialize and deserialize complex object', () => {
      const original = {
        owner: mockAddress('owner'),
        agentId: 'test-agent',
        agentType: 1,
        metadataUri: 'ipfs://QmTest',
        isActive: true,
        createdAt: 1234567890n
      }
      
      // Encode
      const encoder = new BorshEncoder()
      encoder.writePublicKey(original.owner)
      encoder.writeString(original.agentId)
      encoder.writeU8(original.agentType)
      encoder.writeString(original.metadataUri)
      encoder.writeBool(original.isActive)
      encoder.writeI64(original.createdAt)
      
      // Decode
      const decoder = new BorshDecoder(encoder.toBuffer())
      const decoded = {
        owner: decoder.readPublicKey(),
        agentId: decoder.readString(),
        agentType: decoder.readU8(),
        metadataUri: decoder.readString(),
        isActive: decoder.readBool(),
        createdAt: decoder.readI64()
      }
      
      expect(decoded).toEqual(original)
    })
  })
})
```

### Account Decoder Tests

```typescript
// tests/unit/accounts/agent.test.ts
import { describe, it, expect } from 'vitest'
import { decodeAgent } from '../../../src/accounts/agent'
import { createTestAgent } from '../../utils/test-helpers'
import { serializeAgent } from '../../../src/codecs/agent'

describe('Agent Account Decoder', () => {
  it('should decode valid agent account', () => {
    const original = createTestAgent()
    const encoded = serializeAgent(original)
    const decoded = decodeAgent(encoded)
    
    expect(decoded).toEqual(original)
  })
  
  it('should reject invalid discriminator', () => {
    const agent = createTestAgent()
    const encoded = serializeAgent(agent)
    
    // Corrupt discriminator
    encoded[0] = 99
    
    expect(() => decodeAgent(encoded)).toThrow(
      'Invalid agent account discriminator'
    )
  })
  
  it('should handle missing optional fields', () => {
    const agent = createTestAgent({ stakedAmount: null })
    const encoded = serializeAgent(agent)
    const decoded = decodeAgent(encoded)
    
    expect(decoded.stakedAmount).toBeNull()
  })
})
```

## Integration Testing

### Local Validator Setup

```typescript
// tests/integration/setup.ts
import { Keypair, Connection } from '@solana/web3.js'
import { spawn } from 'child_process'
import { promisify } from 'util'

const sleep = promisify(setTimeout)

export class LocalValidator {
  private process?: any
  private connection?: Connection
  
  async start(): Promise<Connection> {
    // Start local validator
    this.process = spawn('solana-test-validator', [
      '--reset',
      '--quiet',
      '--bpf-program',
      GHOSTSPEAK_PROGRAM_ID,
      './target/deploy/ghostspeak_marketplace.so'
    ])
    
    // Wait for validator to start
    await sleep(5000)
    
    this.connection = new Connection('http://localhost:8899', 'confirmed')
    
    // Verify connection
    await this.connection.getVersion()
    
    return this.connection
  }
  
  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill()
      await sleep(1000)
    }
  }
  
  async airdrop(address: Address, lamports: number): Promise<void> {
    if (!this.connection) throw new Error('Validator not started')
    
    const signature = await this.connection.requestAirdrop(
      address,
      lamports
    )
    
    await this.connection.confirmTransaction(signature)
  }
}
```

### Integration Test Example

```typescript
// tests/integration/agent-lifecycle.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { LocalValidator } from './setup'
import { GhostSpeakClient } from '../../src'
import { Keypair } from '@solana/web3.js'

describe('Agent Lifecycle Integration', () => {
  let validator: LocalValidator
  let client: GhostSpeakClient
  let payer: Keypair
  
  beforeAll(async () => {
    validator = new LocalValidator()
    const connection = await validator.start()
    
    payer = Keypair.generate()
    await validator.airdrop(payer.publicKey, 10 * LAMPORTS_PER_SOL)
    
    client = new GhostSpeakClient({
      rpcEndpoint: 'http://localhost:8899',
      commitment: 'confirmed'
    })
  })
  
  afterAll(async () => {
    await validator.stop()
  })
  
  it('should register and update agent', async () => {
    // Register agent
    const agentId = `agent-${Date.now()}`
    const registerSig = await client.agents.register(payer, {
      agentType: 0,
      metadataUri: 'ipfs://QmTest',
      agentId
    })
    
    expect(registerSig).toBeDefined()
    
    // Fetch agent
    const agent = await client.agents.get(agentId, payer.publicKey)
    expect(agent).toBeDefined()
    expect(agent?.agentId).toBe(agentId)
    expect(agent?.isActive).toBe(true)
    
    // Update agent
    const updateSig = await client.agents.update(payer, {
      agentId,
      metadataUri: 'ipfs://QmUpdated'
    })
    
    expect(updateSig).toBeDefined()
    
    // Verify update
    const updated = await client.agents.get(agentId, payer.publicKey)
    expect(updated?.metadataUri).toBe('ipfs://QmUpdated')
  })
  
  it('should handle escrow flow', async () => {
    // Create two agents
    const payerAgent = await createTestAgent(client, payer)
    const recipientKeypair = Keypair.generate()
    await validator.airdrop(recipientKeypair.publicKey, 5 * LAMPORTS_PER_SOL)
    const recipientAgent = await createTestAgent(client, recipientKeypair)
    
    // Create escrow
    const escrowSig = await client.escrows.create(payer, {
      amount: LAMPORTS_PER_SOL,
      recipient: recipientKeypair.publicKey,
      expiresAt: BigInt(Date.now() / 1000 + 3600),
      description: 'Test escrow'
    })
    
    expect(escrowSig).toBeDefined()
    
    // Complete escrow
    const completeSig = await client.escrows.complete(
      recipientKeypair,
      escrowId
    )
    
    expect(completeSig).toBeDefined()
  })
})
```

## End-to-End Testing

### Devnet Testing

```typescript
// tests/e2e/devnet-test.ts
import { Connection, Keypair } from '@solana/web3.js'
import { GhostSpeakClient } from '../../src'

const DEVNET_ENDPOINT = 'https://api.devnet.solana.com'

export async function runDevnetTests() {
  const connection = new Connection(DEVNET_ENDPOINT, 'confirmed')
  const client = new GhostSpeakClient({
    rpcEndpoint: DEVNET_ENDPOINT,
    commitment: 'confirmed'
  })
  
  // Load test wallet
  const wallet = loadTestWallet() // Your test wallet with devnet SOL
  
  console.log('Running devnet tests...')
  
  try {
    // Test 1: Register agent
    await testRegisterAgent(client, wallet)
    
    // Test 2: Create and complete escrow
    await testEscrowFlow(client, wallet)
    
    // Test 3: Channel messaging
    await testChannelMessaging(client, wallet)
    
    console.log('All devnet tests passed!')
  } catch (error) {
    console.error('Devnet test failed:', error)
    process.exit(1)
  }
}

async function testRegisterAgent(
  client: GhostSpeakClient,
  wallet: Keypair
): Promise<void> {
  console.log('Testing agent registration...')
  
  const agentId = `devnet-agent-${Date.now()}`
  const signature = await client.agents.register(wallet, {
    agentType: 0,
    metadataUri: 'ipfs://QmDevnetTest',
    agentId
  })
  
  console.log(`Agent registered: ${signature}`)
  
  // Verify on-chain
  const agent = await client.agents.get(agentId, wallet.publicKey)
  if (!agent) {
    throw new Error('Agent not found after registration')
  }
  
  console.log('✓ Agent registration successful')
}
```

### Performance Testing

```typescript
// tests/performance/instruction-building.bench.ts
import { bench, describe } from 'vitest'
import { createRegisterAgentInstruction } from '../../src/instructions'
import { mockAddress, mockSigner } from '../utils/test-helpers'

describe('Instruction Building Performance', () => {
  const accounts = {
    agentAccount: mockAddress('agent'),
    userRegistry: mockAddress('registry'),
    signer: mockSigner('owner')
  }
  
  const args = {
    agentType: 0,
    metadataUri: 'ipfs://QmTest',
    agentId: 'test-agent'
  }
  
  bench('createRegisterAgentInstruction', () => {
    createRegisterAgentInstruction(accounts, args)
  })
  
  bench('batch instruction creation', () => {
    for (let i = 0; i < 100; i++) {
      createRegisterAgentInstruction(accounts, {
        ...args,
        agentId: `agent-${i}`
      })
    }
  })
})
```

## Mock Strategies

### RPC Mocking

```typescript
// tests/mocks/rpc-mock.ts
export class MockRpcClient {
  private responses: Map<string, any> = new Map()
  
  setResponse(method: string, response: any): void {
    this.responses.set(method, response)
  }
  
  async call(method: string, params: any[]): Promise<any> {
    const response = this.responses.get(method)
    if (!response) {
      throw new Error(`No mock response for ${method}`)
    }
    
    if (typeof response === 'function') {
      return response(params)
    }
    
    return response
  }
  
  // Mock specific methods
  async getAccountInfo(address: string): Promise<any> {
    return this.call('getAccountInfo', [address])
  }
  
  async sendTransaction(tx: string): Promise<string> {
    return this.call('sendTransaction', [tx])
  }
}

// Usage in tests
const mockRpc = new MockRpcClient()
mockRpc.setResponse('getAccountInfo', {
  data: agentAccountData,
  lamports: 1000000,
  owner: GHOSTSPEAK_PROGRAM_ID
})
```

### Transaction Mocking

```typescript
// tests/mocks/transaction-mock.ts
export class TransactionMocker {
  static mockSuccessfulTransaction(): string {
    return 'mock-signature-' + Date.now()
  }
  
  static mockFailedTransaction(errorCode: number): never {
    throw {
      logs: [
        'Program log: Instruction: RegisterAgent',
        `Program log: Error: Custom program error: 0x${errorCode.toString(16)}`
      ]
    }
  }
  
  static mockSigner(address: Address): TransactionSigner {
    return {
      address,
      signTransactions: async (txs) => txs,
      signAllTransactions: async (txs) => txs
    }
  }
}
```

## Test Data Management

### Fixtures

```typescript
// tests/fixtures/agents.ts
export const AGENT_FIXTURES = {
  aiAgent: {
    agentId: 'ai-agent-001',
    agentType: 0,
    metadataUri: 'ipfs://QmAiAgent',
    // ... rest of fields
  },
  
  humanAgent: {
    agentId: 'human-agent-001',
    agentType: 1,
    metadataUri: 'ipfs://QmHumanAgent',
    // ... rest of fields
  },
  
  verifiedAgent: {
    agentId: 'verified-agent-001',
    agentType: 0,
    metadataUri: 'ipfs://QmVerifiedAgent',
    verificationStatus: 2,
    // ... rest of fields
  }
}
```

### Snapshot Testing

```typescript
// tests/unit/serialization.snapshot.test.ts
import { describe, it, expect } from 'vitest'
import { serializeRegisterAgentArgs } from '../../src/instructions'

describe('Serialization Snapshots', () => {
  it('should match serialization snapshot', () => {
    const args = {
      agentType: 0,
      metadataUri: 'ipfs://QmTest',
      agentId: 'test-agent'
    }
    
    const serialized = serializeRegisterAgentArgs(args)
    
    // This creates a snapshot file on first run
    expect(serialized).toMatchSnapshot()
  })
})
```

## Coverage Requirements

### Configuration

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "tsx tests/e2e/devnet-test.ts"
  }
}
```

### Coverage Thresholds

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      }
    }
  }
})
```

## Best Practices

1. **Test Isolation** - Each test should be independent
2. **Descriptive Names** - Test names should explain what and why
3. **AAA Pattern** - Arrange, Act, Assert
4. **Mock External Dependencies** - Don't rely on network in unit tests
5. **Test Edge Cases** - Empty arrays, null values, max values
6. **Test Error Paths** - Ensure errors are handled correctly
7. **Performance Benchmarks** - Track performance over time
8. **Continuous Integration** - Run tests on every commit