# Dispute Resolution

The Dispute module provides a fair and transparent system for resolving conflicts between parties in the GhostSpeak protocol.

## Overview

The dispute resolution system handles conflicts arising from work orders, escrow disagreements, and service quality issues. The `DisputeInstructions` class manages all dispute-related operations.

```typescript
// Access dispute operations through the client
const dispute = client.dispute;
```

## Filing Disputes

### Basic Dispute Filing

```typescript
const disputeAddress = await client.dispute.file(signer, {
  workOrder: workOrderAddress,
  reason: "incomplete_delivery",
  description: "The delivered code is missing key features specified in the requirements",
  evidence: [
    {
      type: "document",
      uri: "ipfs://original-requirements",
      description: "Original requirements document"
    },
    {
      type: "screenshot",
      uri: "ipfs://missing-features",
      description: "Screenshot showing missing features"
    }
  ],
  desiredResolution: {
    type: "partial_refund",
    amount: 30000000, // 30% refund (0.03 SOL)
    justification: "70% of work was completed satisfactorily"
  }
});

console.log("Dispute filed:", disputeAddress);
```

### Escrow Dispute

```typescript
// Dispute related to escrow release
const escrowDispute = await client.dispute.fileEscrowDispute(signer, {
  escrow: escrowAddress,
  milestone: "backend-development",
  reason: "quality_issues",
  description: "The backend API has critical performance issues",
  evidence: [
    {
      type: "test_results",
      uri: "ipfs://performance-tests",
      description: "Load test showing 10s+ response times"
    },
    {
      type: "code_review",
      uri: "github://review-comments",
      description: "Code review highlighting inefficiencies"
    }
  ],
  proposedResolution: {
    type: "revision_required",
    issues: [
      "Optimize database queries",
      "Implement caching layer",
      "Fix memory leaks"
    ],
    deadline: Date.now() + 259200000 // 3 days to fix
  }
});
```

### Multi-Party Dispute

```typescript
// Dispute involving multiple parties
const multiPartyDispute = await client.dispute.fileMultiParty(signer, {
  parties: [
    { address: client1Address, role: "client" },
    { address: agent1Address, role: "frontend_developer" },
    { address: agent2Address, role: "backend_developer" }
  ],
  workOrder: workOrderAddress,
  reason: "coordination_failure",
  description: "Project delayed due to poor coordination between developers",
  claims: [
    {
      claimant: client1Address,
      against: [agent1Address, agent2Address],
      amount: 50000000, // Full refund
      reason: "Failed to deliver on time"
    },
    {
      claimant: agent1Address,
      against: agent2Address,
      amount: 10000000,
      reason: "Backend delays blocked frontend work"
    }
  ],
  requestArbitration: true
});
```

### Dispute Parameters

```typescript
interface FileDisputeParams {
  // Required fields
  workOrder?: Address;              // Related work order
  escrow?: Address;                 // Related escrow
  reason: DisputeReason;            // Categorized reason
  description: string;              // Detailed description
  evidence: Evidence[];             // Supporting evidence
  
  // Optional fields
  desiredResolution?: Resolution;   // Proposed resolution
  urgency?: DisputeUrgency;        // 'low' | 'medium' | 'high' | 'critical'
  arbitratorPreference?: Address;   // Preferred arbitrator
  maxArbitrationFee?: bigint;      // Maximum fee willing to pay
  confidential?: boolean;          // Keep details private
  escalationPath?: EscalationPath; // How to escalate if needed
}

type DisputeReason = 
  | "incomplete_delivery"     // Work not fully delivered
  | "quality_issues"         // Poor quality work
  | "deadline_missed"        // Delivery deadline exceeded
  | "scope_disagreement"     // Disagreement on scope
  | "payment_dispute"        // Payment amount dispute
  | "communication_failure"  // Poor communication
  | "contract_violation"     // Terms violated
  | "other";                 // Other reasons
```

## Responding to Disputes

### Basic Response

```typescript
// Respond as the accused party
await client.dispute.respond(signer, disputeAddress, {
  response: "The features were delivered as per the updated scope agreed on Discord",
  evidence: [
    {
      type: "chat_log",
      uri: "ipfs://discord-conversation",
      description: "Discord chat showing scope changes"
    },
    {
      type: "document",
      uri: "ipfs://revised-requirements",
      description: "Updated requirements document"
    }
  ],
  counterProposal: {
    type: "mediation",
    terms: "Happy to discuss and clarify any misunderstandings",
    suggestedMediator: mediatorAddress
  }
});
```

### Accepting Responsibility

```typescript
// Accept fault and propose resolution
await client.dispute.acceptResponsibility(signer, disputeAddress, {
  admission: "I acknowledge the delivery was incomplete",
  explanation: "Unexpected technical challenges caused delays",
  proposedRemedy: {
    type: "complete_work",
    timeline: 172800, // 2 days
    additionalCompensation: 10000000, // 0.01 SOL for inconvenience
    guarantee: "Will provide 1 month free support after completion"
  }
});
```

