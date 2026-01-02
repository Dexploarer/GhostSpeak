# @ghostspeak/solana-agent-kit-plugin

**Universal AI Agent Identity & Reputation Plugin for solana-agent-kit**

[![npm version](https://img.shields.io/npm/v/@ghostspeak/solana-agent-kit-plugin.svg)](https://www.npmjs.com/package/@ghostspeak/solana-agent-kit-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 Why This Plugin?

**solana-agent-kit has NO identity layer** - agents can perform Solana operations but have no persistent identity, reputation, or cross-platform verification.

**GhostSpeak fills this gap** by providing:
- ✅ **Universal Agent Identity** - Persistent on-chain Ghost identity
- ✅ **Ghost Score** - Reputation system (0-1000) based on credentials, transactions, and verification
- ✅ **Cross-Platform IDs** - Resolve PayAI, ElizaOS, GitHub, Twitter IDs to Solana addresses
- ✅ **Verifiable Credentials** - W3C-compliant credentials for agents
- ✅ **DID Support** - Decentralized Identifiers for cross-chain identity

## 🚀 Quick Start

### Installation

```bash
bun install solana-agent-kit @ghostspeak/solana-agent-kit-plugin

# or with npm
npm install solana-agent-kit @ghostspeak/solana-agent-kit-plugin
```

### Basic Usage

```typescript
import { SolanaAgentKit } from 'solana-agent-kit';
import { GhostPlugin } from '@ghostspeak/solana-agent-kit-plugin';

// Initialize agent with Ghost identity plugin
const agent = new SolanaAgentKit(
  wallet,
  'https://api.devnet.solana.com',
  {}
).use(GhostPlugin);

// Now your agent has Ghost identity methods!
const identity = await agent.methods.getGhostIdentity(agentAddress);
console.log(`Agent: ${identity.name} (Score: ${identity.ghostScore}/1000)`);
```

## 📚 Features

### 1. Get Ghost Identity

Retrieve full identity profile for any agent:

```typescript
const identity = await agent.methods.getGhostIdentity(
  '7xKXtg2CW87d97TXJSDpbD5jBkhetqA83TZRuJosgAsU'
);

console.log(identity);
// {
//   ghostAddress: '7xKXtg2CW87d97TXJSDpbD5jBkhetqA83TZRuJosgAsU',
//   name: 'PayAI Assistant',
//   description: 'AI agent specialized in payment processing',
//   owner: 'BrG44HdsEhzapvs8bEqzvkq4egwevS3fRE6ze2ENo6S8',
//   status: 'Verified',
//   ghostScore: 850,
//   reputationScore: 4500,
//   externalIdentifiers: [
//     { platform: 'payai', externalId: 'agent-123', verified: true }
//   ],
//   didAddress: 'did:sol:7xKXtg2CW87d97TXJSDpbD5jBkhetqA83TZRuJosgAsU',
//   isVerified: true
// }
```

### 2. Resolve External IDs

Map platform-specific IDs to Ghost addresses:

```typescript
// Resolve PayAI agent ID
const ghostAddress = await agent.methods.resolveExternalId({
  platform: 'payai',
  externalId: 'agent-123'
});

// Resolve ElizaOS agent ID
const elizaGhost = await agent.methods.resolveExternalId({
  platform: 'elizaos',
  externalId: 'eliza-bot-456'
});
```

**Supported platforms:**
- `payai` - PayAI Network agents
- `elizaos` - ElizaOS framework agents
- `github` - GitHub-verified agents
- `twitter` - Twitter/X-verified agents
- Custom platforms defined by facilitators

### 3. Get Ghost Score (Reputation)

Check an agent's trust score before interacting:

```typescript
const score = await agent.methods.getGhostScore(ghostAddress);

console.log(`Score: ${score.score}/${score.maxScore}`);
console.log('Components:', score.components);
// [
//   { source: 'credentials', score: 250, weight: 0.3 },
//   { source: 'transactions', score: 200, weight: 0.25 },
//   { source: 'staking', score: 150, weight: 0.2 },
//   ...
// ]
```

**Score ranges:**
- **0-300**: Unverified/Low trust
- **300-500**: Basic verification
- **500-800**: Verified and trusted
- **800-1000**: Elite reputation

### 4. Verify Ghost Identity

Comprehensive verification check:

```typescript
const verification = await agent.methods.verifyGhost(ghostAddress);

console.log(verification);
// {
//   isVerified: true,
//   ghostScore: 850,
//   reputationScore: 4500,
//   verificationLevel: 'elite',  // unverified | basic | verified | elite
//   credentials: ['kyc_verified', 'service_provider', 'payai_integration']
// }

if (verification.verificationLevel === 'elite') {
  console.log('✅ Highly trusted agent');
} else if (verification.verificationLevel === 'unverified') {
  console.log('⚠️ Proceed with caution');
}
```

### 5. Check External ID Existence

```typescript
const exists = await agent.methods.checkExternalIdExists({
  platform: 'payai',
  externalId: 'agent-123'
});

if (exists) {
  console.log('Agent is registered on PayAI');
}
```

### 6. Get All External IDs

```typescript
const externalIds = await agent.methods.getExternalIds(ghostAddress);

externalIds.forEach(id => {
  console.log(`${id.platform}:${id.externalId} (verified: ${id.verified})`);
});
// payai:agent-123 (verified: true)
// github:ai-dev-007 (verified: true)
// twitter:@my_ai_agent (verified: false)
```

## 🤖 AI Framework Integration

The plugin automatically exposes actions to AI frameworks (OpenAI, Vercel AI SDK, LangChain, etc.):

### Available Actions

1. **GET_GHOST_IDENTITY** - Get full Ghost profile
2. **RESOLVE_EXTERNAL_ID** - Map platform ID to Ghost address
3. **GET_GHOST_SCORE** - Get reputation score
4. **VERIFY_GHOST** - Comprehensive verification check

### Example with OpenAI

```typescript
import { createOpenAITools } from 'solana-agent-kit/adapters/openai';

const tools = createOpenAITools(agent);

const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    {
      role: 'user',
      content: 'What is the reputation score of PayAI agent agent-123?'
    }
  ],
  tools: tools,
  tool_choice: 'auto'
});

// AI will automatically use RESOLVE_EXTERNAL_ID + GET_GHOST_SCORE
```

## ⚙️ Configuration

### Custom Configuration

```typescript
import { createGhostPlugin } from '@ghostspeak/solana-agent-kit-plugin';

const agent = new SolanaAgentKit(wallet, RPC_URL, {})
  .use(createGhostPlugin({
    cluster: 'mainnet-beta',  // devnet | mainnet-beta | testnet | localnet
    apiUrl: 'https://custom-api.example.com',  // Optional custom API
    verbose: true  // Enable logging
  }));
```

### Network Configuration

**Devnet (default):**
```typescript
.use(GhostPlugin)  // Uses devnet by default
```

**Mainnet:**
```typescript
.use(createGhostPlugin({ cluster: 'mainnet-beta' }))
```

**Local development:**
```typescript
.use(createGhostPlugin({
  cluster: 'localnet',
  apiUrl: 'http://localhost:3001'
}))
```

## 🔗 Integration with PayAI

GhostSpeak is designed for seamless PayAI integration:

```typescript
// Agent receives payment via PayAI x402 protocol
// Ghost automatically tracks reputation

// 1. Resolve PayAI agent to Ghost address
const ghostAddress = await agent.methods.resolveExternalId({
  platform: 'payai',
  externalId: paymentData.agentId
});

// 2. Verify agent before payment
const verification = await agent.methods.verifyGhost(ghostAddress);
if (verification.verificationLevel === 'unverified') {
  console.warn('Warning: Unverified agent');
}

// 3. Proceed with payment
// ... PayAI payment logic ...

// 4. Ghost Score automatically updates based on successful transactions
```

## 📊 Use Cases

### 1. Agent Marketplace

```typescript
// List verified agents
const agents = await getMarketplaceAgents();

for (const agentAddress of agents) {
  const identity = await agent.methods.getGhostIdentity(agentAddress);
  const verification = await agent.methods.verifyGhost(agentAddress);

  if (verification.verificationLevel === 'elite') {
    displayAgent({
      name: identity.name,
      score: identity.ghostScore,
      badge: '⭐ Elite'
    });
  }
}
```

### 2. Secure Agent Collaboration

```typescript
async function canTrustAgent(agentAddress: string): Promise<boolean> {
  const verification = await agent.methods.verifyGhost(agentAddress);

  return verification.ghostScore >= 500 &&
         verification.isVerified &&
         verification.credentials.length > 0;
}

// Before collaboration
if (await canTrustAgent(partnerAgentAddress)) {
  await initiateCollaboration(partnerAgentAddress);
} else {
  console.log('Agent does not meet trust requirements');
}
```

### 3. Cross-Platform Identity

```typescript
// Discover agent across platforms
async function findAgentEverywhere(payaiId: string) {
  // Resolve PayAI ID to Ghost
  const ghostAddress = await agent.methods.resolveExternalId({
    platform: 'payai',
    externalId: payaiId
  });

  // Get all platform IDs
  const externalIds = await agent.methods.getExternalIds(ghostAddress);

  return {
    ghost: ghostAddress,
    platforms: externalIds.map(id => ({
      platform: id.platform,
      id: id.externalId,
      verified: id.verified
    }))
  };
}
```

## 🛠️ Development

### Build from Source

```bash
# Clone repository
git clone https://github.com/ghostspeak/ghostspeak.git
cd ghostspeak/packages/solana-agent-kit-plugin

# Install dependencies
bun install

# Build
bun run build

# Type check
bun run type-check
```

## 🤝 Contributing

We welcome contributions! This plugin helps solve a critical gap in solana-agent-kit.

See our [Contributing Guide](../../docs/CONTRIBUTING.md) for details.

## 📖 Documentation

- [GhostSpeak Protocol Docs](https://docs.ghostspeak.ai)
- [solana-agent-kit Docs](https://github.com/sendaifun/solana-agent-kit)
- [API Reference](./docs/API.md)

## 🔗 Links

- [GitHub Repository](https://github.com/ghostspeak/ghostspeak)
- [npm Package](https://www.npmjs.com/package/@ghostspeak/solana-agent-kit-plugin)
- [Discord Community](https://discord.gg/ghostspeak)
- [Twitter](https://twitter.com/ghostspeak_ai)

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details.

---

**Built with ❤️ for autonomous AI agents**

*Filling the identity gap in solana-agent-kit*
