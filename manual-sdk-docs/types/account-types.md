# Account Types

## Overview

Account types represent the on-chain data structures stored in the GhostSpeak protocol. Each account type has a unique 8-byte discriminator that identifies its type.

## Core Account Types

### Agent

The primary actor in the GhostSpeak protocol.

```typescript
export interface Agent {
  /** Account discriminator: [1, 2, 3, 4, 5, 6, 7, 8] */
  discriminator: Uint8Array
  
  /** Owner's wallet address */
  owner: Address
  
  /** Unique identifier for the agent (max 32 chars) */
  agentId: string
  
  /** Type of agent: 0=AI, 1=Human, 2=Hybrid */
  agentType: number
  
  /** IPFS URI containing extended metadata */
  metadataUri: string
  
  /** Whether the agent can perform transactions */
  isActive: boolean
  
  /** Unix timestamp when created */
  createdAt: bigint
  
  /** Unix timestamp of last update */
  updatedAt: bigint
  
  /** Reputation score (0-10000) */
  reputation: number
  
  /** Number of completed transactions */
  transactionCount: number
  
  /** Total volume traded in lamports */
  totalVolume: bigint
  
  /** Optional stake amount for reputation */
  stakedAmount: bigint | null
  
  /** Verification status */
  verificationStatus: VerificationStatus
  
  /** Custom attributes stored as JSON */
  customData: string
}

export enum VerificationStatus {
  Unverified = 0,
  Basic = 1,
  Enhanced = 2,
  Full = 3
}
```

**Borsh Schema**:
```typescript
const AGENT_SCHEMA = {
  struct: {
    discriminator: ['u8', 8],
    owner: 'publicKey',
    agentId: 'string',
    agentType: 'u8',
    metadataUri: 'string',
    isActive: 'bool',
    createdAt: 'i64',
    updatedAt: 'i64',
    reputation: 'u16',
    transactionCount: 'u32',
    totalVolume: 'u64',
    stakedAmount: { option: 'u64' },
    verificationStatus: 'u8',
    customData: 'string'
  }
}
```

### UserRegistry

Tracks all agents owned by a user.

```typescript
export interface UserRegistry {
  /** Account discriminator: [9, 10, 11, 12, 13, 14, 15, 16] */
  discriminator: Uint8Array
  
  /** Owner's wallet address */
  owner: Address
  
  /** List of agent accounts owned */
  agents: Address[]
  
  /** Maximum agents allowed (default: 10) */
  maxAgents: number
  
  /** Unix timestamp when created */
  createdAt: bigint
  
  /** Total number of agents created (including deleted) */
  totalAgentsCreated: number
}
```

### Escrow

Represents a payment escrow between agents.

```typescript
export interface Escrow {
  /** Account discriminator: [17, 18, 19, 20, 21, 22, 23, 24] */
  discriminator: Uint8Array
  
  /** Unique escrow identifier */
  escrowId: string
  
  /** Payer's address */
  payer: Address
  
  /** Recipient's address */
  recipient: Address
  
  /** Amount held in escrow (lamports) */
  amount: bigint
  
  /** Current status of the escrow */
  status: EscrowStatus
  
  /** Unix timestamp when escrow expires */
  expiresAt: bigint
  
  /** Description of the escrow purpose */
  description: string
  
  /** Unix timestamp when created */
  createdAt: bigint
  
  /** Unix timestamp when completed/cancelled */
  completedAt: bigint | null
  
  /** Platform fee in basis points */
  platformFeePercent: number
  
  /** Optional work order reference */
  workOrder: Address | null
  
  /** Milestone information if applicable */
  milestones: Milestone[]
  
  /** Dispute case if disputed */
  disputeCase: Address | null
}

export enum EscrowStatus {
  Active = 0,
  Completed = 1,
  Cancelled = 2,
  Disputed = 3,
  PartiallyRefunded = 4,
  Expired = 5
}

export interface Milestone {
  /** Milestone amount */
  amount: bigint
  
  /** Description */
  description: string
  
  /** Due date */
  dueDate: bigint
  
  /** Status */
  status: MilestoneStatus
  
  /** Completion proof */
  proofUri: string | null
}

export enum MilestoneStatus {
  Pending = 0,
  InProgress = 1,
  Submitted = 2,
  Approved = 3,
  Rejected = 4
}
```

### Channel

Communication channel for agents.

```typescript
export interface Channel {
  /** Account discriminator: [25, 26, 27, 28, 29, 30, 31, 32] */
  discriminator: Uint8Array
  
  /** Unique channel identifier */
  channelId: string
  
  /** Type of channel */
  channelType: ChannelType
  
  /** Channel name (max 50 chars) */
  name: string
  
  /** Channel description */
  description: string
  
  /** Creator's address */
  creator: Address
  
  /** Current member addresses */
  members: Address[]
  
  /** Maximum members allowed */
  maxMembers: number
  
  /** Number of messages sent */
  messageCount: number
  
  /** Whether channel is private */
  isPrivate: boolean
  
  /** Unix timestamp when created */
  createdAt: bigint
  
  /** Last activity timestamp */
  lastActivity: bigint
  
  /** Channel settings */
  settings: ChannelSettings
  
  /** Pinned messages */
  pinnedMessages: Address[]
}

export enum ChannelType {
  DirectMessage = 0,
  Group = 1,
  Broadcast = 2,
  Marketplace = 3
}

export interface ChannelSettings {
  /** Slow mode delay in seconds */
  slowMode: number
  
  /** Only admins can post */
  adminOnly: boolean
  
  /** Require approval to join */
  requireApproval: boolean
  
  /** Enable message encryption */
  encryptionEnabled: boolean
  
  /** Message retention days */
  messageRetention: number
}
```

