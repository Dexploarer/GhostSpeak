# Token 2022 Integration

The GhostSpeak SDK provides comprehensive support for SPL Token 2022 (Token Extensions) features, enabling advanced token functionality for payments, escrow, and rewards.

## Overview

Token 2022 introduces powerful extensions like transfer fees, confidential transfers, and interest-bearing tokens. The SDK seamlessly handles these features across all operations.

```typescript
import { 
  TokenProgram,
  deriveToken2022AssociatedTokenAddress,
  detectTokenProgram,
  calculateTransferFee
} from '@ghostspeak/sdk';
```

## Token Program Detection

### Automatic Detection

```typescript
// Automatically detect if a mint uses Token or Token 2022
const tokenProgram = await client.escrow.detectTokenProgram(mintAddress);

if (tokenProgram === TokenProgram.Token2022) {
  console.log("This mint uses Token 2022");
  
  // Get token info with extensions
  const tokenInfo = await client.getToken2022Info(mintAddress);
  console.log("Extensions:", tokenInfo.extensions);
}
```

### Manual Program Selection

```typescript
// Explicitly specify Token 2022
const escrow = await client.escrow.create(signer, {
  workOrder: workOrderAddress,
  amount: 1000000000, // 1 token
  mint: token2022MintAddress,
  tokenProgram: TokenProgram.Token2022, // Force Token 2022
  recipient: agentAddress
});
```

## Transfer Fees

### Calculate Transfer Fees

```typescript
// Get transfer fee configuration
const feeConfig = await client.getTransferFeeConfig(mintAddress);

console.log("Fee basis points:", feeConfig.feeBasisPoints); // e.g., 100 = 1%
console.log("Max fee:", feeConfig.maximumFee);

// Calculate fee for amount
const amount = 1000000000n; // 1 token
const fee = calculateTransferFee(amount, feeConfig);

console.log("Transfer amount:", amount);
console.log("Fee:", fee);
console.log("Total needed:", amount + fee);
```

### Handle Transfer Fees in Escrow

```typescript
// Create escrow accounting for transfer fees
const escrowWithFees = await client.escrow.create(signer, {
  workOrder: workOrderAddress,
  amount: 1000000000, // Desired net amount
  mint: feeTokenMint,
  tokenProgram: TokenProgram.Token2022,
  expectTransferFees: true,
  maxFeeSlippage: 100, // Allow up to 1% fee
  
  // SDK automatically calculates gross amount needed
  // to ensure recipient receives exact net amount
});

// Get escrow details
const details = await client.escrow.getAccount(escrowWithFees);
console.log("Gross amount:", details.grossAmount);
console.log("Fees reserved:", details.feesReserved);
console.log("Net to recipient:", details.netAmount);
```

### Transfer Fee Strategies

```typescript
// Different fee handling strategies
enum FeeStrategy {
  SenderPays = "sender_pays",       // Sender pays all fees
  RecipientPays = "recipient_pays", // Deduct from amount
  Split = "split"                   // Split fees 50/50
}

// Apply strategy
const payment = await client.processPaymentWithFees(signer, {
  mint: feeTokenMint,
  amount: 1000000000,
  recipient: agentAddress,
  feeStrategy: FeeStrategy.SenderPays,
  
  // For split strategy
  splitRatio: {
    sender: 70,
    recipient: 30
  }
});
```

## Confidential Transfers

### Enable Confidential Transfers

```typescript
// Check if mint supports confidential transfers
const hasConfidential = await client.hasConfidentialTransfers(mintAddress);

if (hasConfidential) {
  // Configure confidential account
  await client.configureConfidentialAccount(signer, {
    mint: mintAddress,
    account: tokenAccountAddress,
    
    // Generate ElGamal keypair for encryption
    elgamalKeypair: await generateElgamalKeypair(),
    
    // Optional: auditor public key
    auditorElgamalPubkey: auditorPubkey
  });
}
```

### Confidential Escrow

```typescript
// Create confidential escrow
const confidentialEscrow = await client.escrow.createConfidential(signer, {
  workOrder: workOrderAddress,
  amount: 1000000000,
  mint: confidentialMint,
  recipient: agentAddress,
  
  confidentialTransfer: {
    enabled: true,
    recipientElgamalPubkey: recipientPubkey,
    
    // Optional auditor for compliance
    auditorElgamalPubkey: auditorPubkey,
    
    // Decrypt amount only on release
    decryptOnRelease: true
  }
});

// Amount is encrypted on-chain
console.log("Escrow created with encrypted amount");
```

### Generate Confidential Proofs

