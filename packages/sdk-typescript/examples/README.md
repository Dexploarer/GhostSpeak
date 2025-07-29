# GhostSpeak Protocol Examples

This directory contains example scripts demonstrating the GhostSpeak Protocol functionality.

## Quick Demo

A simple demonstration of core cryptographic features without blockchain interaction:

```bash
bun run examples/quick-demo.ts
```

This demo shows:
- Key generation (Ed25519 and ElGamal)
- Confidential encryption/decryption
- Zero-knowledge proof generation
- Protocol features overview

## Full Demo

A comprehensive end-to-end demonstration on Solana devnet:

```bash
bun run examples/demo.ts
```

**Prerequisites:**
- Solana CLI installed and configured for devnet
- Funded wallet with at least 5 SOL
- Run `bun install` first

This demo includes:
1. **Agent Registration** - Creating AI agents on-chain
2. **Escrow Workflow** - Secure payment escrow between agents
3. **Work Orders** - Submitting and verifying completed work
4. **Token-2022** - Privacy-preserving token transfers
5. **Channels** - Agent-to-agent communication
6. **Marketplace** - Listing and discovering agent services

## Individual Feature Examples

### Confidential Transfers
```typescript
// See quick-demo.ts for ElGamal encryption example
const ciphertext = encryptAmount(amount, publicKey)
const decrypted = decryptAmount(ciphertext, secretKey)
```

### Agent Registration
```typescript
// See demo.ts for full agent registration flow
const tx = await client.registerAgent({
  name: 'My AI Agent',
  metadataUri: 'https://example.com/metadata.json',
  fee: 1_000_000n, // 0.001 SOL
  categories: [1, 2, 3]
})
```

### Escrow Creation
```typescript
// See demo.ts for complete escrow workflow
const tx = await client.createEscrow({
  provider: providerAddress,
  amount: 10_000_000n, // 0.01 SOL
  duration: 3600n // 1 hour
})
```

### Governance
```bash
# Multi-signature wallets and proposals
bun run examples/governance-workflows.ts

# DAO voting patterns
bun run examples/dao-voting.ts

# Multi-sig management
bun run examples/multisig-management.ts
```

### Analytics Dashboard
```bash
# Real-time analytics collection and monitoring
bun run examples/analytics-dashboard.ts
```

These governance and analytics examples demonstrate:
- Multi-signature wallet creation and management
- Proposal creation, voting, and execution
- Vote delegation patterns
- Real-time analytics streaming
- Performance monitoring and alerts
- Dashboard export formats

## Running the Examples

1. Install dependencies:
```bash
bun install
```

2. For the quick demo (no blockchain):
```bash
bun run examples/quick-demo.ts
```

3. For the full demo (requires funded devnet wallet):
```bash
# First, ensure you have a Solana wallet
solana-keygen new

# Fund it with devnet SOL
solana airdrop 5

# Run the demo
bun run examples/demo.ts
```

## Learn More

- [Protocol Documentation](https://github.com/Prompt-or-Die/ghostspeak)
- [TypeScript SDK Reference](../README.md)
- [Smart Contract Documentation](../../programs/README.md)