# Governance Operations

The Governance module provides decentralized decision-making capabilities through DAOs and multisig wallets in the GhostSpeak protocol.

## Overview

The governance system enables collective decision-making for protocol upgrades, treasury management, and dispute resolution. The `GovernanceInstructions` class manages all governance-related operations.

```typescript
// Access governance operations through the client
const governance = client.governance;
```

## Multisig Wallets

### Create Multisig

```typescript
const multisigAddress = await client.governance.createMultisig(signer, {
  name: "Project Treasury",
  description: "Multisig for managing project funds",
  members: [
    { address: member1Address, weight: 1 },
    { address: member2Address, weight: 1 },
    { address: member3Address, weight: 2 } // Double voting power
  ],
  threshold: 3, // Need 3 votes (considering weights)
  settings: {
    allowMemberChanges: true,
    allowThresholdChanges: true,
    executionDelay: 86400, // 24 hour timelock
    maxMembers: 10
  }
});

console.log("Multisig created:", multisigAddress);
```

### Advanced Multisig

```typescript
// Create multisig with roles and permissions
const advancedMultisig = await client.governance.createAdvancedMultisig(signer, {
  name: "Protocol DAO",
  members: [
    {
      address: adminAddress,
      role: "admin",
      permissions: ["propose", "vote", "execute", "manage_members"]
    },
    {
      address: treasurerAddress,
      role: "treasurer",
      permissions: ["propose", "vote", "execute_treasury"]
    },
    {
      address: memberAddress,
      role: "member",
      permissions: ["propose", "vote"]
    }
  ],
  votingRules: {
    proposalThreshold: 1, // Minimum members to propose
    quorum: 60, // 60% must participate
    passingThreshold: 51, // 51% must approve
    votingPeriod: 259200, // 3 days
    gracePeriod: 86400 // 1 day before execution
  },
  treasuryRules: {
    spendingLimit: {
      daily: 1000000000, // 1 SOL per day
      perTransaction: 100000000 // 0.1 SOL per tx
    },
    requiresApproval: ["transfer", "stake", "swap"],
    whitelist: [/* approved addresses */]
  }
});
```

### Multisig Parameters

```typescript
interface CreateMultisigParams {
  // Required fields
  name: string;                     // Multisig name
  members: Member[];                // Initial members
  threshold: number;                // Approval threshold
  
  // Optional fields
  description?: string;             // Description
  settings?: MultisigSettings;      // Configuration
  votingRules?: VotingRules;       // Voting parameters
  treasuryRules?: TreasuryRules;   // Treasury management
  metadata?: MultisigMetadata;      // Additional data
  initialFunds?: bigint;           // Initial deposit
}

interface Member {
  address: Address;
  weight?: number;                  // Voting weight (default: 1)
  role?: MemberRole;               // Member role
  permissions?: Permission[];       // Specific permissions
  expiresAt?: number;              // Membership expiry
}
```

## Creating Proposals

### Basic Proposal

```typescript
const proposalId = await client.governance.createProposal(signer, multisigAddress, {
  title: "Upgrade Smart Contract",
  description: "Upgrade the protocol to version 2.0 with new features",
  category: "protocol_upgrade",
  actions: [
    {
      type: "execute_transaction",
      target: programAddress,
      instruction: upgradeInstruction,
      data: upgradeData
    }
  ],
  votingPeriod: 432000, // 5 days
  documentation: [
    { title: "Technical Spec", uri: "ipfs://tech-spec" },
    { title: "Audit Report", uri: "ipfs://audit" }
  ]
});

console.log("Proposal created:", proposalId);
```

### Treasury Proposal

```typescript
// Propose treasury action
const treasuryProposal = await client.governance.createTreasuryProposal(
  signer,
  multisigAddress,
  {
    title: "Q1 2024 Budget Allocation",
    description: "Allocate funds for Q1 operations",
    allocations: [
      {
        recipient: developmentAddress,
        amount: 50000000000, // 50 SOL
        purpose: "Development team salaries",
        vesting: {
          enabled: true,
          schedule: "monthly",
          duration: 3 // 3 months
        }
      },
      {
        recipient: marketingAddress,
        amount: 20000000000, // 20 SOL
        purpose: "Marketing campaigns"
      },
      {
        recipient: auditAddress,
        amount: 10000000000, // 10 SOL
        purpose: "Security audit"
      }
    ],
    totalBudget: 80000000000, // 80 SOL
    executionSchedule: "immediate",
    reportingRequirements: [
      "Monthly progress report",
      "Expense breakdown",
      "KPI metrics"
    ]
  }
);
```

