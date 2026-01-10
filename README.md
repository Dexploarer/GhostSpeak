# GhostSpeak: The Ghost Behind Every AI

<div align="center">
  <img src="docs/assets/ghostspeak-logo.png" alt="GhostSpeak Logo" width="200" />

  **Trust Layer for AI Agent Commerce - x402 Protocol Compatible**

  [![Version](https://img.shields.io/badge/version-v2.0.0-blue.svg)](https://github.com/ghostspeak/ghostspeak)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Solana](https://img.shields.io/badge/Solana-v2.3.13-9945FF.svg)](https://solana.com)
  [![Anchor](https://img.shields.io/badge/Anchor-v0.32.1-FF6B6B.svg)](https://anchor-lang.com)
   [![Codecov](https://img.shields.io/codecov/c/github/ghostspeak/ghostspeak?token=CODECOV_TOKEN)](https://codecov.io/gh/ghostspeak/ghostspeak)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-3178C6.svg)](https://typescriptlang.org)
  [![Rust](https://img.shields.io/badge/Rust-1.75+-orange.svg)](https://rust-lang.org)

  [Documentation](./docs) | [API Reference](./docs/API.md) | [ROADMAP](./ROADMAP.md) | [Discord](https://discord.gg/ghostspeak) | [Twitter](https://twitter.com/ghostspeak)
</div>

---

## Overview

**GhostSpeak** is a decentralized trust layer for AI agent commerce. We provide Verifiable Credentials, multi-source reputation tracking (Ghost Score), and identity infrastructure for autonomous agents.

**Think of us as:**
- **FICO for AI Agents** - Credit scoring for autonomous commerce
- **The Ghost in the Machine** - Invisible trust layer powering every transaction
- **Verifiable Reputation** - On-chain credentials that prove agent trustworthiness

### x402 Protocol Compatible

**GhostSpeak** uses the x402 HTTP payment protocol to index transactions and build reputation. We aggregate data from multiple sources including x402 payments, user reviews, endpoint reliability, and cross-platform reputation systems.

```
┌──────────────────────────────────────────────────────────────┐
│                  AI Agent Commerce Ecosystem                  │
│                                                                │
│  ┌─────────────┐   x402 Payment   ┌─────────────┐           │
│  │  Agent A    │ ──────────────────→ │  Agent B    │           │
│  └─────────────┘                     └─────────────┘           │
│         │                                    │                  │
│         │      Transaction + Reputation Data │                  │
│         └────────────────┬───────────────────┘                  │
│                          ↓                                      │
│                 ┌─────────────────┐                            │
│                 │   GhostSpeak    │                            │
│                 │  (Trust Layer)  │                            │
│                 └─────────────────┘                            │
│                          │                                      │
│                          ↓                                      │
│     Ghost Score (0-1000) + W3C Verifiable Credentials         │
│     Multi-Source: x402, Reviews, ElizaOS, Crossmint, etc.     │
└──────────────────────────────────────────────────────────────┘
```

## Three Pillars

### 1. Verifiable Credentials (VCs)

W3C-compliant credentials for AI agents, bridged to EVM chains via Crossmint.

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk';

const client = new GhostSpeakClient({ cluster: 'devnet' });

// Issue agent identity credential
const credential = await client.credentials.issueAgentIdentityCredential({
  agentId: agentAddress,
  name: 'GPT-4 Code Reviewer',
  capabilities: ['code-review', 'security-audit'],
  x402Enabled: true,
  syncToCrossmint: true,
});

console.log('Credential issued:', credential.solanaCredential);
console.log('Crossmint sync:', credential.crossmintSync);
```

### 2. Reputation Layer (Ghost Score)

**Ghost Score** is a 0-1000 credit rating for AI agents calculated from:

- **Success Rate** (40%): Payment completion, service delivery
- **Service Quality** (30%): Client ratings, dispute resolution
- **Response Time** (20%): Timeliness, availability
- **Volume Consistency** (10%): Transaction history, longevity

**Tiers:**
- **Bronze** (250-499): New agents, basic access
- **Silver** (500-749): Established agents, priority features
- **Gold** (750-899): Top performers, premium benefits
- **Platinum** (900-1000): Elite agents, maximum trust

```typescript
// Get agent's Ghost Score
const reputation = await client.reputation.getReputationData(agentAddress);

console.log('Ghost Score:', reputation.overallScore); // 785
console.log('Tier:', reputation.tier); // "Gold"
console.log('Success Rate:', reputation.successRate); // 94.5%
```

### 3. Identity Registry

Compressed NFT-based agent identities (5000x cost reduction vs standard NFTs).

```typescript
// Register agent with compressed NFT
const agent = await client.agents.registerCompressed({
  name: 'AI Assistant',
  capabilities: ['analysis', 'generation'],
  merkleTree: merkleTreeAddress,
  metadata: {
    model: 'gpt-4',
    endpoint: 'https://agent.example.com',
  },
});

console.log(`Agent created at 0.0002 SOL instead of 1 SOL`);
```

## Quick Start

### Prerequisites

- Node.js 20+ or Bun 1.0+
- Solana wallet with devnet SOL
- PayAI agent (optional, for reputation tracking)

### Installation

```bash
# Install the SDK
bun add @ghostspeak/sdk

# Install the CLI globally
bun add -g @ghostspeak/cli
```

### 4-Step Integration

#### Step 1: Register Agent

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk';
import { generateKeyPairSigner } from '@solana/signers';

const client = new GhostSpeakClient({ cluster: 'devnet' });
const agentSigner = await generateKeyPairSigner();

const agent = await client.agents.register(agentSigner, {
  name: 'My AI Agent',
  description: 'Code analysis and review service',
  capabilities: ['code-analysis', 'security-audit'],
  model: 'gpt-4',
});

console.log(`Agent registered: ${agent.address}`);
```

#### Step 2: Issue Verifiable Credential

```typescript
const credential = await client.credentials.issueAgentIdentityCredential({
  agentId: agent.address,
  owner: agentSigner.address,
  name: 'My AI Agent',
  capabilities: ['code-analysis', 'security-audit'],
  x402Enabled: true,
  syncToCrossmint: true, // Bridge to EVM
  recipientEmail: 'builder@example.com',
});

console.log('Credential ID:', credential.solanaCredential.credentialId);
```

#### Step 3: Record x402 Payment for Reputation

```typescript
// Option 1: Direct reputation update
const paymentData = {
  amount: 1000000, // 1 USDC (6 decimals)
  success: true,
  responseTimeMs: 250,
  txSignature: 'your-solana-tx-signature',
};

await client.reputation.recordPayAIPayment(
  agentAddress,
  paymentData
);

// Option 2: Use x402 Transaction Indexer (automatic blockchain polling)
import { X402TransactionIndexer } from '@ghostspeak/sdk';

const indexer = new X402TransactionIndexer({
  rpcUrl: 'https://api.devnet.solana.com',
  startSlot: 'latest', // Or specific slot number
});

// Polls blockchain for x402 payments and auto-updates reputation
await indexer.pollTransactions();
```

#### Step 4: Check Ghost Score

```typescript
const reputation = await client.reputation.getReputationData(agent.address);

console.log('Ghost Score:', reputation.overallScore);
console.log('Tier:', reputation.tier);
console.log('Total Payments:', reputation.totalJobs);
console.log('Success Rate:', reputation.successRate);
```

## Multi-Source Reputation Aggregation

GhostSpeak builds trust scores from 8+ data sources using weighted multi-source aggregation:

```typescript
import { MultiSourceAggregator, PayAIAdapter } from '@ghostspeak/sdk';

// 1. Create reputation adapters for different sources
const payaiAdapter = new PayAIAdapter({
  apiKey: process.env.PAYAI_API_KEY, // If using PayAI as one source
  rpcUrl: 'https://api.devnet.solana.com',
});

// 2. Initialize multi-source aggregator
const aggregator = new MultiSourceAggregator({
  ghostspeakClient: client,
  adapters: [
    payaiAdapter,
    // Add other adapters (GitHub, custom webhooks, etc.)
  ],
});

// 3. Fetch and aggregate reputation from all sources
const reputation = await aggregator.aggregateReputation(agentAddress);

console.log('Overall Ghost Score:', reputation.overallScore);
console.log('Data Sources:', reputation.sources); // x402, reviews, endorsements, etc.
console.log('Confidence:', reputation.confidence); // Bayesian confidence score

// 4. Auto-issue credentials at milestones (monitored by Convex cron)
// Credentials issued automatically at:
// - 10/100/1000 successful payments
// - Silver/Gold/Platinum tier achievement
// - 99%+ uptime attestation
// - Capability verification passes
```

## Architecture: The 3 Pillars

```
┌────────────────────────────────────────────────────────────────┐
│                     Application Layer                           │
│  Ghost Score Dashboard • B2B API • Agent Registry • VC Issuance│
├────────────────────────────────────────────────────────────────┤
│                   TypeScript SDK Layer                          │
│  CredentialModule • ReputationModule • AgentModule             │
├────────────────────────────────────────────────────────────────┤
│                Smart Contract Layer (Rust)                      │
│  Agent Registry • Reputation • Credentials • Governance        │
├────────────────────────────────────────────────────────────────┤
│                  Integration Layer                              │
│  PayAI Webhooks • Crossmint VCs • ZK Compression               │
├────────────────────────────────────────────────────────────────┤
│                   Solana Blockchain                             │
│   High Performance • Low Cost • Decentralized • Secure        │
└────────────────────────────────────────────────────────────────┘
```

### Core Modules

- **Agent Registry**: Compressed NFT identities (5000x cheaper)
- **Reputation System**: Multi-source Ghost Score with 8+ data inputs
- **Credential Issuance**: W3C VCs with Crossmint EVM bridging
- **x402 Integration**: Payment indexing and reputation tracking
- **Governance**: Admin authority (multisig planned for mainnet)

## Package Ecosystem

| Package | Version | Description |
|---------|---------|-------------|
| **[@ghostspeak/sdk](./packages/sdk-typescript)** | `2.0.5` | TypeScript SDK for VC/Reputation/Identity |
| **[@ghostspeak/cli](./packages/cli)** | `2.0.0-beta.19` | TypeScript CLI for agent registration and credentials |
| **[Boo 👻](https://github.com/Ghostspeak/boo)** | `1.0.0` | **Go TUI** - Beautiful terminal interface built with Charm (Bubbletea, Lipgloss, Bubbles, Huh) |
| **[@ghostspeak/web](./packages/web)** | `1.0.0` | Ghost Score dashboard and VC explorer |
| **Smart Contracts** | `2.0.0` | Rust programs on Solana devnet |

## B2B Use Cases

### 1. Agent Marketplaces & Payment Platforms

Integrate Ghost Score for trust verification before high-value transactions:

```typescript
// AI marketplace uses GhostSpeak for agent trust verification
const trustScore = await ghostspeak.reputation.getReputationData(agentId);

if (trustScore.overallScore >= 750) {
  // Allow high-value transactions for Gold+ tier agents
  await processPayment({ amount: 100_000_000n });
} else {
  // Require escrow or lower limits for unproven agents
  await requireEscrow(agentId);
}
```

### 2. White-Label Licensing

License Ghost Score for your own AI marketplace:

```typescript
import { GhostSpeakB2BClient } from '@ghostspeak/sdk';

const b2bClient = new GhostSpeakB2BClient({
  apiKey: process.env.GHOSTSPEAK_B2B_KEY,
  organizationId: 'your-org-id',
});

// Query trust scores for your marketplace
const scores = await b2bClient.getBulkReputationData(agentIds);
```

### 3. Cross-Chain Identity

Issue credentials on Solana, verify on EVM chains:

```typescript
// Issue on Solana
const vc = await ghostspeak.credentials.issueAgentIdentityCredential({
  agentId,
  syncToCrossmint: true,
});

// Verify on Base/Polygon/Ethereum
const verified = await crossmintClient.verifyCredential(vc.crossmintId);
```

## Revenue Model (Crypto-Native)

> **⚠️ BETA PHASE:** GhostSpeak is currently on devnet with no paying customers yet. The pricing below represents our planned model for mainnet launch.

**No Subscriptions. No Credit Cards. Pure Crypto.**

All payments in USDC or GHOST tokens. Stake GHOST to earn revenue share from protocol fees.

### B2C Ghost Score Pricing

| Tier | Cost | Access Level | Revenue Share |
|------|------|--------------|---------------|
| **Freemium** | Free | 3 verifications/month | N/A |
| **Pay-Per-Check (USDC)** | 1 USDC per check | Unlimited (pay as you go) | N/A |
| **Pay-Per-Check (GHOST)** | 75 GHOST per check (burned) | 25% discount | N/A |
| **Verified Staker** | Stake 5K GHOST (~$0.28) | Unlimited verifications | 1.5x revenue multiplier |
| **Pro Staker** | Stake 50K GHOST (~$2.85) | Unlimited + 100K API calls | 2x revenue multiplier |
| **Whale Staker** | Stake 500K GHOST (~$28.46) | Unlimited + unlimited API | 3x revenue multiplier |

**Revenue Share Model:**
- **10% of B2C fees** → Staker rewards pool (USDC)
- **100% of B2B overage fees** → Staker rewards pool (USDC)
- **APY is variable** based on actual protocol revenue (no fixed promises)
- **Claim anytime** - rewards accrue daily, withdraw whenever you want
- **No lockup** - unstake GHOST anytime (lose access)

<details>
<summary><strong>Why is APY variable?</strong></summary>

Unlike traditional DeFi with fixed APY promises, we share ACTUAL protocol revenue:

**Example Month 1 (Low Revenue):**
- Protocol revenue: $10K
- Staker pool: $1K (10%)
- Your stake: 10K GHOST ($0.57 value)
- Your monthly reward: $2 USDC
- Annualized APY: ~420%

**Example Month 2 (High Revenue):**
- Protocol revenue: $100K
- Staker pool: $10K (10%)
- Your stake: 10K GHOST ($0.57 value)
- Your monthly reward: $20 USDC
- Annualized APY: ~4,200%

**This is honest, transparent, and sustainable.** We don't promise what we can't deliver.
</details>

### B2B API Pricing

| Plan | Monthly Cost (USDC) | Included Requests | Overage Fee | Staking Alternative |
|------|---------------------|-------------------|-------------|---------------------|
| **Starter** | 50 USDC/month | 10K requests | 0.01 USDC/request | Stake 10K GHOST |
| **Growth** | 250 USDC/month | 100K requests | 0.005 USDC/request | Stake 50K GHOST |
| **Scale** | 1,000 USDC/month | 500K requests | 0.002 USDC/request | Stake 200K GHOST |
| **Enterprise** | 5K-50K USDC/month | Custom | Negotiable | Stake 500K+ GHOST |

**Prepaid Model:** Deposit USDC to team token account, usage deducts in real-time.
**Staking Alternative:** Stake GHOST instead of prepaying USDC to get unlimited access + revenue share.

### GHOST Token Details

**Contract Address:** `DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump`

**Token Info:**
- **Network:** Solana Mainnet
- **Standard:** SPL Token
- **Decimals:** 6
- **Total Supply:** 999,753,007 GHOST (immutable, no inflation)
- **Mint Authority:** Revoked (fully decentralized)
- **Freeze Authority:** Revoked (cannot be censored)

**Current Metrics (Dec 30, 2025):**
- **Price:** $0.00005691 per GHOST
- **Market Cap:** $56,905 USD
- **Liquidity:** $22,816 USD
- **24h Volume:** $23,319 USD

**Buy GHOST:**
- [DEXScreener](https://dexscreener.com/solana/e44xj7jyjxyermlqqwrpu4nekcphawfjf3ppn2uokgdb) (price charts)
- [PumpSwap](https://pumpswap.io) (trade GHOST/SOL)

### Revenue Projections (Conservative Year 1)

> **NOTE:** These are financial projections for post-mainnet launch, not current revenue. GhostSpeak has no paying customers as of January 2026 (devnet beta phase).

| Revenue Stream | Target | Annual Revenue Projection |
|----------------|--------|---------------------------|
| **B2C Pay-Per-Check** | 100K verifications/month | $1.2M (projected) |
| **B2B Prepaid Plans** | 500+ teams | $3.3M (projected) |
| **B2B Overage Fees** | API usage beyond quota | $240K (projected) |
| **x402 Marketplace Integration** | Payment platform adoption | $2.6M (speculative) |
| **Credential Issuance** | Enterprise VC fees | $600K (speculative) |
| **Total Year 1 Target** | | **$4.74M (target)** |

**Staker Rewards Pool:** ~$690K/year (14.5% of baseline revenue)

**Estimated APY (Example Scenarios):**
- If 10% of supply staked (100M GHOST) at current price ($0.00005691):
  - TVL: $5,691
  - Annual rewards: $690K
  - APY: **12,127%** ❌ (Too high, unsustainable - price will increase)

- If GHOST appreciates 100x to $0.005691:
  - TVL: $569,100
  - Annual rewards: $690K
  - APY: **121%** ✅ (Attractive but volatile)

- If GHOST appreciates 1000x to $0.05691:
  - TVL: $5,691,000
  - Annual rewards: $690K
  - APY: **12.1%** ✅ (Sustainable DeFi rate)

**Key Insight:** As protocol grows and GHOST appreciates, APY normalizes to sustainable levels (10-30%).

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for detailed quarterly targets.

**2026 Milestones (Targets):**
- Q1: Mainnet launch, Ghost Score Beta, x402 indexing live
- Q2: ElizaOS plugin adoption, 10K agents onboarded (target)
- Q3: B2B API launch, 50K active agents (target)
- Q4: Mobile apps, 100K users, $32.9M ARR (aspirational target)

## Platform Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Rust Smart Contracts** | Beta (Devnet Only) | Agent, Reputation, Credentials - **Audit Pending** |
| **TypeScript SDK** | Production Ready | Multi-source reputation, x402 indexing |
| **CLI Tools** | Production Ready | Full VC/Reputation commands |
| **Ghost Score Dashboard** | Beta | Web app for B2C users |
| **B2B API** | Development | Q3 2026 launch target |
| **Documentation** | 90% Complete | Ongoing updates for accuracy |

### Deployed Contracts (Devnet Only)

> **⚠️ BETA:** These contracts are deployed on Solana devnet for testing only. Not audited. Do not use for production.

- **Network**: Solana Devnet
- **Program ID**: `GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9`
- **IDL**: [View on Solscan](https://solscan.io/account/GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9?cluster=devnet)
- **Audit Status**: Pending (Q1 2026)
- **Mainnet Deployment**: TBD (post-audit)

## Documentation

- [Quickstart](./docs/quickstart.mdx) - 10-minute integration guide
- [Ghost Score](./docs/ghost-score.mdx) - Credit rating algorithm
- [PayAI Integration](./docs/payai-integration.mdx) - Webhook setup
- [B2B API](./docs/b2b-api.mdx) - Enterprise integration
- [Verifiable Credentials](./docs/guides/verifiable-credentials.mdx) - VC issuance guide
- [Architecture](./docs/concepts/architecture.mdx) - 3-pillar technical overview

## Testing

```bash
# Run all tests
bun test

# Run specific test suites
bun test:unit        # Unit tests
bun test:integration # Integration tests
bun test:e2e         # End-to-end tests

# Rust program tests
cd programs && cargo test
```

## Deployment

See our [Deployment Guide](./docs/guides/deployment.mdx) for detailed instructions.

```bash
# Build and deploy to devnet
anchor build
anchor deploy --provider.cluster devnet

# Initialize protocol
ghostspeak init --network devnet
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

```bash
# Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/ghostspeak.git

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes and test
bun test && bun lint

# Submit a pull request
```

## Security

> **⚠️ PRE-AUDIT STATUS:** Smart contracts have NOT been audited by a third party yet. Audit scheduled for Q1 2026 before mainnet launch.

**Current Security Status:**
- ✅ Reentrancy protection implemented
- ✅ Rate limiting on user operations
- ✅ Canonical PDA validation (Anchor 2025 standards)
- ✅ Security tests in `/programs/src/tests/security_tests.rs`
- ⚠️ **Hardcoded admin key in code** - Will be replaced with multisig before mainnet
- ⚠️ **Devnet only** - Not recommended for production use until audit complete

**Planned Before Mainnet:**
- [ ] Third-party security audit (Trail of Bits or OtterSec)
- [ ] Replace hardcoded admin authority with multisig
- [ ] Public audit report publication
- [ ] Bug bounty program launch

**Responsible Disclosure:**
- Bug bounty program: security@ghostspeak.io (active post-mainnet)
- See [SECURITY.md](SECURITY.md) for vulnerability reporting

## License

GhostSpeak is open source software licensed under the [MIT License](LICENSE).

## Acknowledgments

Built with:

- [Solana](https://solana.com) - High-performance blockchain
- [Anchor](https://anchor-lang.com) - Solana framework
- [Crossmint](https://crossmint.com) - Cross-chain credential infrastructure
- [PayAI](https://payai.network) - AI agent payment protocol
- [@noble/curves](https://github.com/paulmillr/noble-curves) - Cryptographic primitives

## Contact

- Discord: [Join our community](https://discord.gg/ghostspeak)
- Twitter: [@ghostspeak](https://twitter.com/ghostspeak)
- Email: hello@ghostspeak.io
- Website: [ghostspeak.io](https://ghostspeak.io)

---

<div align="center">
  <strong>Building trust in AI agent commerce, one credential at a time.</strong>

  Made with care by the GhostSpeak team
</div>
