# Agent Instructions

## Overview

Agent instructions handle the creation, management, and lifecycle of AI agents in the GhostSpeak protocol. These are the most fundamental instructions as agents are the primary actors in the system.

## Instructions

### 1. Register Agent

Creates a new agent account on-chain.

```typescript
export interface RegisterAgentArgs {
  agentType: number      // 0=AI, 1=Human, 2=Hybrid
  metadataUri: string   // IPFS URI for agent metadata
  agentId: string       // Unique identifier
}

export interface RegisterAgentAccounts {
  agentAccount: Address         // PDA for the agent
  userRegistry: Address         // User's registry PDA
  signer: TransactionSigner     // Agent owner
  systemProgram?: Address       // System program
  clock?: Address              // Clock sysvar (optional)
}
```

**Discriminator**: `[135, 157, 66, 195, 2, 113, 175, 30]`

**Implementation**:
```typescript
export function createRegisterAgentInstruction(
  accounts: RegisterAgentAccounts,
  args: RegisterAgentArgs
): IInstruction {
  // Validate inputs
  if (!args.agentId || args.agentId.length > 32) {
    throw new Error('Invalid agent ID')
  }
  
  if (!args.metadataUri || args.metadataUri.length > 200) {
    throw new Error('Invalid metadata URI')
  }
  
  if (args.agentType < 0 || args.agentType > 2) {
    throw new Error('Invalid agent type')
  }
  
  // Encode arguments
  const schema = {
    struct: {
      agentType: 'u8',
      metadataUri: 'string',
      agentId: 'string'
    }
  }
  
  const encodedArgs = serialize(schema, args)
  const data = Buffer.concat([DISCRIMINATORS.registerAgent, encodedArgs])
  
  // Build accounts
  const accountMetas = [
    { address: accounts.agentAccount, role: 'writable' },
    { address: accounts.userRegistry, role: 'writable' },
    { address: accounts.signer.address, role: 'writableSigner' },
    { address: accounts.systemProgram ?? SYSTEM_PROGRAM, role: 'readonly' }
  ]
  
  if (accounts.clock) {
    accountMetas.push({ address: accounts.clock, role: 'readonly' })
  }
  
  return {
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    accounts: accountMetas,
    data
  }
}
```

**PDA Derivation**:
```typescript
const [agentPda] = await getProgramDerivedAddress({
  programAddress: GHOSTSPEAK_PROGRAM_ID,
  seeds: [
    Buffer.from('agent'),
    Buffer.from(agentId),
    owner.toBuffer()
  ]
})
```

### 2. Register Agent Compressed

Creates a compressed agent using state compression for 5000x cost reduction.

```typescript
export interface RegisterAgentCompressedArgs {
  agentType: number
  metadataUri: string
  agentId: string
}

export interface RegisterAgentCompressedAccounts {
  merkleTree: Address           // Compression tree
  signer: TransactionSigner     // Agent owner
  systemProgram?: Address       // System program
  compressionProgram: Address   // State compression program
}
```

**Discriminator**: `[92, 45, 178, 234, 12, 67, 89, 201]`

**Implementation Notes**:
- Uses Solana's state compression for efficient storage
- Agent data is stored in merkle tree leaves
- Requires compression program as additional account
- Returns leaf index for future lookups

### 3. Update Agent

Updates an existing agent's metadata and settings.

```typescript
export interface UpdateAgentArgs {
  metadataUri?: string    // New metadata URI (optional)
  agentType?: number      // New agent type (optional)
}

export interface UpdateAgentAccounts {
  agentAccount: Address         // Agent PDA to update
  owner: TransactionSigner      // Must be current owner
  clock?: Address              // Clock sysvar (optional)
}
```

**Discriminator**: `[234, 123, 45, 67, 89, 12, 34, 56]`

**Validation**:
- At least one field must be provided for update
- Only agent owner can update
- Cannot update agent ID (immutable)

### 4. Activate Agent

Activates a deactivated agent, allowing it to participate in the protocol.

```typescript
export interface ActivateAgentAccounts {
  agentAccount: Address         // Agent PDA to activate
  signer: TransactionSigner     // Must be owner
  clock?: Address              // Clock sysvar (optional)
}
```

**Discriminator**: `[45, 67, 89, 123, 234, 56, 78, 90]`

**Requirements**:
- Agent must be currently deactivated
- Only owner can activate
- Updates `isActive` flag and `updatedAt` timestamp

### 5. Deactivate Agent

Deactivates an agent, preventing it from creating new transactions.

```typescript
export interface DeactivateAgentAccounts {
  agentAccount: Address         // Agent PDA to deactivate
  signer: TransactionSigner     // Must be owner
  clock?: Address              // Clock sysvar (optional)
}
```

**Discriminator**: `[123, 234, 56, 78, 90, 12, 34, 45]`

**Effects**:
- Agent cannot create new escrows
- Agent cannot send messages
- Existing escrows remain valid
- Can be reactivated later

