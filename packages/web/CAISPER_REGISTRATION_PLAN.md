# Caisper x402 Registration & Discovery Plan

**Generated**: 2026-01-03
**Purpose**: Register Caisper as x402-compliant agent and test GhostSpeak discovery flow

---

## Research Summary

### What is x402?

x402 is an **open payment protocol** that brings stablecoin payments to plain HTTP by reviving the HTTP 402 Payment Required status code. Think of it as **"Stripe for AI Agents"** - payment infrastructure for autonomous economic actors.

**Key Characteristics**:
- Open-source protocol (not proprietary to PayAI)
- Uses HTTP 402 status code for payment-required resources
- Supports micropayments with stablecoins
- Enables agent-to-agent commerce
- Multi-chain (Solana, Base, Polygon, Avalanche, Sei, IoTeX)

### What is PayAI?

PayAI is a **facilitator** that implements the x402 protocol:
- Provides `/verify` and `/settle` endpoints for payment validation
- Abstracts multi-chain complexity
- Covers network fees for better UX
- Offers marketplace for agent discovery
- Maintains P2P network for agent communication

**Important**: PayAI is ONE implementation of x402 (not the only one)

---

## Agent Discovery Models

### 1. PayAI Plugin Method (P2P + OrbitDB)

**How it works**:
```
Agent installs plugin-payai
    ↓
Joins libp2p network
    ↓
Publishes service ad to IPFS
    ↓
Stores CID in OrbitDB (distributed database)
    ↓
Other agents query OrbitDB for services
    ↓
Agent-to-agent commerce via P2P gossip
```

**Implementation**:
```typescript
// From plugin-payai advertiseServicesAction
const serviceAd = await prepareServiceAd({
  name: "Service Name",
  description: "Service Description",
  price: "100 USDC",
  requiredInfo: "Additional details from buyer"
}, runtime, contactInfo)

// Publish to IPFS via Helia
const CID = await payAIClient.publishPreparedServiceAd(serviceAd)

// Store in OrbitDB for P2P discovery
// Other agents poll OrbitDB to find services
```

**Requirements**:
- libp2p node (P2P networking)
- OrbitDB (distributed database)
- Helia (IPFS client)
- Heavy dependencies (~500MB node_modules)

**Use Case**: Agent-to-agent marketplace (agents hiring other agents)

### 2. GhostSpeak Method (On-Chain Indexing)

**How it works**:
```
Agent makes x402 payment (SPL token transfer)
    ↓
X402TransactionIndexer polls facilitator address
    ↓
Parses transaction metadata from memo
    ↓
Stores in Convex as "discovered agent"
    ↓
Users browse agents via web UI
    ↓
Claim agent → Register on-chain (GhostSpeak program)
```

**Implementation**:
```typescript
// From X402TransactionIndexer.ts
async pollTransactions() {
  // Get transaction signatures for facilitator address
  const signatures = await rpc
    .getSignaturesForAddress(facilitatorAddress)
    .send()

  for (const sig of signatures) {
    const tx = await rpc.getTransaction(sig).send()

    // Check if SPL token transfer to facilitator
    if (this.isX402Payment(tx)) {
      const paymentData = this.parsePaymentData(tx)

      // Store in Convex
      await convex.mutation(api.ghostDiscovery.addDiscoveredAgent, {
        ghostAddress: paymentData.payer,
        discoveredAt: paymentData.timestamp,
        source: 'x402_payment'
      })
    }
  }
}
```

**Requirements**:
- Solana RPC connection
- Convex database
- Transaction polling script
- No P2P networking required

**Use Case**: Human users discovering and hiring AI agents

---

## Caisper Registration Strategy

### Option 1: PayAI Plugin (P2P Discovery) ❌ NOT RECOMMENDED

**Why NOT recommended**:
1. **Heavy dependencies**: OrbitDB + libp2p + Helia add ~500MB to bundle
2. **Wrong use case**: We're building B2C (human → agent), not B2B (agent → agent)
3. **Complex setup**: Requires running P2P node, maintaining libp2p identity
4. **Unnecessary**: GhostSpeak already has its own discovery mechanism

### Option 2: GhostSpeak Discovery (On-Chain) ✅ RECOMMENDED

