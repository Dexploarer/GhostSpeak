# Auction Operations

The Auction module enables competitive bidding for services in the GhostSpeak protocol, allowing clients to get the best value and agents to compete fairly.

## Overview

The auction system supports various auction types and bidding strategies. The `AuctionInstructions` class manages all auction-related operations.

```typescript
// Access auction operations through the client
const auction = client.auction;
```

## Creating Auctions

### Basic Service Auction

```typescript
const auctionAddress = await client.auction.createServiceAuction(signer, {
  title: "Smart Contract Development - DEX",
  description: "Need experienced developer for DEX smart contract",
  category: "development",
  requirements: [
    "Proven Solana/Anchor experience",
    "Previous DEX or DeFi work",
    "Security-first approach"
  ],
  auctionType: "reverse", // Reverse auction (lowest bid wins)
  startingPrice: 1000000000, // 1 SOL starting maximum
  reservePrice: 100000000, // 0.1 SOL minimum acceptable
  duration: 259200, // 3 days in seconds
  minimumReputation: 80,
  requiredCertifications: ["solana-certified"],
  deliverables: [
    {
      title: "Smart Contract",
      description: "Complete DEX contract with AMM",
      format: "anchor-project"
    },
    {
      title: "Tests",
      description: "Comprehensive test suite",
      format: "typescript"
    }
  ]
});

console.log("Auction created:", auctionAddress);
```

### Dutch Auction

```typescript
// Price decreases over time
const dutchAuction = await client.auction.create(signer, {
  title: "Premium AI Model Training",
  auctionType: "dutch",
  startingPrice: 5000000000, // 5 SOL
  endingPrice: 1000000000, // 1 SOL
  duration: 86400, // 24 hours
  priceDecreaseInterval: 3600, // Price drops every hour
  priceDecreaseAmount: 166666667, // ~0.167 SOL per hour
  instantBuyEnabled: true,
  
  // Optional: define custom price curve
  priceCurve: {
    type: "exponential",
    factor: 0.9 // 10% decrease per interval
  }
});
```

### English Auction

```typescript
// Traditional ascending price auction
const englishAuction = await client.auction.create(signer, {
  title: "Exclusive AI Agent License",
  auctionType: "english",
  startingPrice: 100000000, // 0.1 SOL
  minimumIncrement: 10000000, // 0.01 SOL minimum bid increment
  duration: 604800, // 7 days
  extensionTime: 600, // Extend by 10 min if bid in last 10 min
  maxExtensions: 6, // Maximum 1 hour of extensions
  
  // Optional features
  buyNowPrice: 10000000000, // 10 SOL instant purchase
  minimumBidders: 3, // Require at least 3 bidders
  sealedBidPeriod: 86400 // First 24h bids are sealed
});
```

### Sealed Bid Auction

```typescript
// All bids are hidden until auction ends
const sealedBidAuction = await client.auction.create(signer, {
  title: "Government Contract - Data Analysis",
  auctionType: "sealed",
  maximumBudget: 50000000000, // 50 SOL
  duration: 432000, // 5 days
  revealPeriod: 86400, // 1 day to reveal bids after close
  evaluationCriteria: {
    price: 40, // 40% weight
    experience: 30, // 30% weight  
    proposedApproach: 20, // 20% weight
    timeline: 10 // 10% weight
  },
  requireDeposit: true,
  depositAmount: 1000000000 // 1 SOL deposit to bid
});
```

### Auction Parameters

```typescript
interface CreateAuctionParams {
  // Required fields
  title: string;                    // Auction title
  description: string;              // Detailed description
  auctionType: AuctionType;         // Type of auction
  startingPrice: bigint;            // Starting price
  duration: number;                 // Duration in seconds
  
  // Optional fields
  category?: ServiceCategory;       // Service category
  requirements?: string[];          // Bidder requirements
  reservePrice?: bigint;           // Minimum acceptable price
  buyNowPrice?: bigint;            // Instant purchase price
  minimumReputation?: number;       // Min bidder reputation
  requiredCertifications?: string[]; // Required certs
  deliverables?: Deliverable[];     // Expected deliverables
  milestones?: Milestone[];         // Payment milestones
  visibility?: AuctionVisibility;   // Who can see/bid
  allowedBidders?: Address[];       // Whitelist bidders
  extensionTime?: number;          // Anti-snipe extension
  minimumIncrement?: bigint;       // Min bid increment
  requireDeposit?: boolean;        // Require bid deposit
  depositAmount?: bigint;          // Deposit amount
  metadata?: AuctionMetadata;      // Additional metadata
}
```

## Placing Bids

### Basic Bid

```typescript
const bidAddress = await client.auction.placeBid(signer, auctionAddress, {
  amount: 250000000, // 0.25 SOL
  message: "I can deliver this in 3 days with full test coverage",
  timeline: 259200, // 3 days
  approach: "I'll use Anchor framework with...",
  portfolio: [
    { title: "Previous DEX", uri: "github://my-dex" },
    { title: "Audit Report", uri: "ipfs://audit" }
  ]
});

console.log("Bid placed:", bidAddress);
```

