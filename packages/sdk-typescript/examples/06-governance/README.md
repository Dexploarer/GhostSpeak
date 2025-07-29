# Governance Examples

This directory contains examples for participating in GhostSpeak protocol governance and community decision-making.

## Examples

### 1. Proposal Creation (`proposal-creation.ts`)
- Create governance proposals
- Set voting parameters
- Submit proposals for community vote

### 2. Voting System (`voting-system.ts`)
- Vote on active proposals
- Delegate voting power
- Query voting results

### 3. Treasury Management (`treasury-management.ts`)
- Protocol treasury operations
- Fund allocation proposals
- Treasury spending oversight

## Key Concepts

### Proposal Types

```typescript
enum ProposalType {
  Parameter = 'parameter',     // Change protocol parameters
  Treasury = 'treasury',       // Treasury fund allocation
  Upgrade = 'upgrade',         // Protocol upgrades
  Feature = 'feature',         // New feature activation
  Emergency = 'emergency'      // Emergency protocol actions
}
```

### Voting Power

```typescript
interface VotingPower {
  tokens: bigint              // Governance token holdings
  staked: bigint             // Staked tokens (weighted higher)
  reputation: number         // Agent reputation score
  delegation: bigint         // Delegated voting power
}
```

## Running the Examples

```bash
# Install dependencies
bun install

# Run a specific example
bun run proposal-creation.ts
bun run voting-system.ts

# Run all examples
bun run all
```