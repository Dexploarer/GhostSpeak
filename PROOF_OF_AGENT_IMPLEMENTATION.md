# Proof-of-Agent Implementation

This document describes the proof-of-agent verification system and reputation benchmarking framework implemented in GhostSpeak.

## Overview

The proof-of-agent system provides a mechanism to verify and track agent activity based on x402 payment history, without requiring pay-to-win staking that creates barriers to entry.

## Part A: Simple Proof-of-Agent

### Problem Statement

Need to prevent spam/dead agents **without** pay-to-win staking that creates barriers to entry.

### Solution: Activity-Based Verification

**Core Principle:** Real agents do real work

- **Agent is VERIFIED** = Has completed at least 1 paid x402 transaction
- **Agent is ACTIVE** = Received payment in last 30 days
- **Agent is INACTIVE** = No payment in 30+ days (but has history)
- **Agent is UNVERIFIED** = Has never completed a paid x402 transaction

### Implementation Details

#### Rust State (programs/src/state/agent.rs)

New field added to the `Agent` struct:

```rust
pub last_payment_timestamp: i64, // Timestamp of last x402 payment (for proof-of-agent)
```

Helper methods on the `Agent` struct:

```rust
impl Agent {
    /// Check if agent is verified (has completed at least 1 paid x402 transaction)
    pub fn is_verified_agent(&self) -> bool;

    /// Check if agent is active (received payment in last 30 days)
    pub fn is_active_agent(&self, current_timestamp: i64) -> bool;

    /// Check if agent is dead (has payment history but inactive for 30+ days)
    pub fn is_dead_agent(&self, current_timestamp: i64) -> bool;

    /// Record a payment activity (call this when x402 payment is received)
    pub fn record_payment_activity(&mut self) -> Result<()>;
}
```

#### Rust Instruction (programs/src/instructions/x402_operations.rs)

The `record_x402_payment` instruction now updates `last_payment_timestamp`:

```rust
// Update last payment timestamp for proof-of-agent activity tracking
agent.last_payment_timestamp = ctx.accounts.clock.unix_timestamp;
```

#### TypeScript SDK (packages/sdk-typescript/src/x402/AgentDiscoveryClient.ts)

The `Agent` interface includes:

```typescript
interface Agent {
  // ... other fields
  last_payment_timestamp: bigint
}
```

The `parseAgentAccount` method extracts this field from on-chain data.

#### Agent Status Utilities (packages/sdk-typescript/src/utils/agent-status.ts)

Utility functions for checking agent status:

```typescript
// Check if agent has completed at least 1 x402 transaction
isAgentVerified(agent): boolean

// Check if agent has received payment within threshold (default 30 days)
isAgentActive(agent, config?): boolean

// Check if agent has payment history but no recent activity
isAgentInactive(agent, config?): boolean

// Get comprehensive status enum
getAgentStatus(agent, config?): AgentStatus

// Filter agents by status
filterAgentsByStatus(agents, options): Agent[]

// Sort agents by activity (most recent first)
sortAgentsByActivity(agents): Agent[]

// Human-readable time since last payment
getTimeSinceLastPayment(agent, config?): string

// Summary statistics for agent collection
getAgentStatusSummary(agents, config?): AgentStatusSummary
```

### Usage Examples

```typescript
import {
  isAgentActive,
  filterAgentsByStatus,
  getAgentStatus,
  AgentStatus
} from '@ghostspeak/sdk/utils'

// Check individual agent
const agent = await discoveryClient.getAgent(address)
if (isAgentActive(agent)) {
  console.log('Agent is actively providing services')
}

// Filter for active agents only
const allAgents = await discoveryClient.searchAgents()
const activeAgents = filterAgentsByStatus(allAgents.agents, {
  excludeUnverified: true,
  excludeInactive: true
})

// Get detailed status
const status = getAgentStatus(agent)
switch (status) {
  case AgentStatus.Active:
    console.log('Agent is verified and active')
    break
  case AgentStatus.Inactive:
    console.log('Agent has gone dormant')
    break
  case AgentStatus.Unverified:
    console.log('Agent has not completed paid work')
    break
}
```

## Part B: Reputation Benchmarking Framework

### Overview

The reputation benchmarking framework provides deterministic simulation capabilities for testing the reputation calculation system with reproducible results.

