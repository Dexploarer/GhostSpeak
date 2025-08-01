# Escrow Instructions

## Overview

Escrow instructions manage secure payment transactions between agents. The escrow system ensures that funds are only released when both parties fulfill their obligations, with built-in dispute resolution mechanisms.

## Core Instructions

### 1. Create Escrow

Initializes a new escrow account with locked funds.

```typescript
export interface CreateEscrowArgs {
  amount: bigint              // Amount in lamports
  recipient: Address          // Recipient address
  expiresAt: bigint          // Unix timestamp for expiration
  description: string         // Escrow description
}

export interface CreateEscrowAccounts {
  escrow: Address                   // Escrow PDA (to be created)
  payer: TransactionSigner          // Funds provider
  recipient: Address                // Funds recipient
  systemProgram?: Address           // System program
  clock?: Address                   // Clock sysvar
}
```

**Discriminator**: `[195, 28, 84, 174, 45, 89, 123, 234]`

**Implementation**:
```typescript
export function createCreateEscrowInstruction(
  accounts: CreateEscrowAccounts,
  args: CreateEscrowArgs
): IInstruction {
  // Validate amount
  if (args.amount <= 0n) {
    throw new Error('Escrow amount must be greater than 0')
  }
  
  // Validate expiration
  const now = BigInt(Date.now() / 1000)
  if (args.expiresAt <= now) {
    throw new Error('Expiration must be in the future')
  }
  
  // Encode arguments
  const schema = {
    struct: {
      amount: 'u64',
      recipient: 'publicKey',
      expiresAt: 'i64',
      description: 'string'
    }
  }
  
  const encodedArgs = serialize(schema, args)
  const data = Buffer.concat([DISCRIMINATORS.createEscrow, encodedArgs])
  
  // Build accounts
  const accountMetas = [
    { address: accounts.escrow, role: 'writable' },
    { address: accounts.payer.address, role: 'writableSigner' },
    { address: accounts.recipient, role: 'readonly' },
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
const escrowId = generateEscrowId() // Unique ID generation

const [escrowPda] = await getProgramDerivedAddress({
  programAddress: GHOSTSPEAK_PROGRAM_ID,
  seeds: [
    Buffer.from('escrow'),
    Buffer.from(escrowId),
    payer.toBuffer()
  ]
})
```

### 2. Complete Escrow

Releases escrowed funds to the recipient upon successful completion.

```typescript
export interface CompleteEscrowAccounts {
  escrow: Address                   // Escrow account
  payer: Address                    // Original payer
  recipient: TransactionSigner      // Recipient (must sign)
  systemProgram?: Address           // System program
}
```

**Discriminator**: `[89, 123, 234, 56, 78, 90, 12, 34]`

**Requirements**:
- Escrow must be active (not completed/cancelled)
- Recipient must sign the transaction
- Escrow must not be expired

### 3. Cancel Escrow

Returns escrowed funds to the payer if conditions aren't met.

```typescript
export interface CancelEscrowAccounts {
  escrow: Address                   // Escrow account
  payer: TransactionSigner          // Original payer (must sign)
  systemProgram?: Address           // System program
}
```

**Discriminator**: `[234, 56, 78, 90, 123, 45, 67, 89]`

**Conditions for Cancellation**:
- Only payer can cancel before completion
- Escrow must be expired OR
- Dispute must be resolved in payer's favor

### 4. Dispute Escrow

Initiates a dispute resolution process for contested escrows.

```typescript
export interface DisputeEscrowArgs {
  reason: string                    // Dispute reason
  evidence: string                  // Evidence URI (IPFS)
}

export interface DisputeEscrowAccounts {
  escrow: Address                   // Escrow account
  disputeCase: Address              // Dispute case PDA (to create)
  initiator: TransactionSigner      // Dispute initiator
  systemProgram?: Address           // System program
}
```

**Discriminator**: `[123, 45, 67, 89, 234, 56, 78, 90]`

**Dispute Process**:
1. Either party can initiate dispute
2. Evidence submission period begins
3. Arbitrator reviews case
4. Resolution determines fund distribution

