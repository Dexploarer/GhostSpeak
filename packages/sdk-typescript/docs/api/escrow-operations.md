# Escrow Operations

The Escrow module provides secure, trustless payment handling for all transactions in the GhostSpeak protocol.

## Overview

The escrow system ensures safe transactions between clients and agents by holding funds until work is completed satisfactorily. The `EscrowInstructions` class manages all escrow-related operations.

```typescript
// Access escrow operations through the client
const escrow = client.escrow;
```

## Creating Escrow

### Basic Escrow Creation

```typescript
const escrowAddress = await client.escrow.create(signer, {
  workOrder: workOrderAddress,
  amount: 50000000, // 0.05 SOL
  recipient: agentAddress,
  releaseAuthority: signer.address, // Who can release funds
  expiryTime: Date.now() + 604800000, // 1 week
  autoRelease: false
});

console.log("Escrow created:", escrowAddress);
```

### Escrow with Milestones

```typescript
const escrowWithMilestones = await client.escrow.create(signer, {
  workOrder: workOrderAddress,
  amount: 100000000, // 0.1 SOL total
  recipient: agentAddress,
  milestones: [
    {
      id: "design",
      description: "Complete design mockups",
      amount: 20000000, // 20% - 0.02 SOL
      deadline: Date.now() + 172800000, // 2 days
      deliverables: ["Figma designs", "Style guide"]
    },
    {
      id: "frontend",
      description: "Implement frontend",
      amount: 40000000, // 40% - 0.04 SOL
      deadline: Date.now() + 432000000, // 5 days
      deliverables: ["React components", "Responsive layouts"]
    },
    {
      id: "backend",
      description: "Complete backend integration",
      amount: 40000000, // 40% - 0.04 SOL
      deadline: Date.now() + 604800000, // 7 days
      deliverables: ["API endpoints", "Database schema"]
    }
  ],
  disputeResolver: arbitratorAddress, // Optional arbitrator
  metadata: {
    projectName: "DeFi Dashboard",
    agreementUri: "ipfs://agreement-hash"
  }
});
```

### Token 2022 Escrow

```typescript
// Detect token program
const tokenProgram = await client.escrow.detectTokenProgram(mintAddress);

// Create escrow with SPL Token 2022
const tokenEscrow = await client.escrow.create(signer, {
  workOrder: workOrderAddress,
  amount: 1000000000, // 1 token (9 decimals)
  mint: token2022MintAddress,
  tokenProgram: TokenProgram.Token2022,
  recipient: agentAddress,
  
  // Token 2022 specific options
  expectTransferFees: true,
  maxFeeSlippage: 100, // 1% maximum fee
  
  // Handle confidential transfers
  confidentialTransfer: {
    enabled: true,
    recipientElgamalPubkey: agentElgamalPubkey,
    auditorElgamalPubkey: auditorPubkey // Optional
  }
});
```

### Escrow Parameters

```typescript
interface CreateEscrowParams {
  // Required fields
  workOrder: Address;               // Associated work order
  amount: bigint;                   // Total escrow amount
  recipient: Address;               // Fund recipient (agent)
  
  // Optional fields
  mint?: Address;                   // Token mint (SOL if not specified)
  tokenProgram?: TokenProgram;      // SPL Token or Token 2022
  releaseAuthority?: Address;       // Who can release (defaults to payer)
  milestones?: Milestone[];         // Payment milestones
  expiryTime?: number;             // Expiry timestamp
  autoRelease?: boolean;           // Auto-release on completion
  disputeResolver?: Address;        // Arbitrator for disputes
  metadata?: EscrowMetadata;        // Additional metadata
  
  // Token 2022 options
  expectTransferFees?: boolean;     // Account for transfer fees
  maxFeeSlippage?: number;         // Max acceptable fee (basis points)
  confidentialTransfer?: CTConfig;  // Confidential transfer config
}
```

## Managing Escrow

### Get Escrow Details

```typescript
const escrowAccount = await client.escrow.getAccount(escrowAddress);

console.log("Amount:", escrowAccount.amount);
console.log("Status:", escrowAccount.status);
console.log("Recipient:", escrowAccount.recipient);
console.log("Released:", escrowAccount.releasedAmount);
console.log("Remaining:", escrowAccount.amount - escrowAccount.releasedAmount);

// Check milestones
if (escrowAccount.milestones) {
  escrowAccount.milestones.forEach(milestone => {
    console.log(`${milestone.description}: ${milestone.status}`);
  });
}
```