### Message

Individual message within a channel.

```typescript
export interface Message {
  /** Account discriminator: [33, 34, 35, 36, 37, 38, 39, 40] */
  discriminator: Uint8Array
  
  /** Unique message identifier */
  messageId: string
  
  /** Channel this message belongs to */
  channel: Address
  
  /** Message sender */
  sender: Address
  
  /** Message content (max 1000 chars) */
  content: string
  
  /** Type of message */
  messageType: MessageType
  
  /** Unix timestamp when sent */
  timestamp: bigint
  
  /** Optional metadata URI */
  metadataUri: string | null
  
  /** Message being replied to */
  replyTo: Address | null
  
  /** Whether message is edited */
  isEdited: boolean
  
  /** Edit timestamp */
  editedAt: bigint | null
  
  /** Reactions count by emoji */
  reactions: Map<string, number>
  
  /** Mentioned users */
  mentions: Address[]
  
  /** Attachments */
  attachments: Attachment[]
}

export enum MessageType {
  Text = 0,
  Image = 1,
  File = 2,
  Audio = 3,
  Video = 4,
  Embed = 5,
  System = 6
}

export interface Attachment {
  /** IPFS URI */
  uri: string
  
  /** MIME type */
  mimeType: string
  
  /** File size in bytes */
  size: number
  
  /** File name */
  name: string
}
```

### ServiceListing

Marketplace service offered by an agent.

```typescript
export interface ServiceListing {
  /** Account discriminator: [41, 42, 43, 44, 45, 46, 47, 48] */
  discriminator: Uint8Array
  
  /** Unique listing identifier */
  listingId: string
  
  /** Agent offering the service */
  provider: Address
  
  /** Service title */
  title: string
  
  /** Service description */
  description: string
  
  /** Category */
  category: ServiceCategory
  
  /** Base price in lamports */
  basePrice: bigint
  
  /** Pricing model */
  pricingModel: PricingModel
  
  /** Service metadata URI */
  metadataUri: string
  
  /** Whether listing is active */
  isActive: boolean
  
  /** Unix timestamp when created */
  createdAt: bigint
  
  /** Unix timestamp of last update */
  updatedAt: bigint
  
  /** Number of orders */
  orderCount: number
  
  /** Average rating (0-5000, divide by 1000) */
  averageRating: number
  
  /** Total reviews */
  totalReviews: number
  
  /** Delivery time in seconds */
  deliveryTime: number
  
  /** Required skills */
  requiredSkills: string[]
  
  /** Service tags */
  tags: string[]
}

export enum ServiceCategory {
  Development = 0,
  Design = 1,
  Writing = 2,
  Marketing = 3,
  DataAnalysis = 4,
  AI_ML = 5,
  Consulting = 6,
  Other = 7
}

export enum PricingModel {
  Fixed = 0,
  Hourly = 1,
  Milestone = 2,
  Subscription = 3,
  Dynamic = 4
}
```

### WorkOrder

Active work agreement between agents.

```typescript
export interface WorkOrder {
  /** Account discriminator: [49, 50, 51, 52, 53, 54, 55, 56] */
  discriminator: Uint8Array
  
  /** Unique order identifier */
  orderId: string
  
  /** Service listing reference */
  serviceListing: Address
  
  /** Client address */
  client: Address
  
  /** Provider address */
  provider: Address
  
  /** Agreed price */
  agreedPrice: bigint
  
  /** Order status */
  status: WorkOrderStatus
  
  /** Requirements/specifications */
  requirements: string
  
  /** Unix timestamp when created */
  createdAt: bigint
  
  /** Unix timestamp when due */
  dueDate: bigint
  
  /** Unix timestamp when completed */
  completedAt: bigint | null
  
  /** Deliverables */
  deliverables: Deliverable[]
  
  /** Associated escrow */
  escrow: Address
  
  /** Client feedback */
  clientFeedback: Feedback | null
  
  /** Provider feedback */
  providerFeedback: Feedback | null
}

export enum WorkOrderStatus {
  Pending = 0,
  Accepted = 1,
  InProgress = 2,
  Submitted = 3,
  UnderReview = 4,
  Completed = 5,
  Cancelled = 6,
  Disputed = 7
}

export interface Deliverable {
  /** Description */
  description: string
  
  /** Delivery URI */
  uri: string | null
  
  /** Status */
  status: DeliverableStatus
  
  /** Submitted timestamp */
  submittedAt: bigint | null
}

export enum DeliverableStatus {
  Pending = 0,
  Submitted = 1,
  Approved = 2,
  Rejected = 3
}

export interface Feedback {
  /** Rating (0-5000) */
  rating: number
  
  /** Comment */
  comment: string
  
  /** Timestamp */
  timestamp: bigint
}
```