### 5. Process Escrow Payment

Handles complex multi-party escrow payments with fee distribution.

```typescript
export interface ProcessEscrowPaymentArgs {
  platformFeePercent: number        // Platform fee (basis points)
  arbitratorFeePercent?: number     // Optional arbitrator fee
}

export interface ProcessEscrowPaymentAccounts {
  escrow: Address                   // Escrow account
  payment: Address                  // Payment record PDA
  payer: Address                    // Original payer
  recipient: Address                // Recipient
  platformFeeAccount: Address       // Platform fee collector
  arbitrator?: Address              // Optional arbitrator
  signer: TransactionSigner         // Authorized signer
  systemProgram?: Address           // System program
}
```

**Discriminator**: `[45, 67, 89, 123, 234, 12, 34, 56]`

**Fee Calculation**:
```typescript
const platformFee = (amount * platformFeePercent) / 10000n
const arbitratorFee = arbitrator ? (amount * arbitratorFeePercent) / 10000n : 0n
const recipientAmount = amount - platformFee - arbitratorFee
```

### 6. Process Partial Refund

Enables partial refunds for escrows with mixed outcomes.

```typescript
export interface ProcessPartialRefundArgs {
  refundAmount: bigint              // Amount to refund
  reason: string                    // Refund reason
}

export interface ProcessPartialRefundAccounts {
  escrow: Address                   // Escrow account
  payer: Address                    // Original payer
  recipient: TransactionSigner      // Must approve refund
  systemProgram?: Address           // System program
}
```

**Discriminator**: `[178, 90, 12, 234, 45, 67, 89, 123]`

**Validation**:
- Refund amount must be less than escrow amount
- Both parties must agree (recipient signs)
- Updates escrow to reflect partial completion

## Advanced Features

### Milestone-Based Escrows

Support for multi-milestone project escrows:

```typescript
export interface MilestoneEscrow {
  totalAmount: bigint
  milestones: Milestone[]
  currentMilestone: number
}

export interface Milestone {
  amount: bigint
  description: string
  deliverables: string[]
  dueDate: bigint
  status: MilestoneStatus
}

export enum MilestoneStatus {
  Pending = 0,
  InProgress = 1,
  Submitted = 2,
  Approved = 3,
  Disputed = 4
}
```

### Escrow Templates

Pre-defined escrow configurations:

```typescript
export const ESCROW_TEMPLATES = {
  hourlyWork: {
    expirationDays: 7,
    platformFeePercent: 250, // 2.5%
    allowPartialRefund: true,
    requiresApproval: true
  },
  
  fixedProject: {
    expirationDays: 30,
    platformFeePercent: 500, // 5%
    allowPartialRefund: false,
    requiresApproval: true
  },
  
  subscription: {
    expirationDays: 31,
    platformFeePercent: 300, // 3%
    allowPartialRefund: false,
    requiresApproval: false
  }
}
```

## State Management

### Escrow States

```typescript
export enum EscrowStatus {
  Active = 0,
  Completed = 1,
  Cancelled = 2,
  Disputed = 3,
  PartiallyRefunded = 4,
  Expired = 5
}
```

### State Transitions

```
Active → Completed (via completeEscrow)
Active → Cancelled (via cancelEscrow)
Active → Disputed (via disputeEscrow)
Active → Expired (automatic via time)
Disputed → Completed (via arbitration)
Disputed → Cancelled (via arbitration)
Active → PartiallyRefunded (via processPartialRefund)
```

## Error Handling

### Common Escrow Errors

```typescript
export enum EscrowError {
  InsufficientFunds = 6100,
  EscrowExpired = 6101,
  EscrowNotActive = 6102,
  UnauthorizedAccess = 6103,
  InvalidAmount = 6104,
  DisputeActive = 6105,
  InvalidRecipient = 6106
}

export function formatEscrowError(error: any): string {
  const code = extractErrorCode(error)
  const errorMessages: Record<number, string> = {
    [EscrowError.InsufficientFunds]: 'Insufficient funds for escrow',
    [EscrowError.EscrowExpired]: 'This escrow has expired',
    [EscrowError.EscrowNotActive]: 'Escrow is not in active state',
    [EscrowError.UnauthorizedAccess]: 'You are not authorized for this action',
    [EscrowError.InvalidAmount]: 'Invalid escrow amount',
    [EscrowError.DisputeActive]: 'Cannot perform action while dispute is active',
    [EscrowError.InvalidRecipient]: 'Invalid recipient address'
  }
  
  return errorMessages[code] || 'Unknown escrow error'
}
```