**Why recommended**:
1. **Matches our architecture**: We already have X402TransactionIndexer
2. **Simpler**: Just make an SPL token payment, no P2P infrastructure
3. **Right use case**: Designed for users discovering agents
4. **Testable**: Can verify full flow from payment → discovery → claim

**How to implement**:

#### Step 1: Fund Caisper's wallet
```bash
# Fund Caisper on Solana Devnet
solana airdrop 2 35TMqcEZAM43Axdxg5kfwkXmzDs1bJUxN8pD1pCs3nSt --url devnet

# Verify balance
solana balance 35TMqcEZAM43Axdxg5kfwkXmzDs1bJUxN8pD1pCs3nSt --url devnet
```

#### Step 2: Create test x402 payment
```typescript
import { createSolanaRpc } from '@solana/rpc'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import { address } from '@solana/addresses'
import { getTransferSolInstruction } from '@solana-program/system'
import bs58 from 'bs58'

const rpc = createSolanaRpc('https://api.devnet.solana.com')

// Caisper's keypair
const caisperPrivateKey = process.env.CAISPER_SOLANA_PRIVATE_KEY!
const caisperSigner = await createKeyPairSignerFromBytes(
  bs58.decode(caisperPrivateKey)
)

// PayAI test merchant (or our merchant address)
const facilitatorAddress = address('12wKg8BnaCRWfiho4kfHRfQQ4c6cjMwtnRUsyMTmKZnD')

// Create payment transaction with memo containing agent metadata
const paymentAmount = 1_000_000n // 0.001 SOL (test amount)

// TODO: Use SPL token transfer (USDC) instead of SOL
// This is simplified for testing - real x402 uses stablecoins
const transferInstruction = getTransferSolInstruction({
  source: caisperSigner.address,
  destination: facilitatorAddress,
  amount: paymentAmount,
})

// Add memo with agent metadata
const memoInstruction = {
  programAddress: address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
  accounts: [],
  data: new TextEncoder().encode(JSON.stringify({
    agentName: 'Caisper',
    serviceType: 'AI Assistant',
    x402Compliant: true,
    ghostAddress: caisperSigner.address,
  })),
}

// Send transaction
const { signature } = await sendAndConfirmTransaction({
  instructions: [memoInstruction, transferInstruction],
  signers: [caisperSigner],
})

console.log('Payment transaction:', signature)
```

#### Step 3: Verify indexer picks it up
```typescript
// X402TransactionIndexer should detect the payment
// Check Convex database for discovered agent

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
const discovered = await convex.query(api.ghostDiscovery.getDiscoveredAgents)

console.log('Discovered agents:', discovered)
// Should include Caisper with address: 35TMqcEZAM43Axdxg5kfwkXmzDs1bJUxN8pD1pCs3nSt
```

#### Step 4: Test claim flow
```bash
# Navigate to web UI
open http://localhost:3000/caisper

# Sign in with Caisper's wallet (using private key)
# Ask: "What agents are available?"
# Click "Claim Now" on Caisper
# Should register on-chain via GhostSpeak program
```

---

## PayAI Facilitator Integration

### Facilitator API Endpoints

PayAI provides the following endpoints:

**Base URL**: `https://facilitator.payai.network`

#### 1. `/verify` - Validate Payment
```typescript
POST /verify
Content-Type: application/json

{
  "network": "solana-devnet",
  "txSignature": "5xK7...",
  "expectedAmount": 100000000, // 100 USDC (6 decimals)
  "merchantAddress": "12wKg8BnaCRWfiho4kfHRfQQ4c6cjMwtnRUsyMTmKZnD"
}

// Response
{
  "valid": true,
  "amount": 100000000,
  "token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint
  "from": "35TMqcEZAM43Axdxg5kfwkXmzDs1bJUxN8pD1pCs3nSt",
  "timestamp": 1735890123
}
```

#### 2. `/settle` - Finalize Payment
```typescript
POST /settle
Content-Type: application/json

{
  "network": "solana-devnet",
  "txSignature": "5xK7...",
  "merchantAddress": "12wKg8BnaCRWfiho4kfHRfQQ4c6cjMwtnRUsyMTmKZnD"
}

// Response
{
  "settled": true,
  "settlementTx": "9pL2...",
  "confirmedAt": 1735890145
}
```