### Parameter Change Proposal

```typescript
// Propose protocol parameter changes
const parameterProposal = await client.governance.createParameterProposal(
  signer,
  multisigAddress,
  {
    title: "Adjust Protocol Fees",
    description: "Reduce trading fees to increase volume",
    changes: [
      {
        parameter: "trading_fee",
        currentValue: 30, // 0.3%
        newValue: 25, // 0.25%
        justification: "Competitive pressure from other protocols"
      },
      {
        parameter: "withdrawal_fee",
        currentValue: 10, // 0.1%
        newValue: 5, // 0.05%
        justification: "Improve user experience"
      }
    ],
    analysis: {
      projectedImpact: "15% increase in volume, 5% decrease in revenue",
      riskAssessment: "Low risk, reversible if needed",
      competitorComparison: "ipfs://competitor-analysis"
    },
    testnet: {
      tested: true,
      results: "ipfs://testnet-results",
      duration: 604800 // Tested for 1 week
    }
  }
);
```

### Emergency Proposal

```typescript
// Create emergency proposal (shorter voting period)
const emergencyProposal = await client.governance.createEmergencyProposal(
  signer,
  multisigAddress,
  {
    title: "Emergency: Pause Protocol",
    description: "Critical vulnerability discovered, need to pause immediately",
    severity: "critical",
    actions: [
      {
        type: "pause_protocol",
        components: ["trading", "deposits", "withdrawals"]
      }
    ],
    evidence: [
      { title: "Vulnerability Report", uri: "ipfs://security-report" },
      { title: "Exploit PoC", uri: "ipfs://proof-of-concept" }
    ],
    votingPeriod: 3600, // 1 hour only
    executionDelay: 0, // Execute immediately after passing
    requiredApprovals: 2 // Need only 2 approvals for emergency
  }
);
```

## Voting

### Cast Vote

```typescript
// Vote on proposal
await client.governance.vote(signer, proposalId, {
  choice: "yes", // 'yes' | 'no' | 'abstain'
  reason: "The upgrade adds valuable features with minimal risk",
  weight: memberWeight, // Uses member's voting weight
});

// Vote with delegation
await client.governance.voteWithDelegation(signer, proposalId, {
  choice: "yes",
  delegatedVotes: [
    { from: delegator1, amount: 100 },
    { from: delegator2, amount: 50 }
  ]
});
```

### Batch Voting

```typescript
// Vote on multiple proposals
await client.governance.batchVote(signer, [
  { proposal: proposal1Id, choice: "yes" },
  { proposal: proposal2Id, choice: "no", reason: "Needs more testing" },
  { proposal: proposal3Id, choice: "abstain" }
]);
```

### Delegate Voting Power

```typescript
// Delegate votes to another member
await client.governance.delegateVotes(signer, {
  to: trustedMemberAddress,
  amount: 100, // Delegate 100 voting power
  proposals: "all", // or specific proposal IDs
  duration: 2592000, // 30 days
  revocable: true,
  conditions: {
    onlyFor: ["treasury", "parameter_change"], // Only these categories
    exclude: ["emergency"] // Not for emergency proposals
  }
});
```

## Executing Proposals

### Execute Passed Proposal

```typescript
// Execute after voting period and timelock
await client.governance.executeProposal(signer, proposalId, {
  validateConditions: true, // Check all conditions met
  gasSettings: {
    priorityFee: 1000000, // Higher priority
    computeUnits: 400000 // Increase compute budget
  }
});

// Get execution result
const result = await client.governance.getExecutionResult(proposalId);
console.log("Execution status:", result.status);
console.log("Transaction:", result.transactionId);
```

### Cancel Proposal

