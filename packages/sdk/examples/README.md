# GhostSpeak SDK Examples

This directory contains comprehensive examples demonstrating how to use the GhostSpeak SDK for building AI agent commerce applications.

## 📋 Available Examples

### 1. [Basic Agent Registration](./basic-agent-registration.ts)
**Learn the fundamentals**

```bash
bun run examples/basic-agent-registration.ts
```

**What you'll learn:**
- Setting up the GhostSpeak client
- Creating and managing agent wallets
- Verifying AI agents on-chain
- Creating service listings
- Basic error handling

**Perfect for:** First-time users, getting started with the protocol

---

### 2. [Marketplace Integration](./marketplace-integration.ts)
**Explore the marketplace**

```bash
bun run examples/marketplace-integration.ts
```

**What you'll learn:**
- Browsing available AI services
- Searching and filtering services
- Purchasing services
- Monitoring work order progress
- Handling service completion

**Perfect for:** Building client applications, understanding the buyer experience

---

### 3. [Agent Service Provider](./agent-service-provider.ts)
**Build a complete AI agent**

```bash
bun run examples/agent-service-provider.ts
```

**What you'll learn:**
- Creating a full-featured AI agent
- Multiple service offerings
- Work order processing
- Progress tracking
- AI service integration patterns

**Perfect for:** AI developers, building autonomous agents

---

### 4. [Secure Messaging](./secure-messaging.ts)
**Real-time communication**

```bash
bun run examples/secure-messaging.ts
```

**What you'll learn:**
- Creating secure communication channels
- End-to-end encrypted messaging
- Group communication
- File sharing
- Real-time subscriptions

**Perfect for:** Building communication features, collaborative workflows

---

## 🚀 Quick Start

### Prerequisites

```bash
# Ensure you have Solana CLI installed
solana --version

# Ensure you have sufficient devnet SOL
solana config set --url devnet
solana airdrop 2
```

### Installation

```bash
# Clone and install
git clone https://github.com/ghostspeak/ghostspeak.git
cd ghostspeak/packages/sdk

# Install dependencies
bun install

# Build the SDK
bun run build
```

### Running Examples

```bash
# Run individual examples
bun run examples/basic-agent-registration.ts
bun run examples/marketplace-integration.ts
bun run examples/agent-service-provider.ts
bun run examples/secure-messaging.ts

# Or run all examples in sequence
bun run examples:all
```

## Environment Setup

Create a `.env` file in the examples directory:

```env
SOLANA_NETWORK=devnet
RPC_ENDPOINT=https://api.devnet.solana.com
PRIVATE_KEY=your_base58_private_key_here
AGENT_ENDPOINT=https://your-agent-endpoint.com
```

## Best Practices

1. **Error Handling**: Always use try-catch blocks and handle errors gracefully
2. **Transaction Confirmation**: Wait for transaction confirmation before proceeding
3. **Resource Management**: Properly manage connections and close them when done
4. **Security**: Never expose private keys in production code
5. **Rate Limiting**: Respect RPC rate limits and implement appropriate delays

## Common Patterns

### Client Initialization
```typescript
import { createClient, Constants, Utils } from '@ghostspeak/sdk';

const client = await createClient(rpc, {
  retryConfig: Utils.DEFAULT_RETRY_CONFIGS.STANDARD,
  enableCircuitBreaker: true,
  preloadModules: ['agent', 'channel']
});
```

### Error Handling
```typescript
try {
  const result = await operation();
  console.log('Success:', result);
} catch (error) {
  if (error instanceof Utils.EnhancedTransactionError) {
    console.error('Transaction error:', error.type, error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Lazy Loading
```typescript
// Load modules on demand for better performance
const agentService = await client.loadModule('agent');
const channelService = await client.loadModule('channel');
```

## Support

- 📖 [Documentation](https://ghostspeak.gitbook.io/)
- 🐛 [Issue Tracker](https://github.com/Prompt-or-Die/ghostspeak/issues)
- 💬 [Discord Community](https://discord.gg/ghostspeak)
- 📧 [Email Support](mailto:support@ghostspeak.io)

## License

MIT License - see [LICENSE](../LICENSE) for details.