### Release Funds

```typescript
// Full release
await client.escrow.release(signer, escrowAddress, {
  amount: escrowAccount.amount,
  message: "Work completed successfully"
});

// Partial release
await client.escrow.release(signer, escrowAddress, {
  amount: 25000000, // 0.025 SOL
  message: "First milestone completed"
});

// Release specific milestone
await client.escrow.releaseMilestone(signer, escrowAddress, {
  milestoneId: "design",
  message: "Design approved",
  attachments: ["ipfs://design-files"]
});
```

### Cancel Escrow

```typescript
// Cancel and refund (only if not partially released)
await client.escrow.cancel(signer, escrowAddress, {
  reason: "Project cancelled by mutual agreement",
  refundTo: clientAddress // Optional, defaults to escrow creator
});
```

### Extend Escrow

```typescript
// Extend expiry time
await client.escrow.extend(signer, escrowAddress, {
  newExpiryTime: Date.now() + 1209600000, // 2 weeks from now
  reason: "Additional requirements added"
});
```

## Dispute Handling

### File a Dispute

```typescript
const disputeAddress = await client.escrow.dispute(signer, escrowAddress, {
  reason: "Work not delivered as specified",
  evidence: [
    {
      type: "screenshot",
      uri: "ipfs://evidence1",
      description: "Missing features"
    },
    {
      type: "communication",
      uri: "ipfs://chat-logs",
      description: "Agent acknowledged requirements"
    }
  ],
  proposedResolution: {
    type: "partial_refund",
    refundAmount: 30000000, // 30% refund
    releaseAmount: 70000000 // 70% to agent
  }
});

console.log("Dispute filed:", disputeAddress);
```

### Respond to Dispute

```typescript
// As the other party, respond to dispute
await client.escrow.respondToDispute(signer, disputeAddress, {
  response: "Features were delivered as discussed in updated scope",
  evidence: [
    {
      type: "contract",
      uri: "ipfs://updated-agreement",
      description: "Revised scope agreement"
    }
  ],
  counterProposal: {
    type: "full_release",
    message: "Work was completed per revised agreement"
  }
});
```

### Arbitration

```typescript
// Arbitrator resolves dispute
await client.escrow.resolveDispute(arbitratorSigner, disputeAddress, {
  decision: "split",
  allocation: {
    toClient: 20000000,  // 20% refund
    toAgent: 80000000,   // 80% to agent
    toArbitrator: 2000000 // 2% arbitration fee
  },
  reasoning: "Agent delivered most requirements but missed some features",
  evidence: ["ipfs://arbitration-report"]
});
```

## Milestone Management

### Update Milestone Status

```typescript
// Agent submits milestone deliverables
await client.escrow.submitMilestone(signer, escrowAddress, {
  milestoneId: "frontend",
  deliverables: [
    {
      title: "React Components",
      uri: "github://repo/components",
      description: "All UI components implemented"
    },
    {
      title: "Storybook Documentation",
      uri: "https://storybook.project.com",
      description: "Interactive component documentation"
    }
  ],
  message: "Frontend milestone ready for review",
  timeSpent: 25 // hours
});
```

### Approve Milestone

```typescript
// Client approves milestone
await client.escrow.approveMilestone(signer, escrowAddress, {
  milestoneId: "frontend",
  rating: 5,
  feedback: "Excellent work, very clean code",
  tip: 5000000 // Optional tip: 0.005 SOL
});

// This triggers automatic fund release for the milestone
```

### Request Milestone Revision

```typescript
// Client requests changes
await client.escrow.requestMilestoneRevision(signer, escrowAddress, {
  milestoneId: "frontend",
  issues: [
    "Mobile responsiveness needs improvement",
    "Dark mode has contrast issues"
  ],
  additionalTime: 86400000 // Grant 1 extra day
});
```

## Escrow Monitoring

### Track Escrow Status

```typescript
// Monitor escrow events
const unsubscribe = client.escrow.onEscrowUpdated(
  escrowAddress,
  (event) => {
    console.log("Escrow status:", event.status);
    console.log("Released amount:", event.releasedAmount);
    
    if (event.status === "completed") {
      console.log("Escrow completed successfully!");
    }
  }
);

// Get escrow history
const history = await client.escrow.getHistory(escrowAddress);
history.forEach(event => {
  console.log(`${event.timestamp}: ${event.action} - ${event.details}`);
});
```

### Escrow Analytics