```typescript
// Generate zero-knowledge proofs for confidential transfers
const proof = await generateConfidentialTransferProof({
  amount: 1000000000n,
  sourceDecryptHandle: sourceHandle,
  currentCiphertext: currentCiphertext,
  elgamalKeypair: keypair
});

// Submit confidential transfer
await client.submitConfidentialTransfer(signer, {
  source: sourceAccount,
  destination: destAccount,
  proof,
  newSourceCiphertext: proof.newSourceCiphertext
});
```

## Interest-Bearing Tokens

### Configure Interest

```typescript
// Check if token bears interest
const interestConfig = await client.getInterestConfig(mintAddress);

if (interestConfig) {
  console.log("Rate basis points:", interestConfig.rateBasisPoints);
  console.log("Last update:", new Date(interestConfig.lastUpdate * 1000));
  
  // Calculate accrued interest
  const balance = 1000000000n;
  const interest = calculateInterest(
    balance,
    interestConfig,
    Date.now() / 1000
  );
  
  console.log("Principal:", balance);
  console.log("Accrued interest:", interest);
  console.log("Total value:", balance + interest);
}
```

### Interest-Aware Escrow

```typescript
// Create escrow with interest-bearing tokens
const interestEscrow = await client.escrow.create(signer, {
  workOrder: workOrderAddress,
  amount: 1000000000,
  mint: interestMint,
  tokenProgram: TokenProgram.Token2022,
  
  interestHandling: {
    // Include accrued interest in release
    includeInterest: true,
    
    // Update interest before operations
    refreshBeforeRelease: true,
    
    // Distribute interest
    distribution: {
      toRecipient: 80, // 80% to recipient
      toEscrow: 20     // 20% as escrow fee
    }
  }
});
```

## Token Metadata

### Read Token Metadata

```typescript
// Get on-chain metadata for Token 2022
const metadata = await client.getTokenMetadata(mintAddress);

console.log("Name:", metadata.name);
console.log("Symbol:", metadata.symbol);
console.log("URI:", metadata.uri);
console.log("Additional fields:", metadata.additionalMetadata);

// For pointer-based metadata
if (metadata.metadataPointer) {
  const fullMetadata = await client.fetchMetadataFromPointer(
    metadata.metadataPointer
  );
  console.log("Full metadata:", fullMetadata);
}
```

### Create Token with Metadata

```typescript
// When creating rewards token
const rewardToken = await client.createRewardToken(signer, {
  name: "GhostSpeak Rewards",
  symbol: "GHOST",
  decimals: 9,
  supply: 1000000000000000000n, // 1 billion
  
  // Token 2022 metadata
  metadata: {
    uri: "https://metadata.ghostspeak.ai/rewards.json",
    additionalMetadata: [
      ["website", "https://ghostspeak.ai"],
      ["description", "Rewards token for GhostSpeak protocol"]
    ]
  },
  
  // Enable extensions
  extensions: {
    transferFees: {
      feeBasisPoints: 50, // 0.5% fee
      maximumFee: 1000000000n // Cap at 1 token
    },
    permanentDelegate: treasuryAddress
  }
});
```

## Advanced Extensions

### Transfer Hooks

```typescript
// Check for transfer hooks
const hasHooks = await client.hasTransferHooks(mintAddress);

if (hasHooks) {
  // Get hook program
  const hookProgram = await client.getTransferHookProgram(mintAddress);
  
  // Validate transfer with hook
  const validation = await validateTransferHookInstruction({
    amount,
    source: sourceAccount,
    destination: destAccount,
    hookProgram
  });
  
  if (!validation.valid) {
    console.error("Transfer blocked by hook:", validation.reason);
  }
}
```

### CPI Guard

```typescript
// Enable CPI Guard for security
await client.enableCpiGuard(signer, tokenAccountAddress);

// Check if CPI Guard is enabled
const hasCpiGuard = await client.hasCpiGuard(tokenAccountAddress);

if (hasCpiGuard) {
  console.log("Account protected from unauthorized CPI calls");
}
```

### Non-Transferable Tokens

```typescript
// Create soul-bound token (non-transferable)
const soulboundToken = await client.createSoulboundToken(signer, {
  recipient: agentAddress,
  metadata: {
    name: "Expert Certification",
    symbol: "CERT",
    uri: "ipfs://certification-metadata"
  },
  
  // Non-transferable extension
  nonTransferable: true,
  
  // Optional: allow burning
  allowBurn: true
});
```

### Permanent Delegate

```typescript
// Create token with permanent delegate (for compliance)
const complianceToken = await client.createComplianceToken(signer, {
  name: "Regulated Token",
  symbol: "REG",
  
  // Permanent delegate can freeze/thaw accounts
  permanentDelegate: complianceAuthority,
  
  // Additional compliance features
  defaultAccountState: "frozen", // Accounts frozen by default
  requireKyc: true
});
```

## Token Account Management

### Associated Token Addresses

