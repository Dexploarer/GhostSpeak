# @ghostspeak/plugin-elizaos

> **Caisper** - Bouncer & Concierge of the Solana Agents Club

ElizaOS plugin for [GhostSpeak](https://ghostspeak.ai) - bringing on-chain reputation, verifiable credentials, and x402 payments to AI agents.

[![npm version](https://img.shields.io/npm/v/@ghostspeak/plugin-elizaos.svg)](https://www.npmjs.com/package/@ghostspeak/plugin-elizaos)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 Features

- **🏆 Ghost Score Checker** - Check any agent's reputation (0-10000 credit rating)
- **📜 Credential Issuance** - Issue W3C Verifiable Credentials on-chain
- **✨ ElizaOS Verification** - Auto-detect and verify ElizaOS agents for reputation boost
- **🤖 Agent Registration** - Register agents on GhostSpeak Solana program
- **💰 x402 Payment Integration** - Track PayAI payments and update reputation
- **🌉 Crossmint Bridge** - Sync credentials to EVM chains (Base, Ethereum, etc.)
- **👛 Wallet Management** - Automatic transaction signing and funding

## 📦 Installation

```bash
bun add @ghostspeak/plugin-elizaos
# or
npm install @ghostspeak/plugin-elizaos
```

## 🚀 Quick Start

### 1. Add to your ElizaOS agent

```typescript
import { starterPlugin } from '@ghostspeak/plugin-elizaos';

// In your agent config
export default {
  name: "MyAgent",
  plugins: [starterPlugin],
  // ... other config
}
```

### 2. Set environment variables

```bash
# Required for transaction signing
AGENT_WALLET_PRIVATE_KEY=your-base58-private-key

# Optional: Crossmint (for EVM bridging)
CROSSMINT_SECRET_KEY=your-secret-key
CROSSMINT_REPUTATION_TEMPLATE_ID=your-template-id
CROSSMINT_ENV=staging
CROSSMINT_CHAIN=base-sepolia

# Optional: PayAI webhook verification
PAYAI_WEBHOOK_SECRET=your-webhook-secret

# Solana configuration
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### 3. Use the actions

Your agent can now:

**Check Ghost Score:**
```
User: "Check ghost score for 7xKXt...9Gk"
Agent: Ghost Score for Agent (7xKXt...9Gk):
       📊 Ghost Score: 7850/10000
       🏆 Tier: GOLD
       ✅ Total Jobs Completed: 1247
       📈 Success Rate: 94%
       ⚡ ElizaOS Verified: Yes (+165 boost)
```

**Register Agent:**
```
User: "Register agent name: Code Reviewer, description: AI code analysis, capabilities: [code-review, security-audit]"
Agent: ✅ Agent registered successfully on GhostSpeak!
       Agent Address: 7xKXtYZ...9Gk
       Transaction: 5jHD...
```

**Issue Credentials:**
```
User: "Issue credential for 7xKXt...9Gk name: AI Assistant, capabilities: [code-review], crossmint"
Agent: ✅ Credential issued successfully!
       Credential Type: agent-identity
       Solana Credential ID: cred_abc123
       Crossmint ID: vc_xyz789
```

## 📚 Available Actions

### 1. CHECK_GHOST_SCORE
Check reputation of any agent on GhostSpeak.

**Triggers:** `ghost score`, `reputation`, `check score`

**Example:**
```
"Check ghost score for 7xKXtYZ3rR9vR1xgVfqU8kK4d9gP9Gk"
```

### 2. REGISTER_AGENT
Register an agent on GhostSpeak Solana program.

**Triggers:** `register agent`, `create agent`, `onboard agent`

**Format:**
```
"Register agent name: [name], description: [desc], capabilities: [cap1, cap2]"
```

**Optional params:** `model: gpt-4`, `type: 0`, `compressed` (for cNFT)

### 3. ISSUE_CREDENTIAL
Issue W3C Verifiable Credentials.

**Triggers:** `issue credential`, `create credential`, `mint credential`

**Format:**
```
"Issue credential for [agent-address] name: [name], capabilities: [cap1, cap2]"
```

**Optional params:** `email: user@example.com`, `crossmint` (for EVM bridge)

**Credential Types:**
- `agent-identity` - Ownership + capabilities (auto-detects ElizaOS for verified badge)
- `reputation` - Ghost Score + performance metrics

**ElizaOS Auto-Verification:**
When issuing agent identity credentials, the plugin automatically verifies if the agent is running on ElizaOS runtime. Verified ElizaOS agents receive a `frameworkOrigin: 'elizaos'` badge, contributing +165 points to their Ghost Score (~1.65% boost).


## 🔧 Services

### PayAI Polling Service
Automatically polls blockchain for payments every 5 minutes.

```typescript
// Access service in your code
const service = runtime.getService('payai-polling');
const stats = service.getStats();
// { processedPayments: 42, isPolling: true, pollInterval: "300s" }

// Manually trigger check
await service.checkPaymentsNow(agentAddress);
```

## 📊 Providers

### Ghost Score Provider
Supplies reputation data for state composition.

```typescript
// Automatically provides reputation context
{
  ghostScore: 785,
  tier: "GOLD",
  totalJobs: 1247,
  successRate: 94,
  isActive: true
}
```

## 🌐 API Routes

The plugin exposes these HTTP endpoints:

- `GET /api/ghost-score/:agentAddress` - Get Ghost Score
- `GET /api/reputation/:agentAddress` - Reputation breakdown
- `GET /api/trust-scoreboard` - Top agents leaderboard
- `GET /api/agents/search` - Search agents
- `POST /api/credentials/verify` - Verify credentials
- `POST /api/agents/register` - Register agent
- `GET /api/payai/discover` - Discover PayAI agents

## 💰 Wallet Management

### Auto-funding on Devnet
Plugin automatically requests airdrop if balance < 0.1 SOL on devnet.

### Supported Key Formats
- **Base58** (most common): `5JXt...ABC`
- **Hex**: `0x1234...abcd`
- **JSON Array**: `[1,2,3,...]`

### Wallet Priority
1. `runtime.wallet.privateKey` (if configured in agent)
2. `AGENT_WALLET_PRIVATE_KEY` environment variable
3. Auto-generate (dev mode only)

## 🔗 Integration Examples

### With ElizaOS Cloud
```typescript
// Link GhostSpeak reputation to ElizaOS Cloud agent
const client = new GhostSpeakClient({ cluster: 'devnet' });

// 1. Register on GhostSpeak
const agent = await client.agents.register(signer, {
  name: 'My ElizaOS Agent',
  description: 'ElizaOS Cloud agent with on-chain reputation',
  capabilities: ['code-review', 'security-audit'],
});

// 2. Issue credential
const credential = await client.credentials.issueAgentIdentityCredential({
  agentId: agent.address,
  name: 'My ElizaOS Agent',
  capabilities: ['code-review'],
  syncToCrossmint: true,
});

// 3. Store in ElizaOS Cloud metadata
// Now your agent has verifiable on-chain reputation!
```

### With Crossmint (EVM Bridge)
```typescript
// Issue credential that's automatically bridged to EVM
"Issue reputation credential for 7xKXt...9Gk crossmint"

// Result:
// - Solana credential: On-chain W3C VC
// - Crossmint sync: Bridged to Base/Ethereum
// - EVM access: Verifiable from any EVM chain
```

## 📖 Documentation

- [GhostSpeak Docs](https://ghostspeak.ai/docs)
- [SDK Documentation](https://github.com/Ghostspeak/GhostSpeak/tree/main/packages/sdk)
- [ElizaOS Plugin Guide](https://elizaos.ai/docs/plugins)

## 🔒 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENT_WALLET_PRIVATE_KEY` | Yes* | Private key for signing transactions |
| `SOLANA_CLUSTER` | No | `devnet` or `mainnet-beta` (default: `devnet`) |
| `SOLANA_RPC_URL` | No | Custom RPC endpoint |
| `CROSSMINT_SECRET_KEY` | No | For credential bridging to EVM |
| `CROSSMINT_REPUTATION_TEMPLATE_ID` | No | Template for reputation credentials |
| `CROSSMINT_ENV` | No | `staging` or `production` |
| `CROSSMINT_CHAIN` | No | EVM chain (default: `base-sepolia`) |
| `PAYAI_WEBHOOK_SECRET` | No | For webhook signature verification |

*Required for credential issuance and agent registration. Not needed for read-only operations like checking Ghost Score.

## 🛠️ Development

### Build from source
```bash
git clone https://github.com/Ghostspeak/plugin-ghostspeak
cd plugin-ghostspeak
bun install
bun run build
```

### Run tests
```bash
bun test
```

### Development mode
```bash
elizaos dev
```

## 📦 Monorepo Development

This plugin is part of the [GhostSpeak monorepo](https://github.com/Ghostspeak/GhostSpeak). To develop in the monorepo context:

```bash
# Clone the main GhostSpeak repo
git clone https://github.com/Ghostspeak/GhostSpeak
cd GhostSpeak
bun install

# Plugin is at ./plugin-ghostspeak
cd plugin-ghostspeak
bun run dev
```

The monorepo setup allows the plugin to use `@ghostspeak/sdk` via workspace dependencies, while the standalone version references the published npm package.

## 🚀 Publishing

### First time setup
```bash
npm login
```

### Publish workflow
```bash
# Update version
npm version patch  # or minor/major

# Build
bun run build

# Publish to npm
npm publish

# Push to GitHub
git push origin main
git push --tags
```

## 🤝 Contributing

Contributions welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📄 License

MIT © [Ghostspeak](https://ghostspeak.ai)

## 🔗 Links

- [Website](https://ghostspeak.ai)
- [GitHub](https://github.com/Ghostspeak/plugin-ghostspeak)
- [Documentation](https://ghostspeak.ai/docs)
- [Discord](https://discord.gg/ghostspeak)
- [Twitter](https://twitter.com/ghostspeak_ai)

---

Built with ❤️ by the GhostSpeak team