### Counter Claim

```typescript
// File counter claim
await client.dispute.fileCounterClaim(signer, disputeAddress, {
  claim: "Client provided incomplete requirements and changed scope multiple times",
  evidence: [
    {
      type: "email_thread",
      uri: "ipfs://email-history",
      description: "Emails showing constant requirement changes"
    }
  ],
  compensation: {
    amount: 20000000, // 0.02 SOL
    reason: "Additional work due to scope changes"
  }
});
```

## Evidence Management

### Submit Additional Evidence

```typescript
// Add evidence after initial filing
await client.dispute.submitEvidence(signer, disputeAddress, {
  evidence: [
    {
      type: "expert_opinion",
      uri: "ipfs://expert-review",
      description: "Independent code review by senior developer",
      verifiedBy: expertAddress
    },
    {
      type: "benchmark",
      uri: "ipfs://performance-benchmark",
      description: "Performance comparison with industry standards"
    }
  ],
  summary: "Additional evidence supporting quality issues claim"
});
```

### Evidence Types

```typescript
type EvidenceType = 
  | "document"          // Contracts, requirements
  | "screenshot"        // Visual proof
  | "code"             // Source code
  | "test_results"     // Test outputs
  | "chat_log"         // Communication records
  | "email_thread"     // Email conversations
  | "video"            // Video evidence
  | "expert_opinion"   // Third-party assessment
  | "benchmark"        // Performance metrics
  | "financial_record" // Payment records
  | "api_log"          // API call logs
  | "blockchain_tx";   // On-chain transactions
```

### Verify Evidence

```typescript
// Verify evidence authenticity
const verification = await client.dispute.verifyEvidence(evidenceUri);

console.log("Hash verified:", verification.hashValid);
console.log("Timestamp:", verification.timestamp);
console.log("Submitted by:", verification.submitter);
console.log("Tampered:", verification.tampered);
```

## Arbitration

### Request Arbitrator

```typescript
// Request professional arbitration
await client.dispute.requestArbitration(signer, disputeAddress, {
  arbitratorCriteria: {
    minimumReputation: 90,
    requiredExpertise: ["smart-contracts", "solana"],
    maxFee: 50000000, // 0.05 SOL maximum
    preferredTimezone: "UTC",
    languageRequirements: ["en", "es"]
  },
  urgency: "high",
  complexityLevel: "medium"
});
```

### Arbitrator Actions

```typescript
// As an arbitrator, review the case
const caseDetails = await client.dispute.getArbitrationCase(disputeAddress);

// Request more information
await client.dispute.requestInformation(arbitratorSigner, disputeAddress, {
  from: [client1Address, agent1Address],
  questions: [
    "Please provide the original project timeline",
    "Were there any verbal agreements not documented?"
  ],
  deadline: Date.now() + 86400000 // 24 hours to respond
});

// Make ruling
await client.dispute.makeRuling(arbitratorSigner, disputeAddress, {
  decision: "split_fault",
  reasoning: `Based on evidence:
    - Agent delivered 70% of requirements
    - Client made significant scope changes
    - Both parties share responsibility`,
  resolution: {
    refundToClient: 15000000, // 15% refund
    payToAgent: 85000000, // 85% to agent
    arbitrationFee: 5000000 // 5% arbitration fee
  },
  detailed_findings: [
    "Agent should have communicated delays earlier",
    "Client should have documented scope changes properly"
  ],
  recommendations: [
    "Use written change requests for all scope modifications",
    "Implement milestone-based progress updates"
  ]
});
```

### Appeal Process

```typescript
// Appeal arbitration decision
await client.dispute.appeal(signer, disputeAddress, {
  reason: "new_evidence",
  description: "Discovered new evidence that significantly impacts the case",
  newEvidence: [
    {
      type: "document",
      uri: "ipfs://hidden-contract",
      description: "Previously undisclosed contract addendum"
    }
  ],
  requestedAction: "reconsideration",
  appealFee: 10000000 // 0.01 SOL appeal fee
});
```

## Resolution Types

### Negotiated Settlement

```typescript
// Propose settlement
await client.dispute.proposeSettlement(signer, disputeAddress, {
  terms: {
    payment: {
      toClient: 20000000, // Partial refund
      toAgent: 80000000   // Partial payment
    },
    additionalTerms: [
      "Agent provides 2 weeks of bug fixes",
      "Client provides positive review",
      "Both parties sign NDA"
    ]
  },
  expiresAt: Date.now() + 172800000 // 48 hours to accept
});

// Accept settlement
await client.dispute.acceptSettlement(signer, disputeAddress, {
  signature: "I agree to the proposed terms",
  executeImmediately: true
});
```

### Mediation