### Sealed Bid

```typescript
// Place encrypted bid
const sealedBid = await client.auction.placeSealedBid(
  signer, 
  auctionAddress,
  {
    amount: 300000000, // 0.3 SOL
    proposal: {
      approach: "Detailed technical approach...",
      timeline: "5 days with following milestones...",
      team: "2 senior developers",
      experience: "10+ years in blockchain..."
    },
    // Bid is encrypted until reveal phase
    nonce: crypto.randomBytes(32) // Save this for reveal!
  }
);

// Later, during reveal period
await client.auction.revealBid(signer, sealedBid.address, {
  nonce: savedNonce // The same nonce used when bidding
});
```

### Proxy Bidding

```typescript
// Set maximum bid, system bids incrementally
const proxyBid = await client.auction.setupProxyBid(signer, auctionAddress, {
  maximumBid: 500000000, // 0.5 SOL max
  initialBid: 100000000, // Start at 0.1 SOL
  incrementStrategy: "minimum", // Use minimum increments
  stopConditions: {
    ifOutbidBy: 2, // Stop if outbid by 2+ others
    maxBidders: 10 // Stop if 10+ bidders
  }
});
```

## Managing Auctions

### Get Auction Details

```typescript
const auctionDetails = await client.auction.getAuction(auctionAddress);

console.log("Title:", auctionDetails.title);
console.log("Type:", auctionDetails.auctionType);
console.log("Current price:", auctionDetails.currentPrice);
console.log("Number of bids:", auctionDetails.bidCount);
console.log("Time remaining:", auctionDetails.endTime - Date.now());
console.log("Leading bidder:", auctionDetails.leadingBidder);
```

### Get Bid History

```typescript
// Get all bids for an auction
const bids = await client.auction.getBids(auctionAddress, {
  includeWithdrawn: false,
  orderBy: "amount",
  orderDirection: "asc" // For reverse auction
});

bids.forEach(bid => {
  console.log(`${bid.bidder}: ${bid.amount} - ${bid.message}`);
});

// Get specific bid details
const bidDetails = await client.auction.getBid(bidAddress);
```

### Update Bid

```typescript
// Update bid amount (if allowed by auction rules)
await client.auction.updateBid(signer, bidAddress, {
  newAmount: 200000000, // 0.2 SOL
  message: "Updated offer with faster delivery"
});

// Withdraw bid (if allowed)
await client.auction.withdrawBid(signer, bidAddress, {
  reason: "Found conflicting commitment"
});
```

### Cancel Auction

```typescript
// Only creator can cancel (before any bids)
await client.auction.cancel(signer, auctionAddress, {
  reason: "Requirements changed significantly"
});
```

## Finalizing Auctions

### Accept Winning Bid

```typescript
// Auction ends automatically, creator accepts winner
const winner = await client.auction.acceptWinner(signer, auctionAddress, {
  message: "Congratulations! Looking forward to working with you.",
  additionalTerms: "Please join our Discord for coordination",
  
  // Optional: Create work order automatically
  createWorkOrder: true,
  workOrderParams: {
    startDate: Date.now() + 86400000, // Start tomorrow
    milestones: [
      { description: "Initial setup", amount: 30 },
      { description: "Development", amount: 50 },
      { description: "Testing & deployment", amount: 20 }
    ]
  }
});

console.log("Winner accepted:", winner.bidder);
console.log("Work order created:", winner.workOrder);
```

### Handle No Winner

```typescript
// If reserve price not met or no acceptable bids
await client.auction.closeWithoutWinner(signer, auctionAddress, {
  reason: "No bids met minimum requirements",
  action: "repost", // 'repost' | 'cancel' | 'extend'
  repostParams: {
    newDuration: 604800, // 7 days
    adjustedPrice: 150000000 // Lower reserve
  }
});
```

## Auction Monitoring

### Real-time Updates

```typescript
// Monitor auction in real-time
const unsubscribe = client.auction.onAuctionUpdate(
  auctionAddress,
  (update) => {
    console.log("New bid:", update.latestBid);
    console.log("Current price:", update.currentPrice);
    console.log("Time left:", update.timeRemaining);
    
    if (update.type === "ending_soon") {
      console.log("Auction ending in", update.minutesLeft, "minutes!");
    }
  }
);

// Monitor all auctions in a category
const unsubCategory = client.auction.onCategoryAuctions(
  "development",
  (auction) => {
    console.log("New auction:", auction.title);
    console.log("Ends:", new Date(auction.endTime));
  }
);
```

### Auction Analytics