```typescript
// Derive Token 2022 associated token address
const ata = await deriveToken2022AssociatedTokenAddress({
  mint: token2022Mint,
  owner: ownerAddress
});

// Get or create associated token account
const account = await client.getOrCreateToken2022Account(signer, {
  mint: token2022Mint,
  owner: ownerAddress,
  
  // Fund rent if creating
  fundRent: true,
  
  // Initialize with extensions
  extensions: {
    cpiGuard: true,
    memo: true
  }
});
```

### Batch Token Operations

```typescript
// Efficient batch operations for Token 2022
const results = await client.batchToken2022Operations(signer, [
  {
    type: "create_account",
    mint: mint1,
    owner: owner1
  },
  {
    type: "transfer",
    from: account1,
    to: account2,
    amount: 1000000000n,
    mint: mint1
  },
  {
    type: "close_account",
    account: emptyAccount,
    destination: ownerAddress
  }
]);
```

## Fee Calculation Utilities

### Complex Fee Scenarios

```typescript
// Calculate fees for multi-hop transfers
const route = [account1, account2, account3, destination];
const totalFees = await client.calculateRouteTransferFees(
  amount,
  mintAddress,
  route
);

console.log("Fees per hop:", totalFees.perHop);
console.log("Total fees:", totalFees.total);
console.log("Net received:", amount - totalFees.total);

// Optimize for lowest fees
const optimizedRoute = await client.findLowestFeeRoute(
  sourceAccount,
  destAccount,
  amount,
  mintAddress
);
```

### Fee Estimation

```typescript
// Estimate fees over time
const feeEstimate = await client.estimateAccumulatedFees({
  mint: feeTokenMint,
  monthlyVolume: 1000000000000n, // 1000 tokens/month
  averageTransactionSize: 10000000n, // 10 tokens
  period: 365 // days
});

console.log("Estimated annual fees:", feeEstimate.totalFees);
console.log("Effective fee rate:", feeEstimate.effectiveRate);
```

## Best Practices

### 1. Extension Detection

```typescript
// Always check for extensions before operations
async function safeTokenTransfer(mint: Address, amount: bigint) {
  const extensions = await client.getTokenExtensions(mint);
  
  let finalAmount = amount;
  
  // Handle transfer fees
  if (extensions.transferFees) {
    const fees = calculateTransferFee(amount, extensions.transferFees);
    finalAmount = amount + fees;
    console.log(`Adding ${fees} for transfer fees`);
  }
  
  // Check for hooks
  if (extensions.transferHook) {
    const valid = await validateTransferHook(amount, source, dest);
    if (!valid) throw new Error("Transfer blocked by hook");
  }
  
  // Check if frozen
  if (extensions.defaultAccountState === "frozen") {
    const thawed = await client.isAccountThawed(sourceAccount);
    if (!thawed) throw new Error("Account is frozen");
  }
  
  return finalAmount;
}
```

### 2. Fee Buffer Management

```typescript
// Maintain fee buffer for Token 2022 operations
class FeeBuffer {
  async ensureBuffer(mint: Address, operations: number) {
    const feeConfig = await client.getTransferFeeConfig(mint);
    const maxFeePerOp = feeConfig.maximumFee;
    const requiredBuffer = maxFeePerOp * BigInt(operations);
    
    const currentBuffer = await this.getBuffer(mint);
    if (currentBuffer < requiredBuffer) {
      await this.topUpBuffer(mint, requiredBuffer - currentBuffer);
    }
  }
}
```

### 3. Migration Support

```typescript
// Migrate from Token to Token 2022
async function migrateToToken2022(
  oldMint: Address,
  newMint: Address,
  holder: Address
) {
  // Get old balance
  const balance = await client.getTokenBalance(oldMint, holder);
  
  // Create new Token 2022 account
  const newAccount = await client.createToken2022Account(
    signer,
    newMint,
    holder
  );
  
  // Mint equivalent amount (if authorized)
  await client.mintToken2022(signer, {
    mint: newMint,
    destination: newAccount,
    amount: balance
  });
  
  // Burn old tokens
  await client.burnTokens(signer, {
    mint: oldMint,
    account: oldAccount,
    amount: balance
  });
  
  return newAccount;
}
```

### 4. Compliance Integration

```typescript
// Token 2022 compliance features
const complianceToken = {
  // Freeze authority for compliance
  freezeAuthority: complianceAddress,
  
  // Transfer restrictions
  transferHook: {
    program: complianceProgram,
    validation: "check_sanctions_list"
  },
  
  // Confidential transfers with auditing
  confidentialTransfers: {
    enabled: true,
    auditorKey: regulatorPubkey
  },
  
  // Metadata for compliance
  metadata: {
    regulatoryInfo: "SEC-registered security",
    restrictions: "US accredited investors only",
    kycRequired: true
  }
};
```