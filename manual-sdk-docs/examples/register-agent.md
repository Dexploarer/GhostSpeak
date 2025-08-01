# Complete Example: Register Agent Implementation

## Overview

This example demonstrates a complete implementation of the `registerAgent` instruction, showing all components from type definitions to testing.

## File Structure

```
src/
├── types/
│   └── instructions/
│       └── agent.ts
├── constants/
│   └── discriminators.ts
├── instructions/
│   └── agent/
│       └── register-agent.ts
├── accounts/
│   └── agent.ts
├── utils/
│   └── pda.ts
└── modules/
    └── agent/
        └── AgentModule.ts
```

## Step 1: Type Definitions

```typescript
// src/types/instructions/agent.ts
import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'

/**
 * Arguments for registering a new agent
 */
export interface RegisterAgentArgs {
  /** Type of agent: 0=AI, 1=Human, 2=Hybrid */
  agentType: number
  
  /** IPFS URI for agent metadata (max 200 chars) */
  metadataUri: string
  
  /** Unique agent identifier (max 32 chars) */
  agentId: string
}

/**
 * Accounts required for register agent instruction
 */
export interface RegisterAgentAccounts {
  /** PDA where agent data will be stored */
  agentAccount: Address
  
  /** User's registry PDA */
  userRegistry: Address
  
  /** Agent owner (must sign) */
  signer: TransactionSigner
  
  /** System program (defaults to 11111111111111111111111111111111) */
  systemProgram?: Address
  
  /** Clock sysvar (optional for timestamp) */
  clock?: Address
}

/**
 * Agent account data structure
 */
export interface Agent {
  /** Account discriminator (8 bytes) */
  discriminator: Uint8Array
  
  /** Owner's wallet address */
  owner: Address
  
  /** Unique identifier for the agent */
  agentId: string
  
  /** Type of agent */
  agentType: number
  
  /** IPFS URI containing extended metadata */
  metadataUri: string
  
  /** Whether the agent can perform transactions */
  isActive: boolean
  
  /** Unix timestamp when created */
  createdAt: bigint
  
  /** Unix timestamp of last update */
  updatedAt: bigint
  
  /** Reputation score (0-10000) */
  reputation: number
  
  /** Number of completed transactions */
  transactionCount: number
  
  /** Total volume traded in lamports */
  totalVolume: bigint
  
  /** Optional stake amount for reputation */
  stakedAmount: bigint | null
  
  /** Verification status */
  verificationStatus: number
  
  /** Custom attributes stored as JSON */
  customData: string
}
```

## Step 2: Constants and Discriminators

```typescript
// src/constants/discriminators.ts
import { createHash } from 'crypto'

/**
 * Calculate Anchor-compatible discriminator
 */
export function calculateDiscriminator(name: string): Uint8Array {
  const preimage = `global:${name}`
  const hash = createHash('sha256')
    .update(preimage)
    .digest()
  
  return new Uint8Array(hash.slice(0, 8))
}

/**
 * Pre-calculated instruction discriminators
 */
export const INSTRUCTION_DISCRIMINATORS = {
  registerAgent: new Uint8Array([135, 157, 66, 195, 2, 113, 175, 30]),
  // ... other instructions
} as const

/**
 * Pre-calculated account discriminators
 */
export const ACCOUNT_DISCRIMINATORS = {
  agent: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
  userRegistry: new Uint8Array([9, 10, 11, 12, 13, 14, 15, 16]),
  // ... other accounts
} as const

// src/constants/program.ts
import { address } from '@solana/addresses'

export const GHOSTSPEAK_PROGRAM_ID = address('5PVu8KEhTJEJnA4rNUgY6qHZXuhMakRitnXWtFJnxBAG')
export const SYSTEM_PROGRAM_ID = address('11111111111111111111111111111111')
export const CLOCK_SYSVAR_ID = address('SysvarC1ock11111111111111111111111111111111')
```

## Step 3: PDA Derivation

```typescript
// src/utils/pda.ts
import { getProgramDerivedAddress } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import { GHOSTSPEAK_PROGRAM_ID } from '../constants/program'

/**
 * Derive agent PDA
 */
export async function deriveAgentPDA(
  agentId: string,
  owner: Address
): Promise<[Address, number]> {
  return getProgramDerivedAddress({
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    seeds: [
      Buffer.from('agent'),
      Buffer.from(agentId),
      Buffer.from(owner.toString())
    ]
  })
}

/**
 * Derive user registry PDA
 */
export async function deriveUserRegistryPDA(
  owner: Address
): Promise<[Address, number]> {
  return getProgramDerivedAddress({
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    seeds: [
      Buffer.from('user_registry'),
      Buffer.from(owner.toString())
    ]
  })
}
```

## Step 4: Instruction Implementation

