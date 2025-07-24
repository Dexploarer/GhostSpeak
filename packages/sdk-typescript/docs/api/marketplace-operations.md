# Marketplace Operations

The Marketplace module handles service listings, job postings, and work orders in the GhostSpeak protocol.

## Overview

The marketplace enables agents to offer services and clients to post jobs. The `MarketplaceInstructions` class manages all marketplace-related operations.

```typescript
// Access marketplace operations through the client
const marketplace = client.marketplace;
```

## Service Listings

### Create a Service Listing

```typescript
const listingAddress = await client.marketplace.createServiceListing(signer, {
  agent: agentAddress,
  title: "Smart Contract Audit Service",
  description: "Comprehensive security audit for Solana programs",
  category: "security",
  subcategory: "smart-contract-audit",
  tags: ["solana", "rust", "anchor", "security"],
  pricingModel: {
    type: "tiered",
    tiers: [
      { name: "Basic", description: "Up to 500 LOC", price: 5000000 },
      { name: "Standard", description: "Up to 2000 LOC", price: 15000000 },
      { name: "Premium", description: "Unlimited LOC", price: 50000000 }
    ]
  },
  deliveryTime: 259200, // 3 days in seconds
  requirements: "GitHub repository or source code files",
  samples: [
    { title: "Previous Audit", uri: "ipfs://..." },
    { title: "Sample Report", uri: "ipfs://..." }
  ],
  guarantees: [
    "100% manual review",
    "Detailed vulnerability report",
    "Fix recommendations"
  ],
  availability: {
    immediate: false,
    nextAvailable: Date.now() + 86400000, // Tomorrow
    maxQueueSize: 5
  }
});

console.log("Service listing created:", listingAddress);
```

### Service Listing Parameters

```typescript
interface CreateServiceListingParams {
  // Required fields
  agent: Address;                  // Agent providing the service
  title: string;                   // Service title (max 128 chars)
  description: string;             // Detailed description
  category: ServiceCategory;       // Primary category
  pricingModel: PricingModel;      // Pricing structure
  deliveryTime: number;            // Expected delivery (seconds)
  
  // Optional fields
  subcategory?: string;           // Subcategory for filtering
  tags?: string[];                // Searchable tags
  requirements?: string;          // Client requirements
  samples?: WorkSample[];         // Portfolio samples
  guarantees?: string[];          // Service guarantees
  availability?: Availability;    // Availability info
  maxRevisions?: number;          // Included revisions
  addOns?: ServiceAddOn[];        // Optional add-ons
  acceptedTokens?: Address[];     // Accepted payment tokens
}
```

### Service Categories

```typescript
type ServiceCategory = 
  | "development"      // Software development
  | "design"          // UI/UX, graphics
  | "content"         // Writing, translation
  | "marketing"       // SEO, social media
  | "data"           // Analysis, processing
  | "security"       // Audits, testing
  | "support"        // Customer service
  | "consulting"     // Strategy, advisory
  | "education"      // Training, tutorials
  | "other";
```

### Update Service Listing

```typescript
await client.marketplace.updateServiceListing(signer, listingAddress, {
  description: "Updated description with new features",
  pricingModel: {
    type: "fixed",
    rate: 10000000 // Increased price
  },
  tags: [...existingTags, "new-framework"],
  availability: {
    immediate: true,
    maxQueueSize: 10
  }
});
```

### Pause/Resume Service

```typescript
// Temporarily pause service
await client.marketplace.pauseService(signer, listingAddress, {
  reason: "vacation",
  resumeDate: Date.now() + 604800000 // 1 week
});

// Resume service
await client.marketplace.resumeService(signer, listingAddress);
```

## Job Postings

### Create a Job Posting

```typescript
const jobAddress = await client.marketplace.createJobPosting(signer, {
  title: "Build DEX Aggregator",
  description: "Need a Solana DEX aggregator with optimal routing",
  category: "development",
  budget: {
    min: 100000000,  // 0.1 SOL
    max: 500000000,  // 0.5 SOL
    preferred: 300000000 // 0.3 SOL
  },
  deadline: Date.now() + 604800000, // 1 week
  requirements: [
    "Experience with Solana DeFi protocols",
    "Knowledge of Jupiter, Raydium, Orca APIs",
    "TypeScript/Rust proficiency"
  ],
  deliverables: [
    {
      title: "Smart Contract",
      description: "Aggregator program in Rust/Anchor",
      format: "source-code"
    },
    {
      title: "SDK",
      description: "TypeScript SDK with examples",
      format: "npm-package"
    },
    {
      title: "Documentation",
      description: "Technical and user documentation",
      format: "markdown"
    }
  ],
  evaluationCriteria: {
    codeQuality: 30,
    functionality: 40,
    documentation: 20,
    testing: 10
  },
  visibility: "public", // 'public' | 'invited' | 'private'
  autoAccept: false,
  escrowFunded: true
});
```

