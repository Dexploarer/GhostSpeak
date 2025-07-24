# Error Codes Reference

Complete reference for all error codes in the GhostSpeak SDK, including descriptions, common causes, and resolution strategies.

## Table of Contents

1. [Error Code Categories](#error-code-categories)
2. [Network Errors](#network-errors)
3. [Transaction Errors](#transaction-errors)
4. [Account Errors](#account-errors)
5. [Agent Errors](#agent-errors)
6. [Marketplace Errors](#marketplace-errors)
7. [Escrow Errors](#escrow-errors)
8. [Token Errors](#token-errors)
9. [IPFS Errors](#ipfs-errors)
10. [Validation Errors](#validation-errors)
11. [Error Handling Examples](#error-handling-examples)

## Error Code Categories

GhostSpeak error codes are organized into categories for easier debugging:

| Category | Code Range | Description |
|----------|------------|-------------|
| Network | NETWORK_* | Network and RPC errors |
| Transaction | TRANSACTION_* | Transaction processing errors |
| Account | ACCOUNT_* | Account-related errors |
| Agent | AGENT_* | Agent-specific errors |
| Marketplace | MARKET_* | Marketplace operations |
| Escrow | ESCROW_* | Escrow-related errors |
| Token | TOKEN_* | Token and Token 2022 errors |
| IPFS | IPFS_* | IPFS storage errors |
| Validation | VALIDATION_* | Input validation errors |
| System | SYSTEM_* | System-level errors |

## Network Errors

### NETWORK_ERROR

**Description**: General network connectivity issue.

**Common Causes**:
- No internet connection
- RPC endpoint unreachable
- DNS resolution failure

**Resolution**:
```typescript
try {
  await client.agent.list();
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    // Check internet connection
    // Try alternative RPC endpoint
    // Implement retry logic
  }
}
```

### RPC_ERROR

**Description**: RPC-specific error from Solana node.

**Common Causes**:
- Invalid RPC method
- RPC rate limiting
- Node synchronization issues

**Details Structure**:
```typescript
{
  code: 'RPC_ERROR',
  details: {
    rpcCode: -32000,
    rpcMessage: 'Transaction simulation failed',
    logs: ['Program log: Error...']
  }
}
```

### TIMEOUT

**Description**: Operation exceeded time limit.

**Common Causes**:
- Slow network connection
- RPC node overloaded
- Transaction stuck in mempool

**Resolution**:
```typescript
const config = {
  transactionTimeout: 60000, // Increase timeout
  retryConfig: {
    maxRetries: 5
  }
};
```

### RATE_LIMITED

**Description**: Too many requests to RPC or API.

**Details Structure**:
```typescript
{
  code: 'RATE_LIMITED',
  details: {
    retryAfter: 60000, // milliseconds
    limit: 100,
    window: '1m'
  }
}
```

## Transaction Errors

### TRANSACTION_FAILED

**Description**: Transaction execution failed on-chain.

**Common Causes**:
- Program error
- Insufficient compute units
- Account state changed

**Details Structure**:
```typescript
{
  code: 'TRANSACTION_FAILED',
  details: {
    signature: '5xY7...',
    logs: ['Program log: Custom error 0x1'],
    programError: 'InsufficientFunds'
  }
}
```

### INSUFFICIENT_FUNDS

**Description**: Not enough SOL or tokens for operation.

**Common Causes**:
- Insufficient SOL for fees
- Insufficient token balance
- Rent-exempt requirement not met

**Details Structure**:
```typescript
{
  code: 'INSUFFICIENT_FUNDS',
  details: {
    required: 10000000, // lamports
    available: 5000000,
    currency: 'SOL'
  }
}
```

**Resolution**:
```typescript
// Check balance before operation
const balance = await rpc.getBalance(address).send();
if (balance.value < requiredAmount) {
  // Request airdrop on devnet
  // Or prompt user to add funds
}
```

### SIGNATURE_VERIFICATION_FAILED

**Description**: Transaction signature verification failed.

**Common Causes**:
- Wrong keypair used
- Transaction tampered
- Signer not authorized

### BLOCKHASH_NOT_FOUND

**Description**: Transaction blockhash expired or invalid.

**Common Causes**:
- Transaction took too long to submit
- Network congestion
- Clock drift

**Resolution**:
```typescript
// Get fresh blockhash
const { value: { blockhash } } = await rpc.getLatestBlockhash().send();
// Rebuild and sign transaction
```

## Account Errors

### ACCOUNT_NOT_FOUND

**Description**: Requested account does not exist.

**Common Causes**:
- Account not initialized
- Wrong address
- Account closed

**Details Structure**:
```typescript
{
  code: 'ACCOUNT_NOT_FOUND',
  details: {
    address: '7EqQ...',
    accountType: 'Agent'
  }
}
```

### ACCOUNT_ALREADY_EXISTS

**Description**: Trying to create account that already exists.

**Common Causes**:
- Duplicate registration
- PDA collision
- Race condition

**Resolution**:
```typescript
// Check if account exists first
const existing = await client.agent.getAccount(address);
if (existing) {
  // Use existing account
} else {
  // Create new account
}
```

### INVALID_ACCOUNT_DATA

**Description**: Account data is corrupted or invalid.

**Common Causes**:
- Version mismatch
- Data corruption
- Wrong account type

**Details Structure**:
```typescript
{
  code: 'INVALID_ACCOUNT_DATA',
  details: {
    address: '7EqQ...',
    expectedType: 'Agent',
    actualDiscriminator: [1, 2, 3, 4, 5, 6, 7, 8]
  }
}
```

### ACCOUNT_NOT_INITIALIZED

**Description**: Account exists but not initialized.

**Common Causes**:
- Initialization transaction failed
- Account in intermediate state

## Agent Errors

### AGENT_NOT_FOUND

**Description**: Agent account does not exist.

**Common Causes**:
- Invalid agent address
- Agent not registered
- Agent account closed

### AGENT_ALREADY_EXISTS

**Description**: Agent already registered for address.

**Common Causes**:
- Attempting duplicate registration
- One agent per address limit

**Resolution**:
```typescript
// Get existing agent instead
const agent = await client.agent.getByOwner(owner);
if (agent) {
  // Update existing agent
  await client.agent.update(signer, agent.address, updates);
}
```

### AGENT_NOT_ACTIVE

**Description**: Agent is not active for operations.

**Common Causes**:
- Agent deactivated
- Agent suspended
- Agent at capacity

**Details Structure**:
```typescript
{
  code: 'AGENT_NOT_ACTIVE',
  details: {
    agent: '7EqQ...',
    status: 'suspended',
    reason: 'Policy violation'
  }
}
```

### INVALID_AGENT_STATUS

**Description**: Invalid status transition attempted.

**Common Causes**:
- Trying to activate banned agent
- Invalid status value
- Permission denied

### AGENT_CAPABILITY_MISMATCH

**Description**: Agent lacks required capabilities.

**Common Causes**:
- Job requires specific skills
- Agent capabilities changed
- Requirements not met

## Marketplace Errors

### SERVICE_NOT_FOUND

**Description**: Service listing does not exist.

**Common Causes**:
- Invalid service ID
- Service deleted
- Service expired

### JOB_NOT_FOUND

**Description**: Job posting does not exist.

**Common Causes**:
- Invalid job ID
- Job closed
- Job cancelled

### WORK_ORDER_NOT_FOUND

**Description**: Work order does not exist.

**Common Causes**:
- Invalid work order ID
- Work order not created yet

### INVALID_PRICING_MODEL

**Description**: Pricing configuration is invalid.

**Common Causes**:
- Negative prices
- Invalid tier structure
- Missing required fields

**Details Structure**:
```typescript
{
  code: 'INVALID_PRICING_MODEL',
  details: {
    field: 'tiers[0].price',
    value: -1000,
    reason: 'Price must be positive'
  }
}
```

### APPLICATION_ALREADY_EXISTS

**Description**: Already applied to this job.

**Common Causes**:
- Duplicate application
- Application limit reached

### WORK_ORDER_ALREADY_COMPLETE

**Description**: Work order is already completed.

**Common Causes**:
- Trying to update completed order
- Duplicate completion attempt

## Escrow Errors

### ESCROW_NOT_FOUND

**Description**: Escrow account does not exist.

**Common Causes**:
- Invalid escrow address
- Escrow not created
- Escrow closed

### ESCROW_ALREADY_RELEASED

**Description**: Escrow funds already released.

**Common Causes**:
- Duplicate release attempt
- Escrow fully disbursed

**Details Structure**:
```typescript
{
  code: 'ESCROW_ALREADY_RELEASED',
  details: {
    escrow: '7EqQ...',
    totalAmount: 100000000,
    releasedAmount: 100000000
  }
}
```

### ESCROW_DISPUTED

**Description**: Escrow is under dispute.

**Common Causes**:
- Active dispute blocks release
- Awaiting arbitration

**Resolution**:
```typescript
// Check dispute status
const dispute = await client.dispute.getByEscrow(escrow);
if (dispute && dispute.status === 'resolved') {
  // Can proceed with release
}
```

### MILESTONE_NOT_FOUND

**Description**: Milestone does not exist in escrow.

**Common Causes**:
- Invalid milestone ID
- No milestones defined

### ESCROW_EXPIRED

**Description**: Escrow passed expiry time.

**Common Causes**:
- Work not completed in time
- Escrow timeout reached

### INSUFFICIENT_ESCROW_BALANCE

**Description**: Not enough funds in escrow.

**Common Causes**:
- Partial release exceeded balance
- Fee calculation error

## Token Errors

### INVALID_MINT

**Description**: Token mint address is invalid.

**Common Causes**:
- Not a valid mint account
- Wrong token program
- Mint not initialized

### TOKEN_ACCOUNT_NOT_FOUND

**Description**: Token account does not exist.

**Common Causes**:
- ATA not created
- Wrong token account address

**Resolution**:
```typescript
// Create ATA if needed
const ata = await deriveAssociatedTokenAddress({
  mint,
  owner
});

const account = await getOrCreateAssociatedTokenAccount(
  connection,
  payer,
  mint,
  owner
);
```

### INSUFFICIENT_TOKEN_BALANCE

**Description**: Not enough tokens for operation.

**Details Structure**:
```typescript
{
  code: 'INSUFFICIENT_TOKEN_BALANCE',
  details: {
    mint: 'EPjF...',
    required: 1000000000,
    available: 500000000,
    decimals: 9
  }
}
```

### TRANSFER_FEE_EXCEEDED

**Description**: Token 2022 transfer fee too high.

**Common Causes**:
- Fee increased beyond slippage
- Maximum fee exceeded

**Details Structure**:
```typescript
{
  code: 'TRANSFER_FEE_EXCEEDED',
  details: {
    expectedFee: 1000000,
    actualFee: 1500000,
    maxSlippage: 100 // basis points
  }
}
```

### TOKEN_ACCOUNT_FROZEN

**Description**: Token account is frozen.

**Common Causes**:
- Compliance freeze
- Security freeze

### INVALID_TOKEN_PROGRAM

**Description**: Wrong token program for mint.

**Common Causes**:
- Using Token program for Token 2022 mint
- Program mismatch

## IPFS Errors

### IPFS_UPLOAD_FAILED

**Description**: Failed to upload content to IPFS.

**Common Causes**:
- IPFS node unavailable
- Content too large
- Network timeout

**Details Structure**:
```typescript
{
  code: 'IPFS_UPLOAD_FAILED',
  details: {
    provider: 'infura',
    size: 10485760,
    error: 'Request timeout'
  }
}
```

### IPFS_RETRIEVE_FAILED

**Description**: Failed to retrieve content from IPFS.

**Common Causes**:
- Content not found
- Gateway timeout
- Invalid hash

### IPFS_PIN_FAILED

**Description**: Failed to pin content.

**Common Causes**:
- Pinning service error
- Quota exceeded
- Invalid credentials

### CONTENT_TOO_LARGE

**Description**: Content exceeds size limit.

**Details Structure**:
```typescript
{
  code: 'CONTENT_TOO_LARGE',
  details: {
    size: 104857600,
    maxSize: 52428800,
    suggestion: 'Split into multiple files'
  }
}
```

## Validation Errors

### INVALID_PARAMETERS

**Description**: Invalid input parameters.

**Common Causes**:
- Missing required fields
- Invalid field values
- Type mismatch

**Details Structure**:
```typescript
{
  code: 'INVALID_PARAMETERS',
  details: {
    field: 'name',
    value: '',
    reason: 'Name is required',
    validation: {
      minLength: 1,
      maxLength: 64
    }
  }
}
```

### VALIDATION_FAILED

**Description**: Input validation failed.

**Common Causes**:
- Schema validation failure
- Business rule violation

### PERMISSION_DENIED

**Description**: Not authorized for operation.

**Common Causes**:
- Not owner of resource
- Insufficient privileges
- Role mismatch

**Details Structure**:
```typescript
{
  code: 'PERMISSION_DENIED',
  details: {
    operation: 'updateAgent',
    required: 'owner',
    actual: 'viewer'
  }
}
```

### INVALID_ADDRESS

**Description**: Invalid Solana address format.

**Common Causes**:
- Not base58 encoded
- Wrong length
- Invalid characters

### VALUE_OUT_OF_RANGE

**Description**: Numeric value outside valid range.

**Details Structure**:
```typescript
{
  code: 'VALUE_OUT_OF_RANGE',
  details: {
    field: 'price',
    value: -100,
    min: 0,
    max: Number.MAX_SAFE_INTEGER
  }
}
```

## Error Handling Examples

### Comprehensive Error Handler

```typescript
async function handleOperation() {
  try {
    await riskyOperation();
  } catch (error) {
    if (!isGhostSpeakError(error)) {
      console.error('Unknown error:', error);
      return;
    }
    
    switch (error.code) {
      // Network errors - retry
      case 'NETWORK_ERROR':
      case 'TIMEOUT':
        return retryWithBackoff(() => riskyOperation());
      
      // Insufficient funds - prompt user
      case 'INSUFFICIENT_FUNDS':
        const { required, available } = error.details;
        return promptAddFunds(required - available);
      
      // Not found - create
      case 'ACCOUNT_NOT_FOUND':
        return createAccount();
      
      // Already exists - update
      case 'ACCOUNT_ALREADY_EXISTS':
        return updateExisting(error.details.address);
      
      // Permission denied - check auth
      case 'PERMISSION_DENIED':
        return checkAuthorization();
      
      // Validation - fix input
      case 'INVALID_PARAMETERS':
        return fixValidation(error.details);
      
      // Rate limited - wait
      case 'RATE_LIMITED':
        await sleep(error.details.retryAfter);
        return retryOperation();
      
      default:
        console.error('Unhandled error:', error);
        throw error;
    }
  }
}
```

### Error Recovery Strategies

```typescript
class ErrorRecovery {
  async recover(error: GhostSpeakError): Promise<boolean> {
    const strategies = {
      // Network recovery
      'NETWORK_ERROR': async () => {
        await this.switchRpcEndpoint();
        return true;
      },
      
      // Transaction recovery
      'TRANSACTION_FAILED': async () => {
        const logs = error.details?.logs;
        if (logs?.includes('compute budget exceeded')) {
          await this.increaseComputeBudget();
          return true;
        }
        return false;
      },
      
      // Account recovery
      'INVALID_ACCOUNT_DATA': async () => {
        await this.migrateAccount(error.details.address);
        return true;
      },
      
      // Token recovery
      'TOKEN_ACCOUNT_NOT_FOUND': async () => {
        await this.createTokenAccount(error.details);
        return true;
      }
    };
    
    const strategy = strategies[error.code];
    return strategy ? await strategy() : false;
  }
}
```

### Error Monitoring

```typescript
class ErrorMonitor {
  private errors: Map<string, number> = new Map();
  
  track(error: GhostSpeakError) {
    const count = this.errors.get(error.code) || 0;
    this.errors.set(error.code, count + 1);
    
    // Alert on threshold
    if (count > 10) {
      this.alert(`High error rate for ${error.code}`);
    }
    
    // Log to monitoring service
    this.log({
      code: error.code,
      timestamp: Date.now(),
      details: error.details,
      context: error.context
    });
  }
  
  getStats() {
    return Array.from(this.errors.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);
  }
}
```

## Custom Error Codes

You can extend error codes for your application:

```typescript
// Define custom error codes
enum CustomErrorCode {
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE'
}

// Create custom error
class CustomError extends GhostSpeakError {
  constructor(
    code: CustomErrorCode,
    message: string,
    details?: any
  ) {
    super(code as any, message, details);
  }
}

// Use custom errors
throw new CustomError(
  CustomErrorCode.BUSINESS_RULE_VIOLATION,
  'Agent must have at least 3 capabilities',
  { capabilities: agent.capabilities }
);
```