### Key Features

1. **Seeded Random Number Generation** - Uses a Linear Congruential Generator (LCG) for reproducible randomness
2. **Agent Profile Simulation** - Define agent behavior profiles with completion rates, quality levels, and dispute patterns
3. **Attack Scenario Detection** - Test fraud detection against known attack patterns
4. **Performance Benchmarking** - Measure simulation performance for optimization

### Implementation

Located at: `packages/sdk-typescript/tests/benchmarks/reputation/framework/ReputationSimulator.ts`

#### Seeded RNG

```typescript
class SeededRNG {
  constructor(seed: number)
  next(): number           // [0, 1)
  nextInt(min, max): number
  nextBool(probability): boolean
  nextGaussian(mean, stdDev): number
  pick<T>(array): T
  reset(seed): void
}
```

#### Agent Profiles

```typescript
interface AgentProfile {
  agentId: string
  completionRate: number       // 0-1
  avgQuality: number          // 0-100
  qualityVariance: number
  timelinessMultiplier: number // 1.0 = on time
  disputeRate: number         // 0-1
  categories: string[]
  jobsPerPeriod: number
}
```

#### Attack Scenarios

The framework includes 8 predefined attack scenarios:

1. **Sybil Attack** - Multiple agents with identical behavior patterns
2. **Wash Trading** - Artificial job completion for reputation farming
3. **Selective Disputes** - High dispute rate with favorable resolutions
4. **Category Hopping** - Rapid switching between unrelated categories
5. **Legitimate Agent** - Normal agent behavior (control)
6. **New Agent** - New agent building reputation (control)
7. **Expert Agent** - Highly skilled agent (control)
8. **Struggling Agent** - Agent with performance issues but legitimate (control)

### Usage

```typescript
import { ReputationSimulator } from './framework/ReputationSimulator.js'

// Create simulator with fixed seed for reproducibility
const simulator = new ReputationSimulator(42)

// Define agent profile
const profile = {
  agentId: 'test_agent',
  completionRate: 0.9,
  avgQuality: 85,
  qualityVariance: 10,
  timelinessMultiplier: 1.0,
  disputeRate: 0.05,
  categories: ['defi'],
  jobsPerPeriod: 15
}

// Simulate 10 periods
const result = simulator.simulateAgentProgression(profile, 10)

console.log(`Final Score: ${result.finalScore}`)
console.log(`Tier: ${result.finalTier}`)
console.log(`Jobs: ${result.totalJobs}`)
console.log(`Fraud Detections: ${result.fraudDetections}`)

// Run all attack scenarios
const { results, summary } = simulator.runAllScenarios(10)
console.log(`Pass Rate: ${(summary.passRate * 100).toFixed(1)}%`)
```

## Configuration

### Activity Threshold

The default activity threshold is 30 days. This can be customized:

```typescript
const config: AgentStatusConfig = {
  activityThresholdSeconds: 7 * 24 * 60 * 60, // 7 days
  currentTimestamp: Math.floor(Date.now() / 1000)
}

const isActive = isAgentActive(agent, config)
```

## Files Changed

### Rust

- `programs/src/state/agent.rs` - Added `last_payment_timestamp` field and helper methods
- `programs/src/instructions/x402_operations.rs` - Updated to track `last_payment_timestamp`

### TypeScript SDK

- `packages/sdk-typescript/src/x402/AgentDiscoveryClient.ts` - Added `last_payment_timestamp` to Agent interface and extraction
- `packages/sdk-typescript/src/utils/agent-status.ts` - New file with agent status utilities
- `packages/sdk-typescript/src/utils/index.ts` - Export agent status utilities

### Tests

- `packages/sdk-typescript/tests/benchmarks/reputation/framework/ReputationSimulator.ts` - Reputation simulation framework
- `packages/sdk-typescript/tests/benchmarks/reputation/reputation-benchmarks.test.ts` - Benchmark tests

## Future Enhancements

1. **Weighted Activity Scoring** - Consider payment amounts, not just timestamps
2. **Category-Specific Activity** - Track activity per capability category
3. **Decay Mechanism** - Gradual reputation decay for inactive agents
4. **Staking Integration** - Optional staking for enhanced verification (not required)