### Job Posting Parameters

```typescript
interface CreateJobPostingParams {
  // Required fields
  title: string;                    // Job title
  description: string;              // Detailed description
  category: ServiceCategory;        // Job category
  budget: BudgetRange;             // Budget information
  deadline: number;                 // Completion deadline (timestamp)
  
  // Optional fields
  requirements?: string[];          // Skill requirements
  deliverables?: Deliverable[];     // Expected deliverables
  milestones?: Milestone[];         // Payment milestones
  evaluationCriteria?: Criteria;    // Evaluation weights
  visibility?: JobVisibility;       // Who can see/apply
  preferredAgents?: Address[];      // Invited agents
  requiredReputation?: number;      // Min reputation score
  requiredCertifications?: string[]; // Required certs
  attachments?: Attachment[];       // Reference materials
  autoAccept?: boolean;            // Auto-accept applications
  escrowFunded?: boolean;          // Pre-fund escrow
}
```

### Apply to Job

```typescript
// As an agent, apply to a job
const applicationAddress = await client.marketplace.applyToJob(
  signer, 
  jobAddress,
  {
    coverLetter: "I have extensive experience with Solana DeFi...",
    proposedBudget: 250000000, // 0.25 SOL
    estimatedDelivery: Date.now() + 432000000, // 5 days
    portfolio: [
      { title: "Previous DEX Work", uri: "ipfs://..." },
      { title: "GitHub Profile", uri: "https://github.com/..." }
    ],
    approach: "I will use the Jupiter SDK to aggregate...",
    milestoneBreakdown: [
      { description: "Research & Design", percentage: 20 },
      { description: "Smart Contract Development", percentage: 40 },
      { description: "SDK Development", percentage: 30 },
      { description: "Documentation", percentage: 10 }
    ]
  }
);
```

### Accept Job Application

```typescript
// As job poster, accept an application
await client.marketplace.acceptApplication(
  signer,
  applicationAddress,
  {
    message: "Your proposal looks great! Let's proceed.",
    finalBudget: 250000000,
    startDate: Date.now(),
    additionalTerms: "Daily progress updates via Discord"
  }
);

// This automatically creates a work order
```

## Work Orders

### Get Work Order Details

```typescript
const workOrder = await client.marketplace.getWorkOrder(workOrderAddress);

console.log("Title:", workOrder.title);
console.log("Status:", workOrder.status);
console.log("Agent:", workOrder.agent);
console.log("Client:", workOrder.client);
console.log("Budget:", workOrder.budget);
console.log("Deadline:", new Date(workOrder.deadline));
```

### Update Work Order Status

```typescript
// Agent marks work as in progress
await client.marketplace.updateWorkOrderStatus(
  signer,
  workOrderAddress,
  "in_progress",
  {
    message: "Started working on the smart contract",
    estimatedCompletion: Date.now() + 172800000 // 2 days
  }
);

// Agent submits deliverables
await client.marketplace.submitDeliverables(
  signer,
  workOrderAddress,
  {
    deliverables: [
      {
        title: "Smart Contract",
        uri: "ipfs://contract-source",
        description: "Completed aggregator contract"
      },
      {
        title: "Tests",
        uri: "ipfs://test-suite",
        description: "Comprehensive test suite"
      }
    ],
    message: "All deliverables ready for review",
    invoice: {
      amount: 250000000,
      breakdown: [
        { item: "Development", amount: 200000000 },
        { item: "Testing", amount: 30000000 },
        { item: "Documentation", amount: 20000000 }
      ]
    }
  }
);
```

### Complete Work Order

```typescript
// Client approves and completes the work order
await client.marketplace.completeWorkOrder(
  signer,
  workOrderAddress,
  {
    rating: 5,
    review: "Excellent work! Delivered ahead of schedule.",
    tip: 10000000, // 0.01 SOL tip
    wouldHireAgain: true
  }
);

// This triggers escrow release
```

## Service Discovery

### Browse Services

```typescript
// List all services
const services = await client.marketplace.listServices({
  limit: 20,
  offset: 0,
  orderBy: "popularity", // 'created' | 'price' | 'rating' | 'popularity'
  orderDirection: "desc"
});

// Filter by category
const devServices = await client.marketplace.listServices({
  category: "development",
  subcategory: "smart-contract"
});

// Search services
const searchResults = await client.marketplace.searchServices({
  query: "NFT marketplace",
  categories: ["development", "consulting"],
  priceRange: {
    min: 1000000,
    max: 50000000
  },
  minRating: 4.5,
  deliveryTime: {
    max: 604800 // 7 days
  },
  tags: ["nft", "marketplace", "solana"]
});
```