```typescript
// Get escrow statistics
const stats = await client.escrow.getStatistics({
  user: signer.address,
  role: "client", // 'client' | 'agent' | 'both'
  period: "30d"
});

console.log("Total escrowed:", stats.totalEscrowed);
console.log("Successfully completed:", stats.completed);
console.log("Disputed:", stats.disputed);
console.log("Average completion time:", stats.avgCompletionTime);
```

## Advanced Features

### Multi-Party Escrow

```typescript
// Create escrow with multiple recipients
const multiPartyEscrow = await client.escrow.createMultiParty(signer, {
  workOrder: workOrderAddress,
  amount: 100000000, // 0.1 SOL
  recipients: [
    { address: developer1, share: 40 }, // 40%
    { address: developer2, share: 30 }, // 30%
    { address: designer, share: 20 },   // 20%
    { address: projectManager, share: 10 } // 10%
  ],
  releaseConditions: {
    requiredApprovals: 2, // Need 2 approvals to release
    approvers: [clientAddress, techLeadAddress]
  }
});
```

### Conditional Release

```typescript
// Create escrow with automatic release conditions
const conditionalEscrow = await client.escrow.create(signer, {
  workOrder: workOrderAddress,
  amount: 50000000,
  recipient: agentAddress,
  releaseConditions: [
    {
      type: "oracle",
      oracle: oracleAddress,
      condition: "github_pr_merged",
      params: { repo: "client/project", pr: 123 }
    },
    {
      type: "time",
      timestamp: Date.now() + 604800000, // Auto-release after 1 week
      unless: "disputed" // Unless there's a dispute
    }
  ]
});
```

### Escrow Templates

```typescript
// Use predefined escrow templates
const template = await client.escrow.getTemplate("standard_development");

const escrowFromTemplate = await client.escrow.createFromTemplate(
  signer,
  "standard_development",
  {
    workOrder: workOrderAddress,
    amount: 75000000,
    recipient: agentAddress,
    customizations: {
      milestones: ["design", "development", "testing", "deployment"],
      timeline: 14 // days
    }
  }
);
```

## Best Practices

### 1. Clear Milestone Definition

```typescript
const wellDefinedMilestones = [
  {
    id: "mvp",
    description: "Minimum Viable Product",
    amount: 30000000,
    deadline: Date.now() + 604800000,
    deliverables: [
      "Core smart contract with 80% test coverage",
      "Basic UI with wallet connection",
      "Deployment scripts and documentation"
    ],
    acceptanceCriteria: [
      "All unit tests passing",
      "Successfully deployed to devnet",
      "UI connects to contract"
    ]
  }
];
```

### 2. Dispute Prevention

```typescript
// Include clear terms in escrow metadata
const escrowWithTerms = await client.escrow.create(signer, {
  // ... standard params
  metadata: {
    agreementUri: "ipfs://detailed-agreement",
    scopeDocument: "ipfs://project-scope",
    communicationChannel: "discord://project-channel",
    changeRequestProcess: "All changes must be approved in writing",
    qualityStandards: {
      codeReview: true,
      testCoverage: 80,
      documentation: "comprehensive"
    }
  }
});
```

### 3. Fee Handling for Token 2022

```typescript
// Calculate fees for Token 2022 transfers
const calculateEscrowWithFees = async (amount: bigint, mint: Address) => {
  const tokenInfo = await client.escrow.getTokenInfo(mint);
  
  if (tokenInfo.hasTransferFees) {
    const fee = await client.escrow.calculateTransferFee(
      amount,
      mint
    );
    
    console.log("Transfer fee:", fee);
    console.log("Total needed:", amount + fee);
    
    return {
      escrowAmount: amount,
      totalWithFees: amount + fee,
      feePercentage: (Number(fee) / Number(amount)) * 100
    };
  }
  
  return { escrowAmount: amount, totalWithFees: amount, feePercentage: 0 };
};
```

### 4. Emergency Procedures

```typescript
// Set up emergency release conditions
const emergencyEscrow = await client.escrow.create(signer, {
  // ... standard params
  emergencyRelease: {
    enabled: true,
    authority: emergencyMultisig,
    conditions: [
      "Agent account compromised",
      "Force majeure event",
      "Platform emergency"
    ],
    cooldownPeriod: 86400000 // 24 hour cooldown
  }
});

// Emergency release (requires special authority)
await client.escrow.emergencyRelease(
  emergencyAuthority,
  escrowAddress,
  {
    reason: "Agent account compromised",
    evidence: ["ipfs://security-report"],
    releaseTo: backupAddress
  }
);
```