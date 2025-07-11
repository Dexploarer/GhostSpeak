# GhostSpeak SDK Examples

This directory contains comprehensive examples demonstrating how to use the GhostSpeak SDK for building AI agent commerce applications.

## ✨ New: Automatic SOL Airdrop

All examples now include **automatic SOL airdrop functionality** to reduce friction for developers:

- 🚀 **Auto-detection**: Checks balance and airdrops SOL when needed
- 🔄 **Multiple methods**: Tries RPC, CLI, and web faucets
- ⏱️ **Rate limit handling**: Manages devnet limits gracefully  
- 📋 **Clear instructions**: Provides manual options when automation fails
- 💾 **Wallet persistence**: Reuses wallets to avoid repeated airdrops

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
# Ensure you have Node.js 20+ or Bun
node --version  # or: bun --version

# Solana CLI is optional (but helpful for manual airdrops)
solana --version

# No need to manually airdrop - examples handle this automatically!
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

## 💰 Automatic Airdrop Details

The examples use the `airdrop-helper` utility to automatically manage SOL:

```typescript
// Automatic in all examples
const hasBalance = await ensureSufficientBalance(wallet.address, {
  minBalance: 0.01,     // Minimum SOL needed
  airdropAmount: 1,     // Amount to request
  verbose: true         // Show progress
});
```

### Airdrop Methods (tried in order):

1. **RPC Airdrop**: Direct request to Solana devnet
2. **CLI Airdrop**: Uses local Solana CLI if available
3. **Web Faucets**: Shows links to manual faucets

### Manual Airdrop Options

If automatic methods fail, you'll see:

```
🪂 Airdrop Instructions
=====================

1. Solana CLI:
   solana airdrop 1 YOUR_WALLET_ADDRESS

2. Web Faucets:
   • Sol Faucet: https://solfaucet.com
   • QuickNode: https://faucet.quicknode.com/solana/devnet
   • Official: https://faucet.solana.com

3. Rate limit tips:
   • Wait 20-30 seconds between requests
   • Try different faucets
   • Use VPN if blocked
```

## Environment Setup

Create a `.env` file in the examples directory (optional):

```env
SOLANA_NETWORK=devnet
RPC_ENDPOINT=https://api.devnet.solana.com
# Private key not needed - examples create wallets automatically
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

## 🔧 Troubleshooting

### Airdrop Issues

**"Too many requests" error:**
- Wait 20-30 seconds between attempts
- The helper automatically handles rate limits
- Try manual web faucets if persistent

**"Airdrop failed" error:**
- Check devnet status: `solana cluster-version`
- Verify RPC endpoint is accessible
- Use alternative faucets listed in error message

**"Insufficient balance after airdrop":**
- Some operations need more than 0.01 SOL
- Marketplace purchases typically need 0.1+ SOL
- Run airdrop multiple times if needed

### Wallet Issues

**"Wallet already exists":**
- Examples reuse wallets in `./agent-wallet.json` and `./client-wallet.json`
- Delete these files to start fresh
- Or use existing balance to avoid re-airdropping

## Support

- 📖 [Documentation](https://ghostspeak.gitbook.io/)
- 🐛 [Issue Tracker](https://github.com/Prompt-or-Die/ghostspeak/issues)
- 💬 [Discord Community](https://discord.gg/ghostspeak)
- 📧 [Email Support](mailto:support@ghostspeak.io)

## License

MIT License - see [LICENSE](../LICENSE) for details.