#### 3. `/list` - List Supported Assets
```typescript
GET /list?network=solana-devnet

// Response
{
  "assets": [
    {
      "symbol": "USDC",
      "mint": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      "decimals": 6
    },
    {
      "symbol": "USDT",
      "mint": "...",
      "decimals": 6
    }
  ]
}
```

### Test Merchant

PayAI provides an **Echo Merchant** for testing:
- **URL**: https://x402.payai.network
- **Feature**: Automatically refunds all payments
- **Fee Coverage**: Network fees covered by PayAI
- **Purpose**: Test x402 payment flow without financial risk

**Example Test Flow**:
```bash
# 1. Make payment to Echo Merchant
# 2. Merchant responds with 402 Payment Required
# 3. Agent pays using x402 protocol
# 4. Merchant verifies payment via /verify
# 5. Merchant settles via /settle
# 6. Payment is automatically refunded
```

---

## GhostSpeak x402 Integration

### Current Implementation

GhostSpeak already has x402 infrastructure:

**File**: `/docs/concepts/x402/overview.mdx`
**Purpose**: Trust layer ON TOP OF x402 payments

**How it works**:
```
x402 Payment Protocol (Escrow, Payments)
    ↓
GhostSpeak Trust Layer
    - Ghost Score updates on every transaction
    - Verifiable credentials for milestones
    - Trust-based escrow limits
    - Reputation-weighted dispute resolution
    ↓
Trusted AI Commerce
```

**Revenue Model**:
- B2C: 2.5% fee (10% to GHOST stakers, 90% to protocol)
- B2B API: Base fee + overage (100% overage to GHOST stakers)

**Example**:
```typescript
// From docs/concepts/x402/overview.mdx
import { GhostSpeakClient } from '@ghostspeak/sdk'

const ghostspeak = new GhostSpeakClient({ cluster: 'devnet' })

// 1. Check agent reputation before hiring
const reputation = await ghostspeak.reputation.getReputationData(agentAddress)
console.log(`Ghost Score: ${reputation.overallScore}/1000`)

// 2. Create x402 escrow with GhostSpeak validation
const escrow = await ghostspeak.x402.createEscrow({
  agent: agentAddress,
  buyer: buyerAddress,
  amount: 100_000_000n, // 100 USDC
  serviceDescription: 'Code review',
  dueDate: Math.floor(Date.now() / 1000) + 86400,
})

// 3. Agent completes work
await x402.markComplete(escrow.escrowId, {
  deliverables: 'https://github.com/review/report.md'
})

// 4. Buyer approves and releases escrow
await ghostspeak.x402.releaseEscrow(escrow.escrowId, {
  approved: true,
  qualityRating: 5.0,
  feedback: 'Excellent work'
})

// 5. GhostSpeak automatically updates Ghost Score via webhook
// (No manual action needed)
```

### Trust-Based Escrow Limits

| Ghost Score Tier | Max Escrow Amount | Purpose |
|------------------|-------------------|---------|
| **No Score** (New) | $50 USDC | Limit fraud risk |
| **Bronze** (300-499) | $500 USDC | Small tasks |
| **Silver** (500-749) | $2,500 USDC | Medium work |
| **Gold** (750-899) | $10,000 USDC | High-value projects |
| **Platinum** (900-1000) | $50,000 USDC | Enterprise contracts |

---

## Implementation Steps

### Phase 1: Test Discovery Flow ✅ CURRENT

1. **Fund Caisper's wallet** (Solana devnet)
   - Address: `35TMqcEZAM43Axdxg5kfwkXmzDs1bJUxN8pD1pCs3nSt`
   - Need: ~2 SOL for transaction fees

2. **Create test payment script**
   - Make SPL token transfer to facilitator
   - Include agent metadata in memo
   - Verify transaction confirms

3. **Run X402TransactionIndexer**
   - Poll facilitator address for transactions
   - Parse payment data
   - Store in Convex as discovered agent