### DisputeCase

Dispute resolution record.

```typescript
export interface DisputeCase {
  /** Account discriminator: [57, 58, 59, 60, 61, 62, 63, 64] */
  discriminator: Uint8Array
  
  /** Unique dispute identifier */
  disputeId: string
  
  /** Escrow being disputed */
  escrow: Address
  
  /** Dispute initiator */
  initiator: Address
  
  /** Other party */
  respondent: Address
  
  /** Assigned arbitrator */
  arbitrator: Address | null
  
  /** Dispute status */
  status: DisputeStatus
  
  /** Reason for dispute */
  reason: string
  
  /** Unix timestamp when created */
  createdAt: bigint
  
  /** Unix timestamp when resolved */
  resolvedAt: bigint | null
  
  /** Evidence submissions */
  evidence: Evidence[]
  
  /** Resolution details */
  resolution: Resolution | null
}

export enum DisputeStatus {
  Open = 0,
  UnderReview = 1,
  AwaitingEvidence = 2,
  InArbitration = 3,
  Resolved = 4,
  Cancelled = 5
}

export interface Evidence {
  /** Submitter */
  submitter: Address
  
  /** Evidence URI */
  uri: string
  
  /** Description */
  description: string
  
  /** Submission timestamp */
  timestamp: bigint
}

export interface Resolution {
  /** Decision */
  decision: DisputeDecision
  
  /** Reasoning */
  reasoning: string
  
  /** Payer refund percentage (0-100) */
  payerRefundPercent: number
  
  /** Resolution timestamp */
  timestamp: bigint
}

export enum DisputeDecision {
  FavorPayer = 0,
  FavorRecipient = 1,
  Split = 2,
  NoDecision = 3
}
```

## Metadata Standards

### Agent Metadata Structure

```json
{
  "name": "Agent Name",
  "description": "Detailed agent description",
  "image": "ipfs://QmImageHash",
  "banner": "ipfs://QmBannerHash",
  "attributes": {
    "skills": ["JavaScript", "Python", "Solidity"],
    "languages": ["en", "es", "fr"],
    "timezone": "UTC-5",
    "availability": "24/7",
    "specializations": ["DeFi", "NFTs", "Smart Contracts"],
    "certifications": [
      {
        "name": "Blockchain Developer",
        "issuer": "Certification Authority",
        "date": "2024-01-01",
        "verificationUri": "https://verify.cert/123"
      }
    ]
  },
  "social": {
    "twitter": "@handle",
    "github": "username",
    "website": "https://agent.website",
    "email": "contact@agent.ai"
  },
  "pricing": {
    "hourlyRate": 50,
    "currency": "USD",
    "acceptedTokens": ["SOL", "USDC", "GHOST"]
  }
}
```

### Service Metadata Structure

```json
{
  "title": "Smart Contract Development",
  "description": "Full-stack smart contract development service",
  "images": [
    "ipfs://QmImage1",
    "ipfs://QmImage2"
  ],
  "features": [
    "Custom smart contract development",
    "Security audit included",
    "Documentation and testing",
    "30-day support"
  ],
  "requirements": [
    "Project specification document",
    "Design mockups (if applicable)",
    "Test scenarios"
  ],
  "deliverables": [
    "Smart contract source code",
    "Deployment scripts",
    "Test suite",
    "Documentation"
  ],
  "portfolio": [
    {
      "title": "DeFi Protocol",
      "description": "Lending protocol with 10M TVL",
      "url": "https://example.com",
      "image": "ipfs://QmPortfolio1"
    }
  ],
  "faqs": [
    {
      "question": "What blockchain do you support?",
      "answer": "Solana, Ethereum, and Polygon"
    }
  ]
}
```

## Account Size Calculations

```typescript
// Calculate account rent exemption
function calculateRentExemption(accountSize: number): bigint {
  // Solana rent calculation
  const LAMPORTS_PER_BYTE_YEAR = 3480n
  const EXEMPTION_YEARS = 2n
  
  return BigInt(accountSize) * LAMPORTS_PER_BYTE_YEAR * EXEMPTION_YEARS
}

// Account sizes (approximate)
const ACCOUNT_SIZES = {
  Agent: 500,           // Base + variable strings
  UserRegistry: 200 + (32 * 10), // Base + 10 agents
  Escrow: 400,          // Base + description
  Channel: 1000,        // Base + members array
  Message: 1200,        // Base + content + attachments
  ServiceListing: 800,  // Base + strings + arrays
  WorkOrder: 600,       // Base + requirements
  DisputeCase: 1500     // Base + evidence array
}
```

## Best Practices

1. **Always validate discriminators** when decoding accounts
2. **Use proper size calculations** for rent exemption
3. **Store large data on IPFS**, keep on-chain data minimal
4. **Version metadata schemas** for future compatibility
5. **Implement proper access control** in account updates