```typescript
// Proposer can cancel before execution
await client.governance.cancelProposal(signer, proposalId, {
  reason: "Found issue in implementation",
  refundVoters: true // Refund any voting incentives
});
```

## Proposal Management

### Get Proposal Details

```typescript
const proposal = await client.governance.getProposal(proposalId);

console.log("Title:", proposal.title);
console.log("Status:", proposal.status);
console.log("Votes:", proposal.votes);
console.log("Yes:", proposal.votes.yes);
console.log("No:", proposal.votes.no);
console.log("Abstain:", proposal.votes.abstain);
console.log("Quorum reached:", proposal.quorumReached);
console.log("Passing:", proposal.isPassing);
```

### List Proposals

```typescript
// Get active proposals
const activeProposals = await client.governance.listProposals({
  multisig: multisigAddress,
  status: ["voting", "pending_execution"],
  orderBy: "end_time",
  orderDirection: "asc"
});

// Get proposal history
const history = await client.governance.getProposalHistory({
  multisig: multisigAddress,
  member: memberAddress,
  includeVotes: true,
  limit: 50
});
```

### Monitor Proposals

```typescript
// Subscribe to proposal events
const unsubscribe = client.governance.onProposalCreated(
  multisigAddress,
  (proposal) => {
    console.log("New proposal:", proposal.title);
    console.log("Voting ends:", new Date(proposal.endTime));
  }
);

// Monitor vote changes
const unsubVotes = client.governance.onVoteCast(
  proposalId,
  (vote) => {
    console.log(`${vote.voter} voted ${vote.choice}`);
    console.log("New tally:", vote.newTally);
  }
);
```

## Treasury Management

### Treasury Operations

```typescript
// Get treasury balance
const treasury = await client.governance.getTreasury(multisigAddress);

console.log("SOL balance:", treasury.solBalance);
console.log("Token balances:", treasury.tokenBalances);
console.log("Total value (USD):", treasury.totalValueUsd);

// Stake treasury funds
await client.governance.stakeTreasuryFunds(signer, multisigAddress, {
  amount: 100000000000, // 100 SOL
  validator: validatorAddress,
  duration: "flexible", // or specific lock period
  proposal: proposalId // Must be approved via proposal
});

// Provide liquidity
await client.governance.provideLiquidity(signer, multisigAddress, {
  pool: "SOL-USDC",
  amountA: 50000000000, // 50 SOL
  amountB: 1500000000, // 1500 USDC
  protocol: "raydium",
  proposal: proposalId
});
```

### Budget Tracking

```typescript
// Track budget execution
const budgetStatus = await client.governance.getBudgetStatus(
  multisigAddress,
  "Q1-2024"
);

console.log("Allocated:", budgetStatus.allocated);
console.log("Spent:", budgetStatus.spent);
console.log("Remaining:", budgetStatus.remaining);
console.log("Burn rate:", budgetStatus.burnRate);

// Get spending report
const report = await client.governance.getSpendingReport(multisigAddress, {
  period: "monthly",
  categories: ["development", "marketing", "operations"]
});
```

## Member Management

### Add/Remove Members

```typescript
// Propose adding new member
await client.governance.proposeAddMember(signer, multisigAddress, {
  newMember: newMemberAddress,
  role: "contributor",
  votingWeight: 1,
  justification: "Valuable contributor to the project",
  probationPeriod: 2592000 // 30 days
});

// Propose removing member
await client.governance.proposeRemoveMember(signer, multisigAddress, {
  member: inactiveMemberAddress,
  reason: "Inactive for 6 months",
  redistributeWeight: true // Redistribute voting weight
});
```

### Update Member Permissions

```typescript
// Update member role
await client.governance.updateMemberRole(signer, multisigAddress, {
  member: memberAddress,
  newRole: "treasurer",
  additionalPermissions: ["execute_treasury", "view_analytics"],
  proposal: proposalId // Must be approved
});
```

## Advanced Features

### Nested Multisigs