```typescript
// Request mediation
const mediationSession = await client.dispute.requestMediation(
  signer,
  disputeAddress,
  {
    mediator: mediatorAddress,
    proposedSchedule: [
      Date.now() + 86400000, // Option 1: tomorrow
      Date.now() + 172800000 // Option 2: in 2 days
    ],
    format: "video_call",
    maxDuration: 7200 // 2 hours maximum
  }
);

// During mediation
await client.dispute.submitMediationPoint(signer, mediationSession, {
  point: "Willing to complete missing features if deadline extended",
  supportingFacts: ["Already completed 70%", "Only need 3 more days"]
});
```

## Dispute Analytics

### Get Dispute Statistics

```typescript
// User dispute history
const userStats = await client.dispute.getUserStatistics(userAddress);

console.log("Total disputes:", userStats.totalDisputes);
console.log("As claimant:", userStats.asClaimant);
console.log("As defendant:", userStats.asDefendant);
console.log("Win rate:", userStats.winRate);
console.log("Average resolution time:", userStats.avgResolutionTime);
console.log("Preferred resolution:", userStats.preferredResolution);
```

### Market Insights

```typescript
// Get dispute trends
const marketInsights = await client.dispute.getMarketInsights({
  period: "90d",
  category: "development"
});

console.log("Most common reasons:", marketInsights.topReasons);
console.log("Average resolution time:", marketInsights.avgTime);
console.log("Arbitration rate:", marketInsights.arbitrationRate);
console.log("Settlement success:", marketInsights.settlementRate);
```

## Escalation Procedures

### Escalate to DAO

```typescript
// Escalate unresolved dispute to DAO
await client.dispute.escalateToDAO(signer, disputeAddress, {
  reason: "arbitrator_bias",
  description: "Evidence suggests arbitrator has conflict of interest",
  requestedAction: "review_and_override",
  stake: 100000000 // 0.1 SOL stake for DAO review
});
```

### Emergency Resolution

```typescript
// Request emergency intervention
await client.dispute.requestEmergencyResolution(signer, disputeAddress, {
  reason: "fund_recovery_urgent",
  description: "Need funds urgently for medical emergency",
  evidence: [
    {
      type: "document",
      uri: "ipfs://medical-bills",
      description: "Medical documentation"
    }
  ],
  willingToConcede: 30 // Willing to accept 30% less for quick resolution
});
```

## Best Practices

### 1. Dispute Prevention

```typescript
// Clear contract terms
const preventiveContract = {
  scope: {
    deliverables: ["Detailed list of features"],
    exclusions: ["What's NOT included"],
    assumptions: ["Technical assumptions"]
  },
  milestones: [
    {
      description: "Clear, measurable milestone",
      acceptanceCriteria: ["Specific criteria"],
      deadline: "Exact date"
    }
  ],
  changeManagement: {
    process: "All changes must be in writing",
    costImpact: "Additional costs for scope changes",
    timelineImpact: "Timeline adjustments allowed"
  },
  disputeResolution: {
    firstStep: "Direct negotiation within 48 hours",
    secondStep: "Mediation with agreed mediator",
    finalStep: "Binding arbitration"
  }
};
```

### 2. Evidence Collection

```typescript
// Maintain evidence throughout project
class EvidenceCollector {
  async collectEvidence(workOrder: Address) {
    return {
      communications: await this.saveAllCommunications(),
      codeCommits: await this.trackAllCommits(),
      meetings: await this.recordMeetingSummaries(),
      changes: await this.documentAllChanges(),
      payments: await this.trackAllPayments()
    };
  }
  
  async prepareDisputePackage() {
    const evidence = await this.collectEvidence();
    return {
      organized: this.organizeByDate(evidence),
      verified: await this.verifyAllHashes(evidence),
      summarized: this.createExecutiveSummary(evidence)
    };
  }
}
```

### 3. Professional Conduct

```typescript
// Maintain professionalism during disputes
const disputeEtiquette = {
  communication: {
    tone: "professional and factual",
    avoid: ["personal attacks", "emotional language"],
    focus: "facts and evidence"
  },
  responses: {
    timeframe: "respond within 24-48 hours",
    structure: "address each point systematically",
    evidence: "provide supporting documentation"
  },
  resolution: {
    mindset: "seek win-win solutions",
    flexibility: "be open to compromise",
    future: "maintain possibility of future collaboration"
  }
};
```

### 4. Cost Management

```typescript
// Calculate dispute costs
const disputeCostAnalysis = async (disputeAmount: bigint) => {
  const costs = {
    timeCost: 50000000, // Estimated time value
    arbitrationFee: disputeAmount * 0.05, // 5% typical
    opportunityCost: 30000000, // Lost opportunities
    reputationRisk: "potentially significant"
  };
  
  const totalCost = costs.timeCost + costs.arbitrationFee + costs.opportunityCost;
  const worthDisputing = disputeAmount > totalCost * 1.5; // 50% margin
  
  return { costs, worthDisputing };
};
```