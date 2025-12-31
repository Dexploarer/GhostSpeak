# Authorization Storage Options

GhostSpeak provides flexible authorization storage with configurable fees to balance cost and transparency.

## Storage Options

### Off-Chain Storage (Default - FREE)

**Cost:** Free
**Use Case:** Most authorizations, high-volume scenarios

```typescript
const auth = await client.authorization.createAuthorization({
  authorizedSource: facilitatorAddress,
  indexLimit: 1000,
  expiresIn: 30 * 24 * 60 * 60, // 30 days
  network: 'devnet',
  // No onChainStorage = defaults to off-chain (free)
}, agentKeypair)

// Share the signed authorization directly with facilitator
// Facilitator verifies signature off-chain before each update
const isValid = await client.authorization.verifySignature(auth)
```

**Advantages:**
- ✅ Zero cost
- ✅ Instant creation (no blockchain confirmation)
- ✅ Perfect for high-volume, short-lived authorizations

**Limitations:**
- ❌ No public audit trail
- ❌ Requires direct sharing between agent and facilitator
- ❌ Cannot be queried on-chain by third parties

---

### On-Chain Storage (~0.002 SOL)

**Cost:** ~0.002 SOL (rent exemption)
**Use Case:** High-value authorizations, compliance requirements

```typescript
// Step 1: Create authorization with on-chain config
const auth = await client.authorization.createAuthorization({
  authorizedSource: facilitatorAddress,
  indexLimit: 1000,
  expiresIn: 30 * 24 * 60 * 60,
  network: 'devnet',
  onChainStorage: {
    enabled: true,
    autoStore: true, // Automatically store on-chain
    feePayedByAgent: true, // Agent pays ~0.002 SOL
  }
}, agentKeypair)

// Step 2: Store on-chain (if autoStore: false)
const { keypairToTransactionSigner } = await import('../tests/utils/test-signers.js')
const agentSigner = await keypairToTransactionSigner(agentKeypair)
const signature = await client.authorization.storeAuthorizationOnChain(auth, agentSigner)

console.log('Stored on-chain:', signature)
console.log('Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`)
```

**Advantages:**
- ✅ Immutable public audit trail
- ✅ Third-party verification possible
- ✅ Compliance-friendly
- ✅ Transparent reputation system

**Limitations:**
- ❌ Costs ~0.002 SOL (~$0.20 at $100/SOL)
- ❌ Requires blockchain confirmation (2-5 seconds)

---

## Fee Configuration

### 1. Default Fee (Simple)

```typescript
// Default: 0.002 SOL regardless of duration
await client.authorization.storeAuthorizationOnChain(auth, signer)
```

### 2. Custom Fixed Fee

```typescript
// Set a custom flat fee
await client.authorization.storeAuthorizationOnChain(auth, signer, {
  storageFee: 1500000n, // 0.0015 SOL
  feePayedByAgent: true
})
```

### 3. Tiered Pricing (Duration-Based)

```typescript
// Different fees for different durations
const tierConfig = {
  enabled: true,
  customFees: {
    604800: 1000000n,   // 7 days = 0.001 SOL
    2592000: 1500000n,  // 30 days = 0.0015 SOL
    7776000: 2000000n,  // 90 days = 0.002 SOL
  }
}

await client.authorization.storeAuthorizationOnChain(auth, signer, tierConfig)
```

**Fee Selection Logic:**
- Finds the first tier where `authorization_duration <= tier_duration`
- If authorization is longer than all tiers, uses highest tier fee
- Example: 20-day authorization → uses 30-day tier (0.0015 SOL)

### 4. Facilitator-Paid Storage

```typescript
// Facilitator pays for storage instead of agent
await client.authorization.storeAuthorizationOnChain(auth, facilitatorSigner, {
  feePayedByAgent: false,
  storageFee: 2000000n
})
```

**Use Cases:**
- Agent has limited funds
- Facilitator requires on-chain proof
- Business subsidizes agent costs

---

## Cost Estimation

### Estimate Before Creation

```typescript
const estimatedCost = await client.authorization.estimateStorageCost({
  authorizedSource: facilitatorAddress,
  expiresIn: 30 * 24 * 60 * 60,
})

console.log(`Storing this authorization will cost ${estimatedCost} SOL`)

if (estimatedCost > agentBudget) {
  console.log('Agent prefers off-chain storage (free)')
  // Create without onChainStorage
}
```

### With Custom Tiers

```typescript
const costWithTiers = await client.authorization.estimateStorageCost({
  authorizedSource: facilitatorAddress,
  expiresIn: 7 * 24 * 60 * 60, // 7 days
}, {
  customFees: {
    604800: 1000000n,   // 7 days = 0.001 SOL
    2592000: 1500000n,  // 30 days = 0.0015 SOL
  }
})

console.log(`7-day authorization: ${costWithTiers} SOL`) // 0.001 SOL
```

---

## Complete Examples

### Example 1: PayAI Integration (Off-Chain)

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk'
import { Keypair } from '@solana/web3.js'

const client = new GhostSpeakClient({ network: 'mainnet-beta' })
const agentKeypair = Keypair.fromSecretKey(/* ... */)
const payAIFacilitatorAddress = 'PayAI...'

// Create free off-chain authorization
const auth = await client.authorization.createPayAIAuthorization(
  payAIFacilitatorAddress,
  agentKeypair,
  {
    indexLimit: 5000,
    expiresIn: 90 * 24 * 60 * 60, // 90 days
  }
)

// Share with PayAI webhook
await fetch('https://payai.example.com/register-agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentAddress: auth.agentAddress,
    authorization: client.authorization.serializeAuthorization(auth)
  })
})
```