## Usage Examples

### Basic Escrow Flow

```typescript
// 1. Create escrow
const escrowId = generateId()
const [escrowPda] = await deriveEscrowAddress(escrowId, payer)

const createIx = createCreateEscrowInstruction(
  {
    escrow: escrowPda,
    payer: payerSigner,
    recipient: recipientAddress
  },
  {
    amount: 1_000_000_000n, // 1 SOL
    recipient: recipientAddress,
    expiresAt: BigInt(Date.now() / 1000 + 86400 * 7), // 7 days
    description: "Website development project"
  }
)

// 2. Complete escrow (after work is done)
const completeIx = createCompleteEscrowInstruction({
  escrow: escrowPda,
  payer: payerAddress,
  recipient: recipientSigner
})

// 3. Or cancel if needed
const cancelIx = createCancelEscrowInstruction({
  escrow: escrowPda,
  payer: payerSigner
})
```

### Escrow with Dispute Resolution

```typescript
// 1. Create dispute
const [disputePda] = await deriveDisputeAddress(escrowPda)

const disputeIx = createDisputeEscrowInstruction(
  {
    escrow: escrowPda,
    disputeCase: disputePda,
    initiator: initiatorSigner
  },
  {
    reason: "Work not completed as specified",
    evidence: "ipfs://QmEvidence123"
  }
)

// 2. Submit evidence (both parties)
const evidenceIx = createSubmitEvidenceInstruction(
  {
    disputeCase: disputePda,
    submitter: submitterSigner
  },
  {
    evidence: "ipfs://QmMyEvidence",
    description: "Proof of work completion"
  }
)

// 3. Arbitrator resolves
const resolveIx = createResolveDisputeInstruction(
  {
    disputeCase: disputePda,
    escrow: escrowPda,
    arbitrator: arbitratorSigner
  },
  {
    decision: DisputeDecision.FavorRecipient,
    reasoning: "Evidence shows work was completed"
  }
)
```

## Best Practices

### 1. Expiration Times
- Set reasonable expiration times
- Consider work complexity when setting deadlines
- Allow buffer for dispute resolution

### 2. Fee Structure
- Keep platform fees transparent
- Consider volume discounts
- Separate arbitration fees

### 3. Dispute Prevention
- Clear escrow descriptions
- Defined deliverables
- Milestone-based releases for large projects

### 4. Security
- Always validate amounts
- Check authorization properly
- Prevent double-spending

## Testing

### Unit Tests

```typescript
describe('Escrow Instructions', () => {
  it('should create escrow with correct data', () => {
    const instruction = createCreateEscrowInstruction(accounts, args)
    
    const decodedData = decodeEscrowData(instruction.data)
    expect(decodedData.amount).toBe(args.amount)
    expect(decodedData.recipient).toBe(args.recipient)
  })
  
  it('should fail with invalid amount', () => {
    expect(() => 
      createCreateEscrowInstruction(accounts, { ...args, amount: 0n })
    ).toThrow('Escrow amount must be greater than 0')
  })
})
```

### Integration Tests

```typescript
it('should complete full escrow lifecycle', async () => {
  // Create
  const createTx = await sendTransaction([createIx])
  await confirmTransaction(createTx)
  
  // Verify state
  const escrow = await getEscrowAccount(escrowPda)
  expect(escrow.status).toBe(EscrowStatus.Active)
  
  // Complete
  const completeTx = await sendTransaction([completeIx])
  await confirmTransaction(completeTx)
  
  // Verify completion
  const completed = await getEscrowAccount(escrowPda)
  expect(completed.status).toBe(EscrowStatus.Completed)
})