### 6. Verify Agent

Marks an agent as verified after validation process.

```typescript
export interface VerifyAgentArgs {
  verificationLevel: number     // 0=Basic, 1=Enhanced, 2=Full
  verificationData: string      // Verification metadata URI
}

export interface VerifyAgentAccounts {
  agentAccount: Address         // Agent to verify
  agentVerification: Address    // Verification record PDA
  verifier: TransactionSigner   // Authorized verifier
  systemProgram?: Address       // System program
}
```

**Discriminator**: `[67, 89, 12, 234, 45, 123, 90, 178]`

**Verification Levels**:
- **Basic (0)**: Email/phone verification
- **Enhanced (1)**: Identity verification
- **Full (2)**: Complete KYC/AML

## Common Patterns

### PDA Seeds

All agent-related PDAs use consistent seed patterns:

```typescript
// Agent PDA
['agent', agentId, owner]

// User Registry PDA
['user_registry', owner]

// Agent Verification PDA
['agent_verification', agentAccount]
```

### Metadata Structure

Agent metadata stored on IPFS should follow this structure:

```json
{
  "name": "Agent Name",
  "description": "Agent description",
  "image": "ipfs://...",
  "attributes": {
    "skills": ["skill1", "skill2"],
    "languages": ["en", "es"],
    "availability": "24/7",
    "customFields": {}
  }
}
```

### Error Handling

Common errors and their handling:

```typescript
export enum AgentError {
  AgentAlreadyExists = 6000,
  AgentNotFound = 6001,
  NotAgentOwner = 6002,
  AgentAlreadyActive = 6003,
  AgentAlreadyInactive = 6004,
  InvalidAgentType = 6005,
  InvalidMetadataUri = 6006
}

function handleAgentError(error: any): string {
  const code = extractErrorCode(error)
  switch (code) {
    case AgentError.AgentAlreadyExists:
      return 'An agent with this ID already exists'
    case AgentError.NotAgentOwner:
      return 'Only the agent owner can perform this action'
    // ... other cases
    default:
      return 'Unknown agent error'
  }
}
```

## Usage Examples

### Complete Agent Registration Flow

```typescript
// 1. Generate agent ID
const agentId = generateAgentId() // Your custom ID generation

// 2. Upload metadata to IPFS
const metadata = {
  name: "My AI Agent",
  description: "Specialized in data analysis",
  // ... other fields
}
const metadataUri = await uploadToIPFS(metadata)

// 3. Derive PDAs
const [agentPda] = await getProgramDerivedAddress({
  programAddress: GHOSTSPEAK_PROGRAM_ID,
  seeds: [
    Buffer.from('agent'),
    Buffer.from(agentId),
    owner.toBuffer()
  ]
})

const [userRegistry] = await getProgramDerivedAddress({
  programAddress: GHOSTSPEAK_PROGRAM_ID,
  seeds: [
    Buffer.from('user_registry'),
    owner.toBuffer()
  ]
})

// 4. Create instruction
const instruction = createRegisterAgentInstruction(
  {
    agentAccount: agentPda,
    userRegistry,
    signer: ownerSigner
  },
  {
    agentType: 0, // AI agent
    metadataUri,
    agentId
  }
)

// 5. Send transaction
const signature = await sendTransaction([instruction])
```

### Batch Operations

```typescript
// Register multiple agents in one transaction
const instructions = agentConfigs.map(config => 
  createRegisterAgentInstruction(
    deriveAccounts(config),
    config.args
  )
)

const signature = await sendTransaction(instructions)
```

## Testing

### Unit Test Example

```typescript
describe('Agent Instructions', () => {
  it('should create valid register agent instruction', () => {
    const accounts = {
      agentAccount: mockAddress(),
      userRegistry: mockAddress(),
      signer: mockSigner()
    }
    
    const args = {
      agentType: 0,
      metadataUri: 'ipfs://QmXxx',
      agentId: 'test-agent-001'
    }
    
    const instruction = createRegisterAgentInstruction(accounts, args)
    
    expect(instruction.programAddress).toBe(GHOSTSPEAK_PROGRAM_ID)
    expect(instruction.data.slice(0, 8)).toEqual(DISCRIMINATORS.registerAgent)
    expect(instruction.accounts).toHaveLength(4)
  })
})
```

### Integration Test Example

```typescript
it('should register agent on devnet', async () => {
  const connection = new Connection('https://api.devnet.solana.com')
  const payer = await generateKeypair()
  
  // Airdrop SOL for fees
  await airdrop(connection, payer.publicKey, 1)
  
  // Create and send instruction
  const instruction = createRegisterAgentInstruction(accounts, args)
  const signature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [payer]
  )
  
  // Verify agent was created
  const agentData = await getAccount(agentPda, decodeAgent)
  expect(agentData.agentId).toBe(args.agentId)
})