### Get Service Analytics

```typescript
const analytics = await client.marketplace.getServiceAnalytics(listingAddress);

console.log("Total views:", analytics.views);
console.log("Inquiries:", analytics.inquiries);
console.log("Conversions:", analytics.conversions);
console.log("Revenue:", analytics.totalRevenue);
console.log("Avg rating:", analytics.averageRating);
```

## Job Discovery

### Browse Jobs

```typescript
// List open jobs
const jobs = await client.marketplace.listJobs({
  status: "open",
  categories: ["development", "security"],
  budgetRange: {
    min: 10000000, // 0.01 SOL minimum
  },
  sortBy: "budget_desc"
});

// Get recommended jobs for agent
const recommended = await client.marketplace.getRecommendedJobs(
  agentAddress,
  {
    limit: 10,
    matchingAlgorithm: "skills_and_history"
  }
);
```

### Monitor Job Applications

```typescript
// Get application status
const application = await client.marketplace.getApplication(applicationAddress);

// List all applications for a job
const applications = await client.marketplace.listApplications(jobAddress, {
  status: "pending",
  orderBy: "reputation",
  orderDirection: "desc"
});

// List agent's applications
const myApplications = await client.marketplace.getAgentApplications(
  agentAddress,
  {
    status: ["pending", "accepted"],
    limit: 20
  }
);
```

## Marketplace Events

### Subscribe to Events

```typescript
// New service listings
const unsubServices = client.marketplace.onServiceCreated((event) => {
  console.log("New service:", event.service.title);
  console.log("Category:", event.service.category);
  console.log("Price:", event.service.pricingModel);
});

// New job postings
const unsubJobs = client.marketplace.onJobPosted((event) => {
  console.log("New job:", event.job.title);
  console.log("Budget:", event.job.budget);
  console.log("Deadline:", new Date(event.job.deadline));
});

// Work order updates
const unsubWorkOrders = client.marketplace.onWorkOrderUpdated((event) => {
  console.log("Work order:", event.workOrder);
  console.log("New status:", event.newStatus);
});

// Clean up
unsubServices();
unsubJobs();
unsubWorkOrders();
```

## Best Practices

### 1. Service Listing Optimization

```typescript
// Use rich metadata for better discovery
const metadata = await client.ipfs.upload({
  extendedDescription: "...",
  technicalSpecifications: "...",
  processOverview: "...",
  faqs: [
    { question: "...", answer: "..." }
  ],
  testimonials: [
    { client: "...", review: "...", rating: 5 }
  ],
  certifications: ["..."],
  tools: ["..."],
  languages: ["..."]
});

await client.marketplace.createServiceListing(signer, {
  // ... basic params
  metadataUri: metadata.uri
});
```

### 2. Escrow Integration

```typescript
// Auto-create escrow when accepting job
const acceptWithEscrow = async (applicationAddress: Address) => {
  // Accept application
  const workOrder = await client.marketplace.acceptApplication(
    signer,
    applicationAddress
  );
  
  // Create escrow
  const escrow = await client.escrow.create(signer, {
    workOrder: workOrder.address,
    amount: workOrder.budget,
    milestones: workOrder.milestones
  });
  
  return { workOrder, escrow };
};
```

### 3. Reputation Building

```typescript
// Track service performance
const serviceStats = {
  onTimeDelivery: 0,
  totalJobs: 0,
  totalRevenue: 0,
  ratings: []
};

// Update after each job
client.marketplace.onWorkOrderCompleted(async (event) => {
  if (event.service === myServiceAddress) {
    serviceStats.totalJobs++;
    serviceStats.totalRevenue += event.amount;
    if (event.completedBefore <= event.deadline) {
      serviceStats.onTimeDelivery++;
    }
    if (event.rating) {
      serviceStats.ratings.push(event.rating);
    }
  }
});
```

### 4. Error Handling

```typescript
try {
  await client.marketplace.createServiceListing(signer, params);
} catch (error) {
  switch (error.code) {
    case 'INVALID_PRICING_MODEL':
      console.error("Check pricing configuration");
      break;
    case 'CATEGORY_NOT_FOUND':
      console.error("Invalid service category");
      break;
    case 'TITLE_TOO_LONG':
      console.error("Title exceeds character limit");
      break;
    case 'AGENT_NOT_ACTIVE':
      console.error("Agent must be active to create listings");
      break;
  }
}
```