4. **Test claim flow**
   - Navigate to web UI `/caisper`
   - Query discovered agents
   - Click "Claim Now"
   - Verify on-chain registration

### Phase 2: x402 Compliance (Future)

1. **Implement HTTP 402 endpoint**
   - Create x402-compliant API route
   - Return 402 Payment Required with payment details
   - Accept payment proof and verify via PayAI `/verify`

2. **Add service metadata**
   - Define Caisper's capabilities
   - Set pricing model
   - Configure payment methods

3. **Webhook integration**
   - Receive payment confirmations
   - Update Ghost Score
   - Issue milestone credentials

### Phase 3: Production Deployment (Future)

1. **Switch to mainnet**
   - Use real USDC mint
   - Configure production RPC
   - Set up monitoring

2. **Register with PayAI**
   - Submit to PayAI marketplace
   - Verify x402 compliance
   - Enable cross-network discovery

---

## Key Insights

### What We Learned

1. **x402 is a protocol, PayAI is an implementation**
   - x402: Open standard for AI agent payments
   - PayAI: Facilitator service implementing x402

2. **Two discovery models exist**
   - P2P (OrbitDB): Agent-to-agent commerce
   - On-chain (Indexing): User-to-agent commerce
   - **GhostSpeak uses on-chain model** ✅

3. **No explicit "registration" API**
   - Agents become discoverable by transacting
   - Passive discovery model vs. active registration
   - Discovery happens via payment indexing

4. **GhostSpeak adds trust layer**
   - Not competing with PayAI (complementary)
   - Provides Ghost Score reputation
   - Issues verifiable credentials
   - Enables trust-based commerce

### What We're NOT Doing

❌ Installing plugin-payai (wrong use case)
❌ Running OrbitDB nodes (unnecessary complexity)
❌ Building P2P marketplace (already have indexer)
❌ Competing with PayAI (we're built on top)

### What We ARE Doing

✅ Testing discovery via payment indexing
✅ Registering Caisper on GhostSpeak program
✅ Verifying claim flow works end-to-end
✅ Building trust infrastructure for x402

---

## Next Steps

### Immediate (Today)

1. ✅ Research complete
2. 📝 Document findings (this file)
3. 💰 Fund Caisper's wallet on devnet
4. 🔨 Create test payment script
5. 🧪 Run full discovery flow test

### Short-term (This Week)

1. Verify X402TransactionIndexer works
2. Test claim flow on web UI
3. Confirm on-chain registration succeeds
4. Document any issues or blockers

### Long-term (Q1 2026)

1. Implement x402-compliant API endpoints
2. Add Caisper to PayAI marketplace
3. Enable cross-platform agent discovery
4. Launch mainnet with real USDC payments

---

## Environment Variables

```bash
# Already configured in .env
CAISPER_SOLANA_PUBLIC_KEY="35TMqcEZAM43Axdxg5kfwkXmzDs1bJUxN8pD1pCs3nSt"
CAISPER_SOLANA_PRIVATE_KEY="8TpgJHPqzxdwJtZpu5gr5UbEfBTQAY6YPShvYMkFBtfV"

# PayAI configuration
GHOSTSPEAK_MERCHANT_ADDRESS="12wKg8BnaCRWfiho4kfHRfQQ4c6cjMwtnRUsyMTmKZnD"
PAYAI_FACILITATOR_URL="https://facilitator.payai.network"

# Solana configuration
NEXT_PUBLIC_SOLANA_RPC_URL="https://api.devnet.solana.com"
GHOSTSPEAK_USDC_MINT_DEVNET="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
```

---

## References

- **x402 Protocol**: https://www.x402.org
- **PayAI Docs**: https://docs.payai.network
- **PayAI Facilitator**: https://facilitator.payai.network
- **PayAI Plugin**: https://github.com/PayAINetwork/plugin-payai
- **GhostSpeak x402 Docs**: `/docs/concepts/x402/overview.mdx`
- **X402TransactionIndexer**: `/packages/sdk-typescript/src/modules/indexer/X402TransactionIndexer.ts`
- **Claim Agent Action**: `/packages/web/server/elizaos/actions/claimAgent.ts`

---

**Status**: ✅ Research Complete
**Next**: Create test payment script and fund wallets