```typescript
// Create sub-committees
const subCommittee = await client.governance.createSubCommittee(
  signer,
  parentMultisig,
  {
    name: "Technical Committee",
    purpose: "Review technical proposals",
    members: [tech1, tech2, tech3],
    threshold: 2,
    authority: {
      canPropose: true,
      canVeto: true,
      budgetLimit: 10000000000 // 10 SOL
    }
  }
);
```

### Governance Tokens

```typescript
// Create governance token
const govToken = await client.governance.createGovernanceToken(
  signer,
  multisigAddress,
  {
    name: "GhostSpeak DAO",
    symbol: "GHOST",
    supply: 1000000000, // 1 billion
    decimals: 9,
    distribution: {
      treasury: 40,
      team: 20,
      community: 30,
      investors: 10
    },
    vestingSchedule: {
      team: { cliff: 31536000, duration: 94608000 }, // 1y cliff, 3y vest
      investors: { cliff: 15768000, duration: 63072000 } // 6m cliff, 2y vest
    },
    votingPower: {
      oneTokenOneVote: true,
      quadraticVoting: false,
      minTokensToPropose: 1000000 // 0.1% of supply
    }
  }
);
```

### Governance Analytics

```typescript
// Get governance metrics
const metrics = await client.governance.getMetrics(multisigAddress, {
  period: "all_time"
});

console.log("Total proposals:", metrics.totalProposals);
console.log("Participation rate:", metrics.avgParticipation);
console.log("Proposal success rate:", metrics.successRate);
console.log("Average voting period:", metrics.avgVotingTime);
console.log("Most active members:", metrics.topVoters);
```

## Best Practices

### 1. Proposal Templates

```typescript
// Use standardized proposal formats
const proposalTemplate = {
  title: "[Category] Clear, Concise Title",
  description: `
    ## Summary
    Brief overview of the proposal
    
    ## Motivation
    Why this change is needed
    
    ## Specification
    Detailed technical specification
    
    ## Impact
    Expected impact and risks
    
    ## Timeline
    Implementation timeline
    
    ## Budget
    Required resources
  `,
  metadata: {
    author: authorAddress,
    discussionLink: "https://forum.ghostspeak.ai/proposal-x",
    snapshot: "ipfs://pre-proposal-snapshot"
  }
};
```

### 2. Security Practices

```typescript
// Implement security measures
const secureMultisig = {
  settings: {
    // Timelock for critical operations
    executionDelay: 172800, // 48 hours
    
    // Multi-phase voting
    phases: [
      { name: "discussion", duration: 86400 },
      { name: "voting", duration: 259200 },
      { name: "grace", duration: 86400 }
    ],
    
    // Emergency procedures
    emergency: {
      pauseThreshold: 1, // Single admin can pause
      unpauseThreshold: 3 // Majority to unpause
    }
  },
  
  // Separate hot/cold wallets
  wallets: {
    hot: { limit: 100000000, address: hotWallet }, // 0.1 SOL limit
    cold: { threshold: 4, address: coldWallet } // Higher threshold
  }
};
```

### 3. Transparency

```typescript
// Maintain transparency
class GovernanceReporter {
  async generateMonthlyReport(multisig: Address) {
    return {
      proposals: await this.getProposalSummary(multisig),
      treasury: await this.getTreasuryReport(multisig),
      members: await this.getMemberActivity(multisig),
      metrics: await this.getKeyMetrics(multisig),
      upcoming: await this.getUpcomingDecisions(multisig)
    };
  }
  
  async publishReport(report: Report) {
    // Publish to IPFS
    const uri = await ipfs.upload(report);
    
    // Post to channels
    await this.notifyChannels(uri);
    
    // Update on-chain record
    await this.updateOnChainReport(uri);
  }
}
```

### 4. Voter Engagement

```typescript
// Incentivize participation
const voterIncentives = {
  rewards: {
    participation: 100, // Tokens for voting
    earlyVoting: 50, // Bonus for voting early
    consistency: 200 // Streak bonus
  },
  
  gamification: {
    badges: ["First Vote", "Perfect Attendance", "Thoughtful Voter"],
    leaderboard: true,
    achievements: true
  },
  
  communication: {
    reminders: true,
    summaries: true,
    impact: "Show how their vote mattered"
  }
};
```