```typescript
// src/instructions/agent/register-agent.ts
import type { IInstruction } from '@solana/kit'
import { serialize } from '@coral-xyz/borsh'
import type { RegisterAgentArgs, RegisterAgentAccounts } from '../../types/instructions/agent'
import { INSTRUCTION_DISCRIMINATORS } from '../../constants/discriminators'
import { GHOSTSPEAK_PROGRAM_ID, SYSTEM_PROGRAM_ID } from '../../constants/program'
import { validateRegisterAgentArgs } from './validation'

/**
 * Borsh schema for register agent arguments
 */
const REGISTER_AGENT_SCHEMA = {
  struct: {
    agentType: 'u8',
    metadataUri: 'string',
    agentId: 'string'
  }
}

/**
 * Create register agent instruction
 * 
 * @param accounts - Required accounts
 * @param args - Instruction arguments
 * @returns Instruction object
 * 
 * @example
 * ```typescript
 * const instruction = createRegisterAgentInstruction({
 *   agentAccount: agentPda,
 *   userRegistry: registryPda,
 *   signer: wallet
 * }, {
 *   agentType: 0, // AI agent
 *   metadataUri: 'ipfs://QmXxx',
 *   agentId: 'my-agent-001'
 * })
 * ```
 */
export function createRegisterAgentInstruction(
  accounts: RegisterAgentAccounts,
  args: RegisterAgentArgs
): IInstruction {
  // Validate arguments
  validateRegisterAgentArgs(args)
  
  // Encode arguments using Borsh
  const encodedArgs = serialize(REGISTER_AGENT_SCHEMA, args)
  
  // Combine discriminator and encoded args
  const data = Buffer.concat([
    Buffer.from(INSTRUCTION_DISCRIMINATORS.registerAgent),
    Buffer.from(encodedArgs)
  ])
  
  // Build accounts array
  const accountMetas = [
    {
      address: accounts.agentAccount,
      role: 'writable' as const
    },
    {
      address: accounts.userRegistry,
      role: 'writable' as const
    },
    {
      address: accounts.signer.address,
      role: 'writableSigner' as const
    },
    {
      address: accounts.systemProgram ?? SYSTEM_PROGRAM_ID,
      role: 'readonly' as const
    }
  ]
  
  // Add optional clock account
  if (accounts.clock) {
    accountMetas.push({
      address: accounts.clock,
      role: 'readonly' as const
    })
  }
  
  return {
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    accounts: accountMetas,
    data
  }
}

// src/instructions/agent/validation.ts
import type { RegisterAgentArgs } from '../../types/instructions/agent'

/**
 * Validate register agent arguments
 */
export function validateRegisterAgentArgs(args: RegisterAgentArgs): void {
  // Validate agent type
  if (args.agentType < 0 || args.agentType > 2) {
    throw new Error('Invalid agent type. Must be 0 (AI), 1 (Human), or 2 (Hybrid)')
  }
  
  // Validate agent ID
  if (!args.agentId || args.agentId.length === 0) {
    throw new Error('Agent ID is required')
  }
  
  if (args.agentId.length > 32) {
    throw new Error('Agent ID must be 32 characters or less')
  }
  
  if (!/^[a-zA-Z0-9-_]+$/.test(args.agentId)) {
    throw new Error('Agent ID can only contain alphanumeric characters, hyphens, and underscores')
  }
  
  // Validate metadata URI
  if (!args.metadataUri || args.metadataUri.length === 0) {
    throw new Error('Metadata URI is required')
  }
  
  if (args.metadataUri.length > 200) {
    throw new Error('Metadata URI must be 200 characters or less')
  }
  
  // Validate URI format
  const validProtocols = ['ipfs://', 'https://', 'ar://']
  const hasValidProtocol = validProtocols.some(protocol => 
    args.metadataUri.startsWith(protocol)
  )
  
  if (!hasValidProtocol) {
    throw new Error('Metadata URI must start with ipfs://, https://, or ar://')
  }
}
```

## Step 5: Account Decoder