**Result:** Zero cost, PayAI verifies signature on each reputation update

---

### Example 2: High-Value Agent (On-Chain Audit)

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk'
import { Keypair } from '@solana/web3.js'
import { keypairToTransactionSigner } from '@ghostspeak/sdk/tests/utils'

const client = new GhostSpeakClient({ network: 'mainnet-beta' })
const agentKeypair = Keypair.fromSecretKey(/* ... */)
const agentSigner = await keypairToTransactionSigner(agentKeypair)

// High-value agent wants public reputation proof
const auth = await client.authorization.createAuthorization({
  authorizedSource: facilitatorAddress,
  indexLimit: 10000,
  expiresIn: 365 * 24 * 60 * 60, // 1 year
  network: 'mainnet-beta',
  onChainStorage: {
    enabled: true,
    autoStore: false, // Manual control
    feePayedByAgent: true,
    storageFee: 2500000n, // 0.0025 SOL for long duration
  }
}, agentKeypair)

// Store on-chain
const signature = await client.authorization.storeAuthorizationOnChain(auth, agentSigner)

console.log('Authorization is now publicly verifiable!')
console.log(`Explorer: https://explorer.solana.com/tx/${signature}`)
```

**Result:** 0.0025 SOL cost, permanent public record of authorization

---

### Example 3: Tiered Pricing Model

```typescript
// Define custom fee tiers
const pricingTiers = {
  enabled: true,
  customFees: {
    // Short-term: Cheaper
    86400: 500000n,      // 1 day = 0.0005 SOL
    604800: 1000000n,    // 7 days = 0.001 SOL

    // Medium-term: Standard
    2592000: 1500000n,   // 30 days = 0.0015 SOL
    7776000: 2000000n,   // 90 days = 0.002 SOL

    // Long-term: Premium
    31536000: 3000000n,  // 365 days = 0.003 SOL
  },
  feePayedByAgent: true,
}

// Create and store with tiered pricing
const auth = await client.authorization.createAuthorization({
  authorizedSource: facilitatorAddress,
  indexLimit: 1000,
  expiresIn: 30 * 24 * 60 * 60, // Will use 0.0015 SOL tier
  network: 'mainnet-beta',
  onChainStorage: pricingTiers,
}, agentKeypair)

// Auto-calculated: 30 days → 0.0015 SOL
const cost = await client.authorization.estimateStorageCost({...}, pricingTiers)
console.log(`Cost: ${cost} SOL`) // 0.0015
```

**Result:** Incentivizes shorter authorizations, flexible pricing

---

## Decision Matrix

| Scenario | Storage Type | Why |
|----------|--------------|-----|
| PayAI integration, high volume | Off-chain | Free, instant, sufficient for most cases |
| Compliance-required audit trail | On-chain | Immutable record, public verification |
| Agent with limited funds | Off-chain or Facilitator-paid | Minimize agent costs |
| Premium agent marketplace | On-chain | Transparency builds trust |
| Short-term (< 7 days) | Off-chain or tiered | Cost efficiency |
| Long-term (> 90 days) | On-chain | Worth the cost for extended period |

---

## Testing On-Chain Storage

### Devnet Setup

```bash
# 1. Ensure funded devnet wallet
solana balance --url devnet
# If low: solana airdrop 2 --url devnet

# 2. Run setup script (initializes staking config)
bun run tests/setup/devnet-setup.ts

# 3. Test authorization storage
bun test tests/e2e/authorization-flow.test.ts
```

### Mainnet Deployment

```typescript
// Production ready code
const client = new GhostSpeakClient({
  network: 'mainnet-beta',
  rpcEndpoint: process.env.MAINNET_RPC_URL
})

// Always estimate cost first
const cost = await client.authorization.estimateStorageCost(params, config)
console.log(`This will cost ${cost} SOL`)

// Confirm with user if needed
if (await confirmCost(cost)) {
  await client.authorization.storeAuthorizationOnChain(auth, signer, config)
}
```

---

## FAQ

**Q: When should I use on-chain storage?**
A: For high-value authorizations, compliance requirements, or when public verification is important. Otherwise, off-chain is recommended.

**Q: Can I change storage type after creation?**
A: Yes! Create off-chain, then later call `storeAuthorizationOnChain()` to upgrade to on-chain.

**Q: What happens if I don't pay the fee?**
A: Transaction fails. Always ensure sufficient SOL balance before calling `storeAuthorizationOnChain()`.

**Q: Can fees be refunded?**
A: No. The fee covers Solana rent exemption which is permanent.

**Q: How do I query on-chain authorizations?**
A: Use `client.authorization.fetchAuthorization(agentAddress, authorizedSource, nonce)`

---

## Next Steps

1. **Try the demo:** `bun run examples/authorization-with-optional-storage.ts`
2. **Read the tests:** `tests/e2e/authorization-flow.test.ts`
3. **Integrate PayAI:** See PayAI documentation for webhook integration
4. **Production deployment:** Test on devnet first, then mainnet

---

**Questions?** Check the [main README](../README.md) or [create an issue](https://github.com/ghostspeak/ghostspeak/issues).
