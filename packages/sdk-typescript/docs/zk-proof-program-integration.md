# ZK ElGamal Proof Program Integration

This document describes the GhostSpeak SDK's integration with Solana's ZK ElGamal Proof Program, including feature gate detection, dynamic proof generation, and fallback mechanisms.

## Overview

The ZK ElGamal Proof Program is a native Solana program that enables on-chain verification of zero-knowledge proofs for confidential transfers. As of July 2025, the program is disabled pending security audit completion.

## Key Components

### Feature Gate Detection

The SDK includes runtime detection of the ZK program's availability:

```typescript
import { isZkProgramEnabled, getZkProgramStatus } from '@ghostspeak/sdk'

// Check if ZK program is enabled
const isEnabled = await isZkProgramEnabled(connection)

// Get detailed status message
const status = await getZkProgramStatus(connection)
console.log(status) // "ZK ElGamal Proof Program is DISABLED pending security audit completion"
```

### Proof Generation Modes

The SDK supports multiple proof generation modes to handle different scenarios:

```typescript
export enum ProofMode {
  // Use ZK program if available, error if not
  ZK_PROGRAM_ONLY = 'zk_program_only',
  
  // Use ZK program if available, fallback to local if not
  ZK_PROGRAM_WITH_FALLBACK = 'zk_program_with_fallback',
  
  // Always use local verification (for testing)
  LOCAL_ONLY = 'local_only',
  
  // Automatically detect based on network status
  AUTO_DETECT = 'auto_detect'
}
```

### Dynamic Proof Generation

Proof generation automatically adapts based on the ZK program's availability:

```typescript
import { generateRangeProofWithCommitment } from '@ghostspeak/sdk'

// Generate range proof with automatic detection
const result = await generateRangeProofWithCommitment(
  amount,
  randomness,
  { 
    mode: ProofMode.AUTO_DETECT,
    connection 
  }
)

// Check if ZK program verification is required
if (result.requiresZkProgram) {
  console.log('ZK program is required but not available')
}

// Use the generated instruction if available
if (result.instruction) {
  transaction.add(result.instruction)
}
```

## Proof Types

### Range Proofs

Verify that an encrypted value is within a valid range (0 to 2^64 - 1):

```typescript
const rangeProof = await generateRangeProofWithCommitment(
  amount,
  randomness,
  { mode: ProofMode.ZK_PROGRAM_WITH_FALLBACK, connection }
)
```

### Validity Proofs

Verify that an ElGamal ciphertext is well-formed:

```typescript
const validityProof = await generateValidityProofWithInstruction(
  ciphertext,
  pubkey,
  amount,
  randomness,
  { mode: ProofMode.AUTO_DETECT }
)
```

### Transfer Proofs

Generate complete proofs for confidential transfers:

```typescript
const transferProof = await generateTransferProofWithInstruction(
  sourceBalance,
  transferAmount,
  sourcePubkey,
  destPubkey,
  sourceRandomness,
  { mode: ProofMode.ZK_PROGRAM_WITH_FALLBACK, connection }
)
```

## Monitoring Feature Gates

Monitor the ZK program's feature gate for activation changes:

```typescript
import { monitorFeatureGate, FEATURE_GATES } from '@ghostspeak/sdk'

const stopMonitoring = monitorFeatureGate(
  connection,
  FEATURE_GATES.ZK_ELGAMAL_PROOF_REENABLED,
  (status) => {
    console.log('Feature gate status changed:', status)
    if (status.activated) {
      console.log('ZK program is now enabled!')
    }
  },
  30_000 // Check every 30 seconds
)

// Stop monitoring when done
stopMonitoring()
```

## Context Management

For efficient proof verification, use the complete flow helper:

```typescript
import { createCompleteProofVerificationFlow } from '@ghostspeak/sdk'

const instructions = createCompleteProofVerificationFlow(
  proofInstruction,
  contextAccount,
  authority,
  payer
)

// This creates a transaction that:
// 1. Creates the proof context account
// 2. Verifies the proof
// 3. Closes the context account
```

## Best Practices

### 1. Use Appropriate Proof Modes

- **Production**: Use `ZK_PROGRAM_WITH_FALLBACK` for resilience
- **Testing**: Use `LOCAL_ONLY` for deterministic tests
- **Strict Requirements**: Use `ZK_PROGRAM_ONLY` when on-chain verification is mandatory

### 2. Handle Feature Gate Changes

```typescript
// Cache feature gate status for performance
const isEnabled = await isZkProgramEnabled(connection)

// Clear cache when needed
clearFeatureGateCache()
clearZkProgramStatusCache()
```

### 3. Batch Proof Verification

When verifying multiple proofs, use batch instructions:

```typescript
const batchInstructions = createBatchVerifyRangeProofInstructions(
  accounts,
  proofs
)
```

### 4. Error Handling

Always check the `requiresZkProgram` flag:

```typescript
const result = await generateRangeProofWithCommitment(amount, randomness, {
  mode: ProofMode.ZK_PROGRAM_ONLY,
  connection
})

if (result.requiresZkProgram && !result.instruction) {
  throw new Error('ZK program required but not available')
}
```

## Future Considerations

When the ZK ElGamal Proof Program is re-enabled:

1. The SDK will automatically detect and use it
2. Existing fallback code will continue to work
3. Performance will improve due to native verification
4. No code changes required in applications using `AUTO_DETECT` or `ZK_PROGRAM_WITH_FALLBACK`

## Testing

The SDK includes comprehensive integration tests:

```bash
# Run ZK proof integration tests
bun test tests/integration/zk-proof-program-integration.test.ts

# Run all proof-related tests
bun test --grep "proof"
```

## References

- [Solana ZK ElGamal Proof Program](https://github.com/solana-labs/solana/tree/master/zk-elgamal-proof)
- [Feature Gate Documentation](https://docs.solana.com/developing/runtime-facilities/feature-gates)
- [Token-2022 Confidential Transfers](https://spl.solana.com/token-2022/extensions#confidential-transfers)