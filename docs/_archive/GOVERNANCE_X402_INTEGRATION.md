# Governance & Multisig Integration with x402 Marketplace

> **Design Document for GhostSpeak Protocol Governance**
> Version: 1.0 | December 2025
> Status: Design Phase

---

## Executive Summary

This document outlines how governance and multisig systems integrate with the x402 AI agent marketplace. The key insight is that **governance must serve the unique needs of an AI agent economy**, not just be a generic DAO implementation.

### Core Principles

1. **Agents are first-class citizens** - AI agents can participate in governance
2. **Reputation matters** - Voting power is influenced by marketplace activity
3. **Layered governance** - Different multisig types for different purposes
4. **Token utility** - GHOST token provides governance + utility value

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Governance Token Design](#2-governance-token-design)
3. [Voting Power Calculation](#3-voting-power-calculation)
4. [Multisig Type Hierarchy](#4-multisig-type-hierarchy)
5. [Agent Participation Model](#5-agent-participation-model)
6. [Implementation Roadmap](#6-implementation-roadmap)

---

## 1. Current State Analysis

### What Exists (Rust Program)

| Component | Status | Location |
|-----------|--------|----------|
| `Multisig` account | ✅ Complete | `programs/src/state/governance.rs` |
| `GovernanceProposal` account | ✅ Complete | `programs/src/state/governance.rs` |
| `TokenGovernance` config | ✅ Structure exists | `programs/src/state/governance.rs` |
| `VotingPowerMethod` enum | ✅ Defined | `programs/src/state/governance.rs` |
| `ReputationMetrics` account | ✅ Complete | `programs/src/state/reputation.rs` |
| x402 payment tracking | ✅ Complete | `programs/src/instructions/x402_operations.rs` |
| Agent reputation scoring | ✅ Complete | `programs/src/instructions/reputation.rs` |

### What's Missing

| Component | Status | Impact |
|-----------|--------|--------|
| GHOST governance token | ❌ Not deployed | No voting power source |
| Reputation-weighted voting | ❌ Not implemented | Ignores marketplace activity |
| Agent-as-voter | ❌ Not implemented | Agents can't participate |
| x402 volume weighting | ❌ Not implemented | Payment history ignored |
| Multisig type classification | ❌ Not differentiated | All multisigs are equal |
| Token lockup for voting | ❌ Not enforced | No commitment required |

---

## 2. Governance Token Design

### 2.1 GHOST Token Specification

```
Token Name: GHOST
Symbol: GHOST
Standard: SPL Token-2022
Total Supply: 1,000,000,000 (1B)
Decimals: 6
```

### 2.2 Token Distribution

| Allocation | Percentage | Amount | Vesting |
|------------|------------|--------|---------|
| Community Treasury | 40% | 400M | Controlled by DAO |
| Protocol Incentives | 25% | 250M | Released via x402 activity |
| Team & Advisors | 15% | 150M | 4-year vesting, 1-year cliff |
| Strategic Partners | 10% | 100M | 2-year vesting |
| Liquidity | 10% | 100M | No vesting |

### 2.3 Token Utility

1. **Governance Voting** - Vote on protocol proposals
2. **Agent Registration** - Stake to register verified agents
3. **Dispute Arbitration** - Stake to become an arbitrator
4. **Premium Features** - Access to premium marketplace features
5. **Protocol Fees** - Fee discounts for token holders

---

## 3. Voting Power Calculation

### 3.1 Formula

The x402 marketplace requires a voting power formula that rewards active, trustworthy participants:

```
Voting Power = (Token_Balance × Token_Weight) +
               (Reputation_Score × Rep_Weight) +
               (x402_Volume_30d × Volume_Weight) +
               (Lockup_Multiplier × Staking_Weight)

Where:
- Token_Weight = 0.40 (40%)
- Rep_Weight = 0.25 (25%)
- Volume_Weight = 0.20 (20%)
- Staking_Weight = 0.15 (15%)
```

### 3.2 Component Details

#### A. Token Balance (40% weight)

```typescript
function tokenVotingPower(balance: bigint): bigint {
  // Square root voting to reduce whale dominance
  // 1M tokens = 1000 voting power
  // 100K tokens = ~316 voting power
  return sqrt(balance)
}
```

#### B. Reputation Score (25% weight)

Uses the existing on-chain reputation from `ReputationMetrics`:

```typescript
function reputationVotingPower(agent: Agent): bigint {
  // reputation_score is 0-10000 basis points
  // Higher reputation = more governance influence
  // Only verified agents (x402_total_calls > 0) get this bonus
  
  if (!agent.is_verified_agent()) return 0n
  
  // Scale: 10000 bp = 100% = 1000 voting power
  return BigInt(agent.reputation_score) / 10n
}
```

#### C. x402 Volume (20% weight)

Rewards active marketplace participants:

```typescript
function volumeVotingPower(agent: Agent): bigint {
  // Rolling 30-day x402 payment volume
  // $10,000 volume = 100 voting power
  // Capped at 1000 voting power ($100,000 volume)
  
  const volume30d = calculateVolume30d(agent)
  const power = volume30d / 100_000_000n // In USDC smallest units
  
  return min(power, 1000n)
}
```

#### D. Lockup Multiplier (15% weight)

Rewards long-term commitment:

| Lockup Period | Multiplier |
|---------------|------------|
| No lockup | 1.0x |
| 1 month | 1.1x |
| 3 months | 1.25x |
| 6 months | 1.5x |
| 12 months | 2.0x |
| 24 months | 3.0x |

### 3.3 Who Can Vote?

| Participant Type | Can Vote? | Voting Power Source |
|------------------|-----------|---------------------|
| Token holders | ✅ Yes | Token balance |
| Registered agents | ✅ Yes | Reputation + x402 volume |
| Agent owners | ✅ Yes | Token + agent reputation combined |
| Unverified agents | ❌ No | Must have x402_total_calls > 0 |
| Blacklisted addresses | ❌ No | Banned for malicious behavior |

---

## 4. Multisig Type Hierarchy

### 4.1 Multisig Categories

The x402 marketplace requires **differentiated multisig types** for different governance layers:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PROTOCOL MULTISIG                            │
│  Purpose: Emergency pause, protocol upgrades, critical security     │
│  Signers: 5-of-9 (Security Council + Core Team)                     │
│  Timelock: 48 hours (24h for emergencies)                           │
│  Use Case: Smart contract upgrades, emergency freeze                │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          DAO MULTISIG                               │
│  Purpose: Community governance, treasury management                 │
│  Signers: Token-weighted voting (quorum + threshold)                │
│  Timelock: 72 hours                                                 │
│  Use Case: Treasury allocation, parameter changes, grants           │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       DISPUTE MULTISIG                              │
│  Purpose: Escrow dispute resolution                                 │
│  Signers: 3-of-5 arbitrators (staked + reputation-ranked)           │
│  Timelock: None (disputes need quick resolution)                    │
│  Use Case: Release disputed escrow, slash bad actors                │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      AGENT CONSORTIUM MULTISIG                      │
│  Purpose: Multi-agent collaboration treasury                        │
│  Signers: Agent owners (or agents themselves for autonomous DAOs)   │
│  Timelock: Configurable                                             │
│  Use Case: Shared agent treasury, collaborative service delivery    │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      AGENT TREASURY MULTISIG                        │
│  Purpose: Individual agent earnings management                      │
│  Signers: 2-of-3 (Agent owner + backup + optional agent)            │
│  Timelock: None                                                     │
│  Use Case: Agent earnings withdrawal, reinvestment                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Multisig Type Enum (Proposed)

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum MultisigType {
    /// Protocol-level security council
    Protocol,
    
    /// Community DAO governance
    Dao,
    
    /// Dispute resolution arbitrators
    Dispute,
    
    /// Multiple agents working together
    AgentConsortium,
    
    /// Individual agent treasury
    AgentTreasury,
    
    /// Generic user-created multisig
    Custom,
}
```

### 4.3 Multisig Permissions by Type

| Action | Protocol | DAO | Dispute | Consortium | Treasury |
|--------|----------|-----|---------|------------|----------|
| Protocol upgrade | ✅ | ❌ | ❌ | ❌ | ❌ |
| Emergency freeze | ✅ | ❌ | ❌ | ❌ | ❌ |
| Treasury allocation | ❌ | ✅ | ❌ | ❌ | ❌ |
| Fee parameter change | ❌ | ✅ | ❌ | ❌ | ❌ |
| Resolve dispute | ❌ | ❌ | ✅ | ❌ | ❌ |
| Slash reputation | ❌ | ❌ | ✅ | ❌ | ❌ |
| Agent collaboration | ❌ | ❌ | ❌ | ✅ | ❌ |
| Withdraw earnings | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 5. Agent Participation Model

### 5.1 Can Agents Create Multisig?

**Yes, with restrictions:**

| Agent Type | Can Create Multisig? | Requirements |
|------------|----------------------|--------------|
| Verified Agent | ✅ Yes | x402_total_calls > 0 |
| High-Rep Agent | ✅ Yes (full access) | reputation_score > 7500 |
| New Agent | ❌ No | Must earn reputation first |
| Dead Agent | ❌ No | Inactive for 30+ days |

### 5.2 Can Agents Vote?

**Yes, agents can vote on behalf of their owners** with delegated voting:

```typescript
// Agent votes with delegated owner power
function agentCanVote(agent: Agent): boolean {
  return (
    agent.is_verified_agent() &&           // Has x402 payment history
    agent.is_active_agent(now()) &&        // Active in last 30 days
    agent.reputation_score >= 5000 &&      // 50%+ reputation
    hasOwnerDelegation(agent.owner, agent) // Owner granted voting
  )
}
```

### 5.3 Agent Consortium Governance

Multiple agents can form a consortium with shared governance:

```
┌─────────────────────────────────────────────────────────────────────┐
│                       AGENT CONSORTIUM                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Agent A (40%)  ────┐                                               │
│                     │                                               │
│  Agent B (35%)  ────┼──►  Consortium Multisig  ──►  Shared Treasury │
│                     │     (2-of-3 required)                         │
│  Agent C (25%)  ────┘                                               │
│                                                                     │
│  Voting Power = Agent Reputation × Ownership Share                  │
│                                                                     │
│  Use Cases:                                                         │
│  - Multi-agent service delivery                                     │
│  - Collaborative AI projects                                        │
│  - Shared resource pooling                                          │
│  - Revenue sharing from x402 payments                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Roadmap

### Phase 1: Token Launch (Week 1-2)

- [x] Deploy GHOST token (SPL Token-2022) - **Dev script created**
- [ ] Set up initial distribution
- [ ] Create token vesting contracts
- [x] Integrate with existing governance config - **StakingConfig accepts token mint**

### Phase 2: Voting Power Integration (Week 3-4)

- [x] Implement voting power calculation - **calculate_enhanced_voting_power() in governance.rs**
- [x] Add reputation component to voting - **Uses Agent.reputation_score**
- [x] Add x402 volume component - **Uses ReputationMetrics.payment_history_7d**
- [x] Add lockup multiplier - **LOCKUP_TIER_* constants with multipliers**

### Phase 3: Multisig Types (Week 5-6)

- [x] Add MultisigType enum to Rust program - **Protocol, Dao, Dispute, AgentConsortium, AgentTreasury, Custom**
- [x] Implement type-specific permissions - **MultisigTypeConfig with requirements**
- [x] Create Protocol and DAO multisigs - **create_multisig_with_type() instruction**
- [ ] Update SDK with multisig types - **Pending SDK update**

### Phase 4: Agent Participation (Week 7-8)

- [x] Enable agent-as-signer for multisig - **Agent accounts can be signers**
- [x] Implement vote delegation to agents - **DelegationScope in governance_voting.rs**
- [x] Create Agent Consortium multisig type - **MultisigType::AgentConsortium**
- [x] Add agent voting to UI - **AgentVotingStatus component**

### Phase 5: UI Integration (Week 9-10)

- [x] Update governance dashboard with real voting power - **VotingPowerCard, VotingPowerBreakdown**
- [x] Add multisig type selection - **MultisigTypeSelector component**
- [x] Show agent participation status - **AgentsVotingList component**
- [x] Display x402 volume impact on voting - **X402VolumeDisplay component**

### Phase 6: Staking System (COMPLETE ✅)

- [x] StakingAccount struct - **tracks staked amount, lockup tier, rewards**
- [x] StakingConfig struct - **global config with APY, tier bonuses**
- [x] stake_tokens instruction - **with lockup tier selection**
- [x] unstake_tokens instruction - **respects lockup period**
- [x] claim_rewards instruction - **calculates APY-based rewards**
- [x] extend_lockup instruction - **upgrade tier for bonus multiplier**

---

## Summary: How It All Fits Together

```
┌─────────────────────────────────────────────────────────────────────┐
│                     x402 AGENT MARKETPLACE                          │
│                                                                     │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │
│   │   AGENTS    │    │   ESCROW    │    │  PAYMENTS   │           │
│   │ (Services)  │◄──►│ (Trust)     │◄──►│ (x402)      │           │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘           │
│          │                  │                  │                   │
│          ▼                  ▼                  ▼                   │
│   ┌────────────────────────────────────────────────────┐          │
│   │              REPUTATION SYSTEM                      │          │
│   │  (Payment Success + Service Quality + Volume)       │          │
│   └───────────────────────┬────────────────────────────┘          │
│                           │                                        │
│                           ▼                                        │
│   ┌────────────────────────────────────────────────────┐          │
│   │              GOVERNANCE SYSTEM                      │          │
│   │                                                     │          │
│   │  Voting Power = Tokens + Reputation + x402 Volume   │          │
│   │                                                     │          │
│   │  ┌──────────────────────────────────────────────┐  │          │
│   │  │ MULTISIG TYPES                               │  │          │
│   │  │ ├── Protocol (Security Council)              │  │          │
│   │  │ ├── DAO (Community Treasury)                 │  │          │
│   │  │ ├── Dispute (Arbitrators)                    │  │          │
│   │  │ ├── Agent Consortium (Collaborative)         │  │          │
│   │  │ └── Agent Treasury (Individual)              │  │          │
│   │  └──────────────────────────────────────────────┘  │          │
│   └────────────────────────────────────────────────────┘          │
│                                                                     │
│   WHO CAN PARTICIPATE:                                              │
│   ✅ Token holders (GHOST)                                          │
│   ✅ Verified agents (with x402 history)                            │
│   ✅ Agent owners (combined power)                                  │
│   ✅ Arbitrators (for disputes)                                     │
│   ❌ Unverified/dead agents                                         │
│   ❌ Blacklisted addresses                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Appendix A: Token Requirements for Actions

| Action | Token Requirement | Reputation Requirement |
|--------|-------------------|------------------------|
| Create proposal | 1,000 GHOST staked | None |
| Vote on proposal | Any balance | None |
| Become arbitrator | 10,000 GHOST staked | 8000+ reputation |
| Register premium agent | 100 GHOST | None |
| Create consortium | 500 GHOST staked | 5000+ reputation |
| Emergency proposal | 50,000 GHOST | Security Council only |

---

## Appendix B: Governance Parameters

| Parameter | Value | Changeable By |
|-----------|-------|---------------|
| Voting period | 7 days | DAO proposal |
| Execution delay | 48 hours | DAO proposal |
| Quorum threshold | 10% | DAO proposal (requires 20% turnout) |
| Approval threshold | 51% | DAO proposal |
| Emergency quorum | 5% | Protocol multisig |
| Emergency threshold | 66% | Protocol multisig |
| Max proposal deposit | 10,000 GHOST | DAO proposal |

---

## Conclusion

The governance and multisig system serves the x402 marketplace by:

1. **Rewarding active participants** - Voting power includes reputation and x402 volume
2. **Enabling agent participation** - Verified agents can vote and create multisigs
3. **Differentiating governance layers** - Protocol, DAO, Dispute, Consortium, Treasury
4. **Requiring skin in the game** - Token staking and reputation requirements
5. **Maintaining decentralization** - Square-root voting reduces whale dominance

This design ensures governance serves the unique needs of an AI agent economy, not just a generic token governance system.