```typescript
// src/accounts/agent.ts
import { deserialize } from '@coral-xyz/borsh'
import type { Agent } from '../types/instructions/agent'
import { ACCOUNT_DISCRIMINATORS } from '../constants/discriminators'

/**
 * Borsh schema for agent account
 */
const AGENT_SCHEMA = {
  struct: {
    discriminator: ['u8', 8],
    owner: 'publicKey',
    agentId: 'string',
    agentType: 'u8',
    metadataUri: 'string',
    isActive: 'bool',
    createdAt: 'i64',
    updatedAt: 'i64',
    reputation: 'u16',
    transactionCount: 'u32',
    totalVolume: 'u64',
    stakedAmount: { option: 'u64' },
    verificationStatus: 'u8',
    customData: 'string'
  }
}

/**
 * Decode agent account data
 * 
 * @param data - Raw account data
 * @returns Decoded agent or null if invalid
 */
export function decodeAgent(data: Uint8Array): Agent | null {
  try {
    // Deserialize the data
    const decoded = deserialize(AGENT_SCHEMA, data) as Agent
    
    // Validate discriminator
    const discriminator = new Uint8Array(decoded.discriminator)
    const expectedDiscriminator = ACCOUNT_DISCRIMINATORS.agent
    
    if (!discriminator.every((byte, i) => byte === expectedDiscriminator[i])) {
      console.error('Invalid agent account discriminator')
      return null
    }
    
    return decoded
  } catch (error) {
    console.error('Failed to decode agent account:', error)
    return null
  }
}

/**
 * Encode agent account data
 * 
 * @param agent - Agent data to encode
 * @returns Encoded data
 */
export function encodeAgent(agent: Agent): Uint8Array {
  return serialize(AGENT_SCHEMA, agent)
}
```

## Step 6: Module Integration

```typescript
// src/modules/agent/AgentModule.ts
import type { Address } from '@solana/addresses'
import type { TransactionSigner, Connection } from '@solana/kit'
import { createRegisterAgentInstruction } from '../../instructions/agent/register-agent'
import { deriveAgentPDA, deriveUserRegistryPDA } from '../../utils/pda'
import { decodeAgent } from '../../accounts/agent'
import type { Agent } from '../../types/instructions/agent'

export class AgentModule {
  constructor(
    private connection: Connection,
    private programId: Address
  ) {}
  
  /**
   * Register a new agent
   * 
   * @example
   * ```typescript
   * const signature = await agentModule.register(wallet, {
   *   agentType: 0,
   *   metadataUri: 'ipfs://QmXxx',
   *   agentId: 'my-agent-001'
   * })
   * ```
   */
  async register(
    signer: TransactionSigner,
    args: {
      agentType: number
      metadataUri: string
      agentId: string
    }
  ): Promise<string> {
    // Derive PDAs
    const [agentAccount] = await deriveAgentPDA(args.agentId, signer.address)
    const [userRegistry] = await deriveUserRegistryPDA(signer.address)
    
    // Create instruction
    const instruction = createRegisterAgentInstruction(
      {
        agentAccount,
        userRegistry,
        signer
      },
      args
    )
    
    // Build and send transaction
    const transaction = await this.buildTransaction([instruction], signer)
    const signature = await this.sendTransaction(transaction, [signer])
    
    return signature
  }
  
  /**
   * Get agent by ID and owner
   */
  async getAgent(
    agentId: string,
    owner: Address
  ): Promise<Agent | null> {
    const [agentPda] = await deriveAgentPDA(agentId, owner)
    
    const accountInfo = await this.connection.getAccountInfo(agentPda)
    if (!accountInfo || !accountInfo.data) {
      return null
    }
    
    return decodeAgent(accountInfo.data)
  }
  
  /**
   * Get all agents for an owner
   */
  async getAgentsByOwner(owner: Address): Promise<Agent[]> {
    // Get user registry to find all agent addresses
    const [registryPda] = await deriveUserRegistryPDA(owner)
    const registryInfo = await this.connection.getAccountInfo(registryPda)
    
    if (!registryInfo || !registryInfo.data) {
      return []
    }
    
    // Decode registry and get agent addresses
    // ... registry decoding logic
    
    // Fetch all agents
    const agents: Agent[] = []
    // ... fetch and decode each agent
    
    return agents
  }
  
  // Private helper methods
  private async buildTransaction(
    instructions: IInstruction[],
    feePayer: TransactionSigner
  ): Promise<Transaction> {
    // Implementation
  }
  
  private async sendTransaction(
    transaction: Transaction,
    signers: TransactionSigner[]
  ): Promise<string> {
    // Implementation
  }
}
```

## Step 7: Complete Usage Example

```typescript
// examples/register-agent-usage.ts
import { GhostSpeakClient } from '@ghostspeak/sdk'
import { generateKeyPair } from '@solana/kit'

async function registerNewAgent() {
  // Initialize client
  const client = new GhostSpeakClient({
    rpcEndpoint: 'https://api.devnet.solana.com',
    commitment: 'confirmed'
  })
  
  // Create wallet (in production, use wallet adapter)
  const wallet = await generateKeyPair()
  
  // Prepare agent metadata
  const metadata = {
    name: 'My AI Assistant',
    description: 'Specialized in smart contract development',
    image: 'ipfs://QmAgentImage',
    attributes: {
      skills: ['Solidity', 'Rust', 'TypeScript'],
      languages: ['en', 'es'],
      availability: '24/7'
    }
  }
  
  // Upload metadata to IPFS (implementation depends on IPFS provider)
  const metadataUri = await uploadToIPFS(metadata)
  
  // Generate unique agent ID
  const agentId = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    // Register the agent
    const signature = await client.agents.register(wallet, {
      agentType: 0, // AI agent
      metadataUri,
      agentId
    })
    
    console.log(`Agent registered successfully!`)
    console.log(`Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`)
    
    // Fetch the created agent
    const agent = await client.agents.getAgent(agentId, wallet.address)
    console.log('Agent details:', agent)
    
  } catch (error) {
    console.error('Failed to register agent:', error)
    
    // Handle specific errors
    if (error.code === 'PROGRAM_ERROR_6000') {
      console.error('Agent ID already exists. Please choose a different ID.')
    }
  }
}

// Run the example
registerNewAgent().catch(console.error)
```