```typescript
// Get auction statistics
const stats = await client.auction.getStatistics(auctionAddress);

console.log("Total bids:", stats.totalBids);
console.log("Unique bidders:", stats.uniqueBidders);
console.log("Average bid:", stats.averageBid);
console.log("Bid velocity:", stats.bidsPerHour);
console.log("Price trend:", stats.priceTrend);

// Get market analytics
const marketStats = await client.auction.getMarketStatistics({
  category: "development",
  period: "30d"
});

console.log("Average winning bid:", marketStats.averageWinningBid);
console.log("Competition level:", marketStats.averageBiddersPerAuction);
console.log("Success rate:", marketStats.completionRate);
```

## Advanced Features

### Multi-Round Auctions

```typescript
// Create tournament-style auction
const multiRound = await client.auction.createMultiRound(signer, {
  title: "Large Project - Multiple Phases",
  rounds: [
    {
      name: "Qualification",
      type: "sealed",
      duration: 259200, // 3 days
      maxParticipants: 20,
      evaluationCriteria: { experience: 60, proposal: 40 }
    },
    {
      name: "Technical",
      type: "english",
      duration: 172800, // 2 days
      maxParticipants: 5, // Top 5 from round 1
      startingPrice: 500000000 // 0.5 SOL
    },
    {
      name: "Final Negotiation",
      type: "sealed",
      duration: 86400, // 1 day
      maxParticipants: 2 // Top 2 from round 2
    }
  ]
});
```

### Combinatorial Auctions

```typescript
// Auction for multiple related items/services
const combo = await client.auction.createCombinatorial(signer, {
  title: "Full Stack Development Package",
  items: [
    {
      id: "frontend",
      description: "React frontend development",
      canBidSeparately: true
    },
    {
      id: "backend", 
      description: "Node.js backend API",
      canBidSeparately: true
    },
    {
      id: "devops",
      description: "CI/CD and deployment",
      canBidSeparately: false // Only with package
    }
  ],
  packageDiscount: 10, // 10% discount for full package
  allowPartialPackages: true
});

// Bid on combination
await client.auction.placeComboBid(signer, combo.address, {
  items: ["frontend", "backend", "devops"],
  totalPrice: 900000000, // 0.9 SOL for all
  itemPrices: {
    frontend: 300000000,
    backend: 400000000,
    devops: 200000000
  }
});
```

### Auction Templates

```typescript
// Use predefined templates
const templates = await client.auction.getTemplates();

const fromTemplate = await client.auction.createFromTemplate(
  signer,
  "standard_development_auction",
  {
    title: "Mobile App Development",
    description: "Custom iOS/Android app",
    customFields: {
      platform: ["ios", "android"],
      features: ["auth", "payments", "notifications"]
    }
  }
);
```

## Best Practices

### 1. Clear Requirements

```typescript
const wellDefinedAuction = {
  title: "Clear, specific title",
  description: `
    Detailed project description including:
    - Technical requirements
    - Expected deliverables
    - Timeline constraints
    - Budget considerations
  `,
  requirements: [
    "Specific, measurable requirements",
    "Required skills and experience",
    "Portfolio requirements"
  ],
  deliverables: [
    {
      title: "Exact deliverable",
      description: "Clear acceptance criteria",
      format: "Expected format"
    }
  ]
};
```

### 2. Fair Evaluation

```typescript
// For sealed bid auctions with multiple criteria
const fairEvaluation = {
  evaluationCriteria: {
    price: 30, // Don't overweight price
    technicalApproach: 30,
    experience: 20,
    timeline: 10,
    communication: 10
  },
  // Publish evaluation rubric
  evaluationRubric: {
    technicalApproach: {
      excellent: "Innovative solution with clear implementation plan",
      good: "Solid approach with standard practices",
      fair: "Basic approach, some details missing"
    },
    // ... other criteria
  }
};
```

### 3. Bidder Communication

```typescript
// Set up Q&A for auction
const auctionWithQA = await client.auction.create(signer, {
  // ... auction params
  metadata: {
    qaEnabled: true,
    qaDeadline: Date.now() + 172800000, // Q&A for first 2 days
    contactMethod: "Discord: project-channel"
  }
});

// Answer questions publicly
await client.auction.postAnswer(signer, auctionAddress, {
  question: "Can the deadline be extended?",
  answer: "Yes, up to 1 week with valid reason",
  makePublic: true
});
```

### 4. Anti-Gaming Measures

```typescript
// Prevent auction manipulation
const secureAuction = await client.auction.create(signer, {
  // ... standard params
  security: {
    minimumReputation: 75,
    requireDeposit: true,
    depositAmount: 50000000, // 0.05 SOL
    requireIdentityVerification: true,
    
    // Anti-sniping
    extensionTime: 600, // 10 minutes
    extensionThreshold: 600, // If bid in last 10 min
    
    // Anti-collusion
    revealIdentitiesAfter: true,
    maximumBidsPerAccount: 1
  }
});
```