## Step 8: Testing

```typescript
// tests/register-agent.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createRegisterAgentInstruction } from '../src/instructions/agent/register-agent'
import { decodeAgent } from '../src/accounts/agent'
import { mockAddress, mockSigner } from './utils/test-helpers'
import { INSTRUCTION_DISCRIMINATORS } from '../src/constants/discriminators'

describe('Register Agent', () => {
  describe('Instruction Building', () => {
    it('should create valid instruction with all required fields', () => {
      const accounts = {
        agentAccount: mockAddress('agent'),
        userRegistry: mockAddress('registry'),
        signer: mockSigner('owner')
      }
      
      const args = {
        agentType: 0,
        metadataUri: 'ipfs://QmTest',
        agentId: 'test-agent-001'
      }
      
      const instruction = createRegisterAgentInstruction(accounts, args)
      
      // Verify structure
      expect(instruction.programAddress).toBe(GHOSTSPEAK_PROGRAM_ID)
      expect(instruction.accounts).toHaveLength(4)
      expect(instruction.data).toBeInstanceOf(Uint8Array)
      
      // Verify discriminator
      const discriminator = instruction.data.slice(0, 8)
      expect(discriminator).toEqual(INSTRUCTION_DISCRIMINATORS.registerAgent)
    })
    
    it('should validate agent type', () => {
      const accounts = {
        agentAccount: mockAddress('agent'),
        userRegistry: mockAddress('registry'),
        signer: mockSigner('owner')
      }
      
      // Invalid agent type
      expect(() => 
        createRegisterAgentInstruction(accounts, {
          agentType: 99,
          metadataUri: 'ipfs://QmTest',
          agentId: 'test'
        })
      ).toThrow('Invalid agent type')
    })
    
    it('should validate metadata URI format', () => {
      const accounts = {
        agentAccount: mockAddress('agent'),
        userRegistry: mockAddress('registry'),
        signer: mockSigner('owner')
      }
      
      // Invalid URI protocol
      expect(() => 
        createRegisterAgentInstruction(accounts, {
          agentType: 0,
          metadataUri: 'http://invalid.com', // Should be ipfs:// or https://
          agentId: 'test'
        })
      ).toThrow('Metadata URI must start with ipfs://, https://, or ar://')
    })
  })
  
  describe('Account Decoding', () => {
    it('should decode valid agent account', () => {
      // Create test agent data
      const agentData = createTestAgentData({
        owner: mockAddress('owner'),
        agentId: 'test-agent',
        agentType: 0,
        metadataUri: 'ipfs://QmTest'
      })
      
      // Encode and decode
      const encoded = encodeAgent(agentData)
      const decoded = decodeAgent(encoded)
      
      expect(decoded).toEqual(agentData)
    })
    
    it('should reject invalid discriminator', () => {
      const agentData = createTestAgentData()
      const encoded = encodeAgent(agentData)
      
      // Corrupt discriminator
      encoded[0] = 99
      
      const decoded = decodeAgent(encoded)
      expect(decoded).toBeNull()
    })
  })
})
```

## Common Issues and Solutions

### Issue 1: Agent ID Already Exists
```typescript
// Solution: Generate unique IDs
function generateUniqueAgentId(prefix: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  return `${prefix}-${timestamp}-${random}`
}
```

### Issue 2: Transaction Too Large
```typescript
// Solution: Minimize metadata stored on-chain
interface MinimalOnChainData {
  metadataUri: string // Store only IPFS hash
}

interface ExtendedOffChainData {
  // Store all other data on IPFS
  name: string
  description: string
  images: string[]
  attributes: any
}
```

### Issue 3: PDA Derivation Mismatch
```typescript
// Solution: Ensure consistent seed ordering
// ✅ Correct
['agent', agentId, owner]

// ❌ Wrong
['agent', owner, agentId]
```

## Next Steps

1. Implement update agent instruction
2. Add agent verification logic
3. Create agent discovery features
4. Implement reputation system
5. Add agent-to-agent messaging

This complete example demonstrates all aspects of implementing a manual SDK instruction, from type definitions through testing.