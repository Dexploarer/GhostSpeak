# x402 Payment Integration Analysis - GhostSpeak Platform

**Document Generated**: November 2, 2025
**Status**: Comprehensive Integration Map
**Scope**: Complete x402 flow across Rust program, TypeScript SDK, CLI, and supporting systems

---

## Executive Summary

The x402 payment integration is a **complete overhaul** of GhostSpeak's payment infrastructure, replacing disabled ZK proof mechanisms with the industry-standard HTTP 402 protocol. The integration spans:

- **Rust Program**: Agent struct with 8 x402 fields, no dedicated x402 instruction (integrated into existing infrastructure)
- **TypeScript SDK**: Three core modules (X402Client, Middleware, AgentDiscoveryClient) + Analytics tracker
- **CLI**: Agent registration flow with optional x402 configuration
- **Escrow System**: Compatible with milestone-based payments
- **Reputation System**: Automatic updates from x402 transactions
- **Analytics**: Real-time payment tracking and metrics aggregation

---

## 1. x402 Fields in Rust Agent Struct → SDK Methods

### Rust Agent Struct (programs/src/state/agent.rs)

The Agent account contains 8 x402-specific fields:

```rust
#[account]
pub struct Agent {
    // ... existing fields (owner, name, description, etc.) ...
    
    // x402 Payment Protocol Support (Lines 83-90)
    pub x402_enabled: bool,                    // Flag: agent accepts x402 payments
    pub x402_payment_address: Pubkey,          // Wallet address for receiving payments
    pub x402_accepted_tokens: Vec<Pubkey>,     // Token mints accepted (USDC, PYUSD, etc.)
    pub x402_price_per_call: u64,              // Price per API call (token's smallest unit)
    pub x402_service_endpoint: String,         // HTTP endpoint for x402 payments
    pub x402_total_payments: u64,              // Total x402 payments received (cumulative)
    pub x402_total_calls: u64,                 // Total x402 API calls serviced
    pub bump: u8,                               // PDA bump seed
}
```

**Size Calculation**:
- `x402_enabled`: 1 byte
- `x402_payment_address`: 32 bytes
- `x402_accepted_tokens`: 4 bytes (vec length) + (10 * 32) bytes (max 10 tokens)
- `x402_price_per_call`: 8 bytes
- `x402_service_endpoint`: 4 bytes (string length) + 256 bytes (max)
- `x402_total_payments`: 8 bytes
- `x402_total_calls`: 8 bytes
- **Total**: ~378 bytes of the ~1,100 byte Agent account

### TypeScript SDK Methods

#### AgentDiscoveryClient.ts - Reads x402 Fields

```typescript
// packages/sdk-typescript/src/x402/AgentDiscoveryClient.ts

export interface Agent {
  // x402 payment data (lines 52-59)
  x402_enabled: boolean
  x402_payment_address: Address
  x402_accepted_tokens: Address[]
  x402_price_per_call: bigint
  x402_service_endpoint: string
  x402_total_payments: bigint
  x402_total_calls: bigint
  // ... rest of agent data
}

// Key method: getAgentPricing()
async getAgentPricing(address: Address): Promise<AgentPricing | null> {
  const agent = await this.getAgent(address)  // Fetch Agent account
  if (!agent?.x402_enabled) return null
  
  return {
    price_per_call: agent.x402_price_per_call,
    accepted_tokens: await this.getTokenInfo(agent.x402_accepted_tokens),
    payment_address: agent.x402_payment_address,
    service_endpoint: agent.x402_service_endpoint
  }
}
```

#### AgentModule.ts - Writes x402 Fields During Registration

**Current Implementation** (register method):
```typescript
async register(signer: TransactionSigner, params: {
  agentType: number
  metadataUri: string
  agentId: string
}): Promise<string> {
  // Calls registerAgent instruction (agent.rs)
  const result = await getRegisterAgentInstructionAsync({
    agentAccount,
    userRegistry,
    signer,
    metadataUri,
    agentId
  })
  return this.execute('registerAgent', instructionGetter, [signer])
}
```

**MISSING**: x402 fields are NOT set during registration. Currently initialized to defaults:
- `x402_enabled`: false (hardcoded in agent.rs line 84)
- `x402_payment_address`: Pubkey::default()
- `x402_accepted_tokens`: Vec::new()
- `x402_price_per_call`: 0
- `x402_service_endpoint`: "" (empty string)
- `x402_total_payments`: 0
- `x402_total_calls`: 0

### Connection Pattern: Register → Update → Enable x402

**Current Workflow**:

```
1. Agent Registration (agent.rs)
   ↓
   Creates Agent account with x402 fields = defaults
   (x402_enabled = false, all other fields empty)
   
2. Agent Update (agent.rs::update_agent)
   ↓
   Updates metadata_uri, name, description
   (Does NOT update x402 fields)
   
3. [MISSING] Enable x402 Payment Support
   ↓
   No dedicated instruction exists
   (Should update x402_enabled, x402_payment_address, etc.)
   
4. X402Client (SDK)
   ↓
   Reads x402 fields from Agent account
   Uses x402_payment_address + x402_price_per_call
   Verifies x402_enabled flag
```

**Issue**: The agent registration flow doesn't provide a way to:
- Set `x402_enabled` to true during registration
- Configure `x402_payment_address`
- Set `x402_accepted_tokens`
- Set `x402_price_per_call`
- Set `x402_service_endpoint`

These fields must be initialized by a separate instruction that doesn't currently exist.

---

## 2. Integration with Escrow System

### Escrow Payment Flow with x402

The escrow system (`escrow_payment.rs`) processes payments through work orders:

```rust
// programs/src/instructions/escrow_payment.rs

pub fn process_payment(
    ctx: Context<ProcessPayment>,
    amount: u64,
    use_confidential_transfer: bool,
) -> Result<()> {
    // 1. Verify payment authorization
    require!(ctx.accounts.payer.is_signer, GhostSpeakError::UnauthorizedAccess)
    
    // 2. Validate amounts
    require!(amount >= MIN_PAYMENT_AMOUNT, ...)  // ~1000 (0.001 token)
    require!(amount <= MAX_PAYMENT_AMOUNT, ...)  // ~1_000_000_000 (1000 tokens)
    
    // 3. Update Agent earnings
    provider_agent.total_earnings = provider_agent
        .total_earnings
        .checked_add(amount)
        .ok_or(GhostSpeakError::ArithmeticOverflow)?
    
    // 4. Increment job count
    provider_agent.total_jobs_completed = provider_agent
        .total_jobs_completed
        .checked_add(1)
        .ok_or(GhostSpeakError::ArithmeticOverflow)?
    
    // 5. Update reputation (integrated)
    let reputation_increment = std::cmp::min((amount / 1_000_000) as u64, 10u64)
    provider_agent.reputation_score = provider_agent
        .reputation_score
        .checked_add(reputation_increment as u32)?
    
    // 6. Emit payment event
    emit!(PaymentProcessedEvent { /* ... */ })
}
```

### x402 ↔ Escrow Integration Pattern

**Data Flow**:

```
┌─────────────────────────────────────────────────────────────┐
│                    x402 Payment Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. Client Makes x402 Payment                              │
│    ├─ X402Client.pay()                                     │
│    │  └─ Creates SPL token transfer (agent.x402_payment_address)
│    │  └─ Emits X402PaymentEvent                            │
│    └─ Transaction signature returned                       │
│                                                             │
│ 2. Client Records Payment (Optional but Recommended)       │
│    ├─ ReputationClient.recordPayment()                     │
│    │  └─ Verifies payment on-chain                         │
│    │  └─ Calls record_x402_payment instruction             │
│    │  └─ Updates Agent.x402_total_calls                    │
│    │  └─ Updates Agent.x402_total_payments                 │
│    └─ ReputationUpdated event emitted                      │
│                                                             │
│ 3. Escrow Integration (Work Orders)                        │
│    ├─ create_work_order() establishes payment terms        │
│    │  └─ Works with x402 service endpoint                  │
│    │  └─ Payment held until delivery verified              │
│    ├─ submit_work_delivery() verifies delivery             │
│    │  └─ Compressed NFT minted as proof                    │
│    └─ process_payment() releases escrow                    │
│       └─ Transfers from escrow to Agent.x402_payment_address
│                                                             │
│ 4. Reputation Update (Automatic)                           │
│    ├─ Payment success → reputation +N                      │
│    ├─ Payment failure → reputation -N                      │
│    └─ Dispute resolution affects reputation               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Work Order + Escrow + x402 Example

```typescript
// TypeScript SDK: Complete escrow + x402 workflow

// Step 1: Discover agent with x402 support
const agents = await discoveryClient.searchAgents({
  capability: 'analysis',
  x402_enabled: true,
  accepted_tokens: [USDC_ADDRESS],
  min_reputation: 7500
})
const agent = agents[0]

// Step 2: Create work order with escrow
const workOrder = await ghostspeak.createWorkOrder({
  provider: agent.address,
  title: 'AI Data Analysis',
  description: 'Analyze dataset and provide insights',
  paymentAmount: 100_000n,  // 0.1 USDC
  paymentToken: USDC_ADDRESS,
  deadline: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)  // 7 days
})

// Step 3: Payment held in escrow automatically
// (Work order contract holds tokens until delivery verified)

// Step 4: Provider submits work
await ghostspeak.submitWorkDelivery({
  workOrder: workOrder.address,
  deliverables: ['analysis_report.pdf'],
  ipfsHash: 'QmXYZ...',
  metadataUri: 'https://...'
})

// Step 5: Client receives payment confirmation
// (x402 middleware verifies payment, escrow released)

// Step 6: Reputation updated automatically
// (record_x402_payment updates Agent.reputation_score)
```

### Escrow Account Layout

**WorkOrder struct** (`programs/src/state/work_order.rs`):
```rust
#[account]
pub struct WorkOrder {
    pub client: Pubkey,
    pub provider: Pubkey,
    pub title: String,
    pub description: String,
    pub requirements: Vec<String>,
    pub payment_amount: u64,      // Amount held in escrow
    pub payment_token: Pubkey,    // SPL token (USDC, PYUSD, etc.)
    pub deadline: i64,            // Unix timestamp
    pub status: WorkOrderStatus,  // Created, InProgress, Submitted, Completed, Disputed
    // ... timestamps and bump
}

pub enum WorkOrderStatus {
    Created,
    InProgress,
    Submitted,
    Completed,
    Disputed,
}
```

**Key Integration Points**:
1. `payment_amount` matches x402 payment (should be ≤ agent.x402_price_per_call)
2. `payment_token` must be in `agent.x402_accepted_tokens`
3. Escrow release triggers `process_payment()` which updates `agent.x402_total_payments`
4. Reputation update hooks into escrow events

---

## 3. Integration with Reputation System

### Reputation Data Flow

The reputation system has two components:

#### A. On-Chain Reputation Storage (Agent struct)

```rust
#[account]
pub struct Agent {
    pub reputation_score: u32,           // 0-10,000 (basis points)
    pub total_jobs_completed: u32,       // Total job count
    pub total_earnings: u64,             // Lifetime earnings
    pub x402_total_calls: u64,           // x402-specific call count
    pub x402_total_payments: u64,        // x402-specific payment volume
}
```

#### B. Reputation Metrics Account (New for x402)

```rust
// programs/src/state/reputation.rs

#[account]
pub struct ReputationMetrics {
    pub agent: Pubkey,
    
    // Payment metrics
    pub failed_payments: u64,
    pub total_response_time: u64,
    pub response_time_count: u64,
    
    // Service quality metrics
    pub total_disputes: u32,
    pub disputes_resolved: u32,
    pub total_rating: u32,              // Sum of all ratings
    pub total_ratings_count: u32,       // Count of ratings
    
    // Volume tracking (rolling 7-day window)
    pub payment_history_7d: [u64; 7],
    
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}
```

### Reputation Score Calculation Formula

```
Final Reputation Score = (
  PaymentSuccessRate × 40% +
  ServiceQualityScore × 30% +
  ResponseTimeScore × 20% +
  VolumeConsistency × 10%
) × 10,000
```

**Component Details**:

1. **Payment Success Rate (40%)** - From x402 transactions
   - Calculation: `(successful_payments / total_x402_calls) × 100`
   - Data Source: `Agent.x402_total_calls` vs `ReputationMetrics.failed_payments`
   - Impact: Each successful x402 payment +1, failed -1, disputes -5

2. **Service Quality (30%)** - From ratings and disputes
   - Calculation: `((avg_rating / 5) × 100) - (dispute_rate × 50) + (resolution_bonus × 10)`
   - Data Source: `ReputationMetrics.total_rating`, `total_disputes`, `disputes_resolved`
   - Impact: 5-star rating +100, 1-star +20, dispute -10, resolved +5

3. **Response Time (20%)** - From x402 payment metadata
   - Calculation: 100 if avg ≤ 1000ms, else `100 - (slowdown_factor - 1) × 50`
   - Data Source: `ReputationMetrics.total_response_time / response_time_count`
   - Impact: <500ms = 100, 1-2s = 75, 5-10s = 25, >10s = 0

4. **Volume Consistency (10%)** - From rolling 7-day history
   - Calculation: Coefficient of variation applied to daily volumes
   - Data Source: `ReputationMetrics.payment_history_7d`
   - Impact: Consistent volume = 100, erratic = 0-25

### x402 Payment → Reputation Update Flow

```
┌─────────────────────────────────────────────────────────────┐
│          x402 Payment to Reputation Update Flow             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Step 1: x402 Payment Verified                              │
│    X402Client.pay() → Transaction signature               │
│    X402Client.verifyPayment() → Confirmed on-chain         │
│                                                             │
│ Step 2: Record Payment (Client-Side)                       │
│    ReputationClient.recordPayment({                        │
│      agentAddress,                                          │
│      paymentSignature,                                      │
│      responseTimeMs: 250,                                   │
│      success: true                                          │
│    })                                                       │
│                                                             │
│ Step 3: Rust Instruction: record_x402_payment             │
│    ├─ Verify x402_enabled = true                          │
│    ├─ Update agent.x402_total_calls += 1                   │
│    ├─ Update agent.x402_total_payments += amount           │
│    ├─ Update reputation_metrics.total_response_time        │
│    ├─ Update reputation_metrics.payment_history_7d[day]    │
│    ├─ Recalculate reputation_score                         │
│    │  └─ payment_success_rate: (9/10) × 40% = 36%         │
│    │  └─ service_quality: 80 × 30% = 24%                  │
│    │  └─ response_time: 100 × 20% = 20%                   │
│    │  └─ volume_consistency: 75 × 10% = 7.5%              │
│    │  └─ total: (36 + 24 + 20 + 7.5) × 100 = 8750/10000   │
│    └─ Emit ReputationUpdated event                        │
│                                                             │
│ Step 4: Off-Chain Indexing                                 │
│    Listeners subscribed to ReputationUpdated events        │
│    Update cache, trigger notifications                     │
│                                                             │
│ Step 5: UI Display                                         │
│    Agent reputation badge changes                          │
│    (LEGENDARY 9500+, ELITE 9000+, EXCELLENT 8500+, etc.)   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Reputation Client Methods

```typescript
// packages/sdk-typescript/src/reputation/ReputationClient.ts

export class ReputationClient {
  // Record x402 payment for reputation
  async recordPayment(params: {
    agentAddress: Address
    paymentSignature: Signature
    responseTimeMs: number
    success: boolean
  }): Promise<Signature>
  
  // Submit rating (from verified payment)
  async submitRating(params: {
    agentAddress: Address
    paymentSignature: Signature
    rating: 1 | 2 | 3 | 4 | 5
    comment?: string
  }): Promise<Signature>
  
  // Get reputation details
  async getReputationDetails(agentAddress: Address): Promise<{
    agentAddress: Address
    overallScore: number
    components: {
      paymentSuccessRate: number
      serviceQuality: number
      responseTimeScore: number
      volumeConsistency: number
    }
    metrics: {
      totalPayments: number
      successfulPayments: number
      averageResponseTime: number
      totalDisputes: number
      averageRating: number
    }
  }>
  
  // Subscribe to reputation updates
  subscribeToReputationUpdates(
    agentAddress: Address,
    callback: (event: ReputationUpdatedEvent) => void
  ): () => void
}
```

### Automatic Reputation Recording in Middleware

```typescript
// packages/sdk-typescript/src/x402/middleware.ts

export function createX402Middleware(options: X402MiddlewareOptions) {
  return async (req: X402RequestWithPayment, res: Response, next: NextFunction) => {
    const startTime = Date.now()
    
    // ... payment verification ...
    
    if (verification.valid) {
      // Hook into response to track timing
      res.on('finish', async () => {
        const responseTime = Date.now() - startTime
        const success = res.statusCode >= 200 && res.statusCode < 300
        
        // Automatically record reputation
        try {
          await options.reputationClient?.recordPayment({
            agentAddress: options.agentAddress,
            paymentSignature: paymentSignature,
            responseTimeMs: responseTime,
            success
          })
        } catch (error) {
          // Don't fail the request if reputation recording fails
          console.error('Failed to record reputation:', error)
        }
      })
      
      next()
    }
  }
}
```

---

## 4. CLI Commands for x402 Features

### Current CLI Agent Commands

**Location**: `/packages/cli/src/commands/agent/`

```typescript
// register.ts - Agent registration command
export function registerRegisterCommand(parentCommand: Command) {
  parentCommand
    .command('register')
    .description('Register a new AI agent')
    .option('-n, --name <name>', 'Agent name')
    .option('-d, --description <description>', 'Agent description')
    .option('-c, --capabilities <capabilities>', 'Comma-separated capabilities')
    .option('--endpoint <endpoint>', 'Service endpoint URL')
    .option('--no-metadata', 'Skip metadata URI prompt')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (_options: RegisterOptions) => {
      // Current implementation:
      // 1. Prompt for agent details
      // 2. Validate inputs
      // 3. Call agentService.register()
      // 4. Display registered agent info
    })
}
```

### MISSING: x402-Specific CLI Commands

The CLI currently **does NOT have**:
1. ~~`agent configure-x402`~~ - Enable x402 payment support
2. ~~`agent set-price`~~ - Configure x402_price_per_call
3. ~~`agent set-tokens`~~ - Configure x402_accepted_tokens
4. ~~`agent payment-status`~~ - Check x402 earnings
5. ~~`agent update-endpoint`~~ - Update x402_service_endpoint

### Recommended CLI Additions

**CLI Commands to Implement**:

```bash
# 1. Enable x402 Payment Support
ghost agent configure-x402 \
  --agent <address> \
  --payment-address <wallet> \
  --price 1000 \
  --tokens EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v,EchesyfXePKdLsHn3dqcUhLH6DqWSV5840Mj2gWEtohE \
  --endpoint https://my-agent.example.com/api

# 2. Check Agent Payment History
ghost agent payment-history <agent-address> \
  --limit 50 \
  --sort-by amount|date

# 3. View Reputation Components
ghost agent reputation <agent-address> \
  --detailed \
  --show-metrics

# 4. Search for x402 Agents
ghost agent search \
  --capability chat \
  --x402-enabled \
  --max-price 5000 \
  --min-reputation 8000

# 5. Simulate x402 Payment
ghost payment simulate \
  --agent <address> \
  --amount 1000 \
  --token USDC
```

---

## 5. Agent Registration Flow with x402 Parameters

### Current Registration Flow (Incomplete for x402)

```
Step 1: CLI Prompt User for Agent Details
├─ name: "GPT-4 Agent"
├─ description: "High-quality conversational AI"
├─ capabilities: ["chat", "analysis"]
└─ serviceEndpoint: "https://agent.example.com"
   (x402 fields NOT prompted)

Step 2: Validation
├─ Check name length ≤ 128
├─ Check description length ≤ 4KB
└─ Check endpoint URL format
   (No x402 field validation)

Step 3: AgentService.register()
├─ Call AgentModule.register(signer, {
│  agentType: 0,
│  metadataUri: "ipfs://...",
│  agentId: "uuid"
│ })
└─ Returns: agent PDA address

Step 4: Display Confirmation
├─ Agent Name: "GPT-4 Agent"
├─ Agent Address: "7xKX..."
├─ Status: "Active"
└─ x402 Status: "DISABLED"
   ← x402 fields not initialized
```

### How Registration Currently Initializes x402 Fields

**In `programs/src/instructions/agent.rs` (register_agent function)**:

```rust
pub fn register_agent(
    ctx: Context<RegisterAgent>,
    agent_type: u8,
    name: String,
    description: String,
    metadata_uri: String,
    _agent_id: String,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent_account;
    let clock = Clock::get()?;
    
    // Initialize basic fields
    agent.owner = ctx.accounts.signer.key();
    agent.name = name;
    // ... other fields ...
    
    // x402 fields are NOT initialized
    // (Skip to end of function)
    
    agent.bump = ctx.bumps.agent_account;
    emit!(crate::AgentRegisteredEvent { /* ... */ });
    Ok(())
}
```

**Result**: x402 fields get default values:
```rust
// Implicit defaults (not explicitly set in register_agent)
agent.x402_enabled = false;           // Default bool
agent.x402_payment_address = Pubkey::default();  // [0, 0, ..., 0]
agent.x402_accepted_tokens = Vec::new();         // Empty vector
agent.x402_price_per_call = 0;        // Default u64
agent.x402_service_endpoint = String::new();    // Empty string
agent.x402_total_payments = 0;        // Default u64
agent.x402_total_calls = 0;           // Default u64
```

### Desired Registration Flow (with x402 Support)

```typescript
// Step 1: Enhanced prompts
const agentData = await registerAgentPrompts({
  // Current prompts
  name: "GPT-4 Agent",
  description: "...",
  capabilities: ["chat"],
  
  // NEW: x402 configuration prompts
  enableX402: true,
  x402Config: {
    paymentAddress: "7xKX...",        // Wallet for receiving payments
    acceptedTokens: [
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  // USDC
      "EchesyfXePKdLsHn3dqcUhLH6DqWSV5840Mj2gWEtohE"   // PYUSD
    ],
    pricePerCall: 1000n,              // Price in token's smallest unit
    serviceEndpoint: "https://agent.example.com/api"
  }
})

// Step 2: Validation including x402
validateAgentParams({
  // Current
  name, description, capabilities,
  
  // NEW: x402 validation
  x402Enabled: true,
  x402PaymentAddress: pubkey,
  x402AcceptedTokens: [pubkey, pubkey],
  x402PricePerCall: 1000n,
  x402ServiceEndpoint: "https://..."
})

// Step 3: Call register with x402 data
const agent = await agentService.register({
  name, description, capabilities,
  
  // NEW: x402 configuration
  x402Config: {
    enabled: true,
    paymentAddress: walletAddress,
    acceptedTokens: [USDC, PYUSD],
    pricePerCall: 1000n,
    serviceEndpoint: "https://..."
  }
})

// Step 4: Display includes x402 status
Display:
├─ Agent Name: "GPT-4 Agent"
├─ Agent Address: "7xKX..."
├─ x402 Enabled: ✓
├─ Payment Address: "7xKX..."
├─ Price Per Call: 1000 (0.001 USDC)
├─ Accepted Tokens: USDC, PYUSD
└─ Service Endpoint: "https://agent.example.com/api"
```

### Missing Implementation: EnableX402 Instruction

Currently there's NO instruction to enable x402 after agent registration. Need to create:

```rust
// programs/src/instructions/agent_x402.rs (MISSING)

#[derive(Accounts)]
pub struct EnableX402<'info> {
    #[account(
        mut,
        seeds = [b"agent", owner.key().as_ref()],
        bump = agent.bump,
        constraint = agent.owner == owner.key()
    )]
    pub agent: Account<'info, Agent>,
    
    pub owner: Signer<'info>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn enable_x402(
    ctx: Context<EnableX402>,
    payment_address: Pubkey,
    accepted_tokens: Vec<Pubkey>,
    price_per_call: u64,
    service_endpoint: String,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    
    require!(!agent.x402_enabled, GhostSpeakError::X402AlreadyEnabled);
    require!(accepted_tokens.len() > 0, GhostSpeakError::NoTokensProvided);
    require!(price_per_call > 0, GhostSpeakError::InvalidPrice);
    
    agent.x402_enabled = true;
    agent.x402_payment_address = payment_address;
    agent.x402_accepted_tokens = accepted_tokens;
    agent.x402_price_per_call = price_per_call;
    agent.x402_service_endpoint = service_endpoint;
    agent.x402_total_payments = 0;
    agent.x402_total_calls = 0;
    agent.updated_at = Clock::get()?.unix_timestamp;
    
    emit!(X402EnabledEvent {
        agent: agent.key(),
        owner: ctx.accounts.owner.key(),
        payment_address,
        price_per_call,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}
```

---

## 6. Payment Flow Through System: Client → Agent → Escrow → Reputation

### Complete End-to-End Payment Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                   x402 Payment Flow - Complete                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ PHASE 1: DISCOVERY & PREPARATION                                │
│ ════════════════════════════════                                 │
│                                                                  │
│ 1. Client discovers agent                                       │
│    GET /api/agents?capability=chat&x402_enabled=true            │
│    └─ AgentDiscoveryClient reads agent PDA                       │
│    └─ Parses x402 fields:                                        │
│       ├─ x402_enabled: true                                      │
│       ├─ x402_price_per_call: 1000 (0.001 USDC)                  │
│       ├─ x402_accepted_tokens: [USDC, PYUSD]                     │
│       ├─ x402_payment_address: 7xKX...                           │
│       ├─ x402_service_endpoint: https://agent.example.com        │
│       └─ reputation_score: 8500 (85%)                            │
│                                                                  │
│ 2. Client queries agent service                                 │
│    GET https://agent.example.com/api/chat                       │
│    Headers: { }  (no payment yet)                                │
│                                                                  │
│ PHASE 2: PAYMENT REQUEST & VERIFICATION (HTTP 402)              │
│ ════════════════════════════════════════════════════════════    │
│                                                                  │
│ 3. Server responds with HTTP 402 (Payment Required)             │
│    Status: 402                                                   │
│    Headers:                                                      │
│      X-Payment-Address: 7xKX... (from agent.x402_payment_address)
│      X-Payment-Amount: 1000    (from agent.x402_price_per_call)  │
│      X-Payment-Token: EPjFWdd... (USDC mint)                     │
│      X-Payment-Blockchain: solana                                │
│      X-Payment-Description: AI agent query                       │
│      X-Payment-Expires-At: 1730000000000                         │
│    Body:                                                         │
│    {                                                             │
│      error: "Payment Required",                                  │
│      paymentDetails: {                                           │
│        address: "7xKX...",                                       │
│        amount: "1000",                                           │
│        token: "EPjFWdd...",                                      │
│        expiresAt: 1730000000000                                  │
│      }                                                           │
│    }                                                             │
│                                                                  │
│ PHASE 3: CLIENT PAYMENT EXECUTION                               │
│ ════════════════════════════════════════════════════════════    │
│                                                                  │
│ 4. Client prepares payment                                      │
│    X402Client.createPaymentRequest({                            │
│      recipient: "7xKX...",  (agent.x402_payment_address)        │
│      amount: 1000n,                                              │
│      token: "EPjFWdd...",   (USDC mint)                          │
│      description: "AI agent query"                               │
│    })                                                            │
│                                                                  │
│ 5. Client builds payment transaction                            │
│    Transaction {                                                │
│      instructions: [                                            │
│        // SPL Token Transfer (token.rs instruction 3)           │
│        {                                                        │
│          program: TokenProgram (TokenkegQfe...)                 │
│          accounts: [                                            │
│            {pubkey: clientTokenAccount, isSigner: false},       │
│            {pubkey: agentTokenAccount, isSigner: false},        │
│            {pubkey: clientWallet, isSigner: true}               │
│          ],                                                     │
│          data: [3, ...amount_as_u64] // Transfer opcode + u64  │
│        },                                                       │
│        // Memo instruction with metadata                        │
│        {                                                        │
│          program: MemoProgram (MemoSq4gqA...)                   │
│          accounts: [],                                          │
│          data: "x402:AI agent query:{\"requestId\":\"abc\"}"    │
│        }                                                        │
│      ],                                                         │
│      feePayer: clientWallet,                                    │
│      recentBlockhash: "...",                                    │
│      signatures: [...]                                          │
│    }                                                            │
│                                                                  │
│ 6. Client signs & sends transaction                            │
│    X402Client.pay(request)                                      │
│    ├─ SignTransactionMessageWithSigners                         │
│    ├─ SendAndConfirmTransaction                                 │
│    └─ Returns: signature (e.g., "5j7YfK...8aB2c")              │
│                                                                  │
│ 7. On-chain: SPL Token Transfer Executed                       │
│    clientTokenAccount.balance: 1000 - 1000 = 0                  │
│    agentTokenAccount.balance: 0 + 1000 = 1000                   │
│    Transaction confirmed in ~200-400ms on Solana                │
│                                                                  │
│ PHASE 4: PAYMENT VERIFICATION & RESPONSE                        │
│ ════════════════════════════════════════════════════════════    │
│                                                                  │
│ 8. Client retries service request with payment proof            │
│    GET https://agent.example.com/api/chat                       │
│    Headers:                                                      │
│      X-Payment-Signature: 5j7YfK...8aB2c                        │
│                                                                  │
│ 9. Server verifies payment on-chain                             │
│    X402Client.verifyPaymentDetails({                            │
│      signature: "5j7YfK...8aB2c",                               │
│      expectedRecipient: "7xKX...",                              │
│      expectedAmount: 1000n,                                     │
│      expectedToken: "EPjFWdd..."                                │
│    })                                                            │
│    ├─ rpc.getTransaction(signature)                             │
│    ├─ Check tx.meta.err === null  (succeeded)                   │
│    ├─ Find SPL token transfer instruction                       │
│    ├─ Verify recipient: 7xKX... ✓                               │
│    ├─ Verify amount: 1000 ✓                                     │
│    └─ Verify token: EPjFWdd... ✓                                │
│                                                                  │
│ 10. Server processes request (payment verified)                 │
│     const result = await processQuery(req.query)                │
│     res.json(result)  // HTTP 200                               │
│                                                                  │
│ 11. Server response                                             │
│     Status: 200                                                  │
│     Headers:                                                     │
│       X-Payment-Verified: true                                   │
│       X-Payment-Signature: 5j7YfK...8aB2c                       │
│     Body:                                                        │
│     {                                                           │
│       result: { /* AI response */ },                            │
│       payment: {                                                │
│         verified: true,                                        │
│         signature: "5j7YfK...8aB2c"                             │
│       }                                                         │
│     }                                                            │
│                                                                  │
│ PHASE 5: REPUTATION UPDATE (AUTOMATIC VIA MIDDLEWARE)           │
│ ════════════════════════════════════════════════════════════    │
│                                                                  │
│ 12. Middleware records payment for reputation                   │
│     (Happens automatically in background)                       │
│     ReputationClient.recordPayment({                            │
│       agentAddress: agent.address,                              │
│       paymentSignature: "5j7YfK...8aB2c",                       │
│       responseTimeMs: 245,                                      │
│       success: true                                             │
│     })                                                           │
│                                                                  │
│ 13. On-chain: record_x402_payment instruction                   │
│     Rust instruction processes:                                 │
│     ├─ Verify x402_enabled = true  ✓                            │
│     ├─ Update agent.x402_total_calls: 100 → 101                 │
│     ├─ Update agent.x402_total_payments: 100000 → 101000        │
│     ├─ Update reputation_metrics:                               │
│     │  ├─ total_response_time: +245ms                           │
│     │  ├─ payment_history_7d[today]: +1                         │
│     │  └─ response_time_count: +1                               │
│     ├─ Recalculate reputation:                                  │
│     │  ├─ payment_success_rate: (100/101) = 99.0%              │
│     │  ├─ service_quality: 80% (from ratings)                   │
│     │  ├─ response_time: 100% (<1000ms)                         │
│     │  ├─ volume_consistency: 85%                               │
│     │  └─ final_score: (99×40% + 80×30% + 100×20% + 85×10%) × 100
│     │                 = 9010 basis points (90.1%)              │
│     ├─ Update agent.reputation_score: 8500 → 9010               │
│     └─ Emit ReputationUpdatedEvent {                            │
│         agent: agent.address,                                   │
│         old_score: 8500,                                        │
│         new_score: 9010,                                        │
│         payment_signature: "5j7YfK...8aB2c",                    │
│         timestamp: 1730000000                                   │
│       }                                                          │
│                                                                  │
│ 14. Analytics tracking (optional)                               │
│     X402AnalyticsTracker.recordPayment({                        │
│       signature: "5j7YfK...8aB2c",                              │
│       timestamp: BigInt(Date.now()),                            │
│       payer: clientWallet,                                      │
│       recipient: agentWallet,                                   │
│       amount: 1000n,                                            │
│       token: USDC_MINT,                                         │
│       agent: agent.address,                                     │
│       status: 'confirmed'                                       │
│     })                                                           │
│                                                                  │
│ 15. Metrics aggregation                                         │
│     X402TransactionMetrics {                                    │
│       period: { start, end },                                   │
│       payments: {                                               │
│         total: 101,                                             │
│         successful: 101,                                        │
│         failed: 0,                                              │
│         pending: 0                                              │
│       },                                                        │
│       volume: {                                                 │
│         total: 101000n,  // 101 USDC                            │
│         average: 1000n,                                         │
│         byToken: {USDC: 101000n, PYUSD: 0n}                     │
│       },                                                        │
│       agents: {                                                 │
│         totalActive: 42,                                        │
│         topEarners: [{agent, earnings: 101000n, callCount: 101}]
│       },                                                        │
│       performance: {                                            │
│         averageConfirmationTime: 245,                           │
│         successRate: 100.0,                                     │
│         errorRate: 0.0                                          │
│       }                                                         │
│     }                                                            │
│                                                                  │
│ ✓ COMPLETE: Payment flow finished in ~500ms total time          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Code Implementation Reference

**TypeScript Client Code**:

```typescript
// Complete x402 payment flow
const x402Client = createX402Client(rpcUrl, wallet)
const reputationClient = new ReputationClient(x402Client, wallet)
const analyticsTracker = createX402AnalyticsTracker({ enableRealtime: true })

// 1. Discover agent
const agents = await discoveryClient.searchAgents({
  capability: 'chat',
  x402_enabled: true,
  sort_by: 'reputation',
  sort_order: 'desc'
})
const agent = agents[0]
const agentAddress = agent.address as Address

// 2. Prepare payment
const paymentRequest = x402Client.createPaymentRequest({
  amount: agent.x402_price_per_call,
  token: agent.x402_accepted_tokens[0] as Address,
  description: `API call to ${agent.name}`
})

// 3. Execute payment
const receipt = await x402Client.pay(paymentRequest)
console.log(`Payment sent: ${receipt.signature}`)

// 4. Verify payment (optional, middleware does this)
const verification = await x402Client.verifyPaymentDetails({
  signature: receipt.signature,
  expectedRecipient: paymentRequest.recipient,
  expectedAmount: paymentRequest.amount,
  expectedToken: paymentRequest.token
})

if (!verification.valid) {
  throw new Error('Payment verification failed')
}

// 5. Record payment for reputation (automatic via middleware)
const startTime = Date.now()
const response = await fetch(agent.x402_service_endpoint, {
  headers: { 'X-Payment-Signature': receipt.signature }
})
const responseTime = Date.now() - startTime

// This happens in middleware automatically:
await reputationClient.recordPayment({
  agentAddress,
  paymentSignature: receipt.signature,
  responseTimeMs: responseTime,
  success: response.ok
})

// 6. Analytics tracking
analyticsTracker.recordPayment({
  signature: receipt.signature,
  timestamp: BigInt(Date.now()),
  payer: wallet.address as Address,
  recipient: paymentRequest.recipient,
  amount: paymentRequest.amount,
  token: paymentRequest.token,
  agent: agentAddress,
  status: 'confirmed'
})

// 7. Get updated reputation
const reputation = await reputationClient.getReputationDetails(agentAddress)
console.log(`Agent reputation updated to: ${reputation.overallScore}/10000`)
```

---

## 7. Integration with Analytics and Monitoring

### x402 Analytics Architecture

The analytics system has three layers:

```
┌────────────────────────────────────────────────────┐
│           x402 Analytics Architecture              │
├────────────────────────────────────────────────────┤
│                                                   │
│ Layer 1: Real-Time Event Capture                 │
│ ──────────────────────────────────────────────    │
│  X402AnalyticsTracker                             │
│  ├─ recordPayment()                               │
│  ├─ recordPaymentFromSignature()                  │
│  ├─ updatePaymentStatus()                         │
│  └─ Events: payment, paymentStatusChanged         │
│                                                   │
│ Layer 2: Aggregation & Metrics                   │
│ ──────────────────────────────────────────────    │
│  Metrics Aggregation                              │
│  ├─ Payment counts (total, successful, failed)    │
│  ├─ Volume tracking (by token, by agent)          │
│  ├─ Performance metrics (confirmation time)       │
│  ├─ Top earners (by earnings)                     │
│  └─ Success/error rates                           │
│                                                   │
│ Layer 3: Integration with GhostSpeak Analytics   │
│ ──────────────────────────────────────────────    │
│  AnalyticsStreamer                                │
│  ├─ Receives TransactionAnalyticsEvent            │
│  ├─ Filters for x402_payment type                 │
│  └─ Converts to X402PaymentEvent                  │
│                                                   │
│  AnalyticsAggregator                              │
│  ├─ Aggregates all transaction types              │
│  ├─ Combines x402 with other payments             │
│  └─ Provides unified metrics                      │
│                                                   │
└────────────────────────────────────────────────────┘
```

### X402AnalyticsTracker Implementation

**Location**: `packages/sdk-typescript/src/x402/analytics.ts`

```typescript
export class X402AnalyticsTracker extends EventEmitter {
  private paymentEvents: X402PaymentEvent[] = []
  private agentEarnings: Map<Address, bigint> = new Map()
  private agentCallCounts: Map<Address, number> = new Map()
  private tokenVolumes: Map<Address, bigint> = new Map()
  
  // Public methods
  recordPayment(event: X402PaymentEvent): void
  recordPaymentFromSignature(signature, payer, recipient, amount, token, agent?): Promise<void>
  updatePaymentStatus(signature, status, metadata?): void
  getMetrics(periodSeconds?: number): X402TransactionMetrics
  getAgentEarnings(agent): {totalEarnings, totalCalls, averagePerCall}
  getTokenVolume(token): bigint
  getAgentPaymentHistory(agent, limit?): X402PaymentEvent[]
  getRecentPayments(limit): X402PaymentEvent[]
  
  // Integration methods
  integrateWithStreamer(streamer: AnalyticsStreamer): void
  integrateWithAggregator(aggregator: AnalyticsAggregator): void
  getAggregatedMetrics(): AggregatedMetrics | null
}

export interface X402TransactionMetrics {
  period: { start: bigint; end: bigint }
  payments: {
    total: number
    successful: number
    failed: number
    pending: number
  }
  volume: {
    total: bigint
    average: bigint
    byToken: Map<Address, bigint>
  }
  agents: {
    totalActive: number
    topEarners: Array<{
      agent: Address
      earnings: bigint
      callCount: number
    }>
  }
  performance: {
    averageConfirmationTime: number  // milliseconds
    successRate: number              // percentage
    errorRate: number                // percentage
  }
}
```

### Analytics Event Flow

```
┌──────────────────────────────────────────────────────────────┐
│              x402 Analytics Event Flow                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. Payment Recorded                                          │
│    analyticsTracker.recordPayment({                          │
│      signature: "5j7YfK...",                                 │
│      timestamp: BigInt(Date.now()),                          │
│      payer, recipient, amount, token, agent, status         │
│    })                                                        │
│    ├─ Event emitted: 'payment'                               │
│    ├─ agentEarnings updated                                  │
│    ├─ agentCallCounts incremented                            │
│    ├─ tokenVolumes updated                                   │
│    └─ paymentEvents array appended                           │
│                                                              │
│ 2. Payment Status Update                                     │
│    analyticsTracker.updatePaymentStatus(                     │
│      signature, 'confirmed', {confirmationTime: 250}        │
│    )                                                         │
│    ├─ Event emitted: 'paymentStatusChanged'                  │
│    └─ paymentEvents[i].status updated                        │
│                                                              │
│ 3. Metrics Aggregation (Periodic)                            │
│    analyticsTracker.getMetrics(3600)  // Last hour           │
│    ├─ Filter events by timestamp                             │
│    ├─ Calculate: payment counts                              │
│    ├─ Calculate: volume by token                             │
│    ├─ Calculate: top earners                                 │
│    ├─ Calculate: success rate                                │
│    └─ Return: X402TransactionMetrics                         │
│                                                              │
│ 4. Integration with GhostSpeak Analytics                     │
│    analyticsTracker.integrateWithStreamer(streamer)          │
│    ├─ Listen to TransactionAnalyticsEvent                    │
│    ├─ Filter: type === 'x402_payment'                        │
│    └─ Convert & record as X402PaymentEvent                   │
│                                                              │
│    analyticsTracker.integrateWithAggregator(aggregator)      │
│    ├─ Feed confirmed x402 events to aggregator               │
│    ├─ Aggregator converts to TransactionAnalyticsEvent       │
│    └─ Unified metrics across all payment types               │
│                                                              │
│ 5. Dashboard/Monitoring Display                              │
│    metrics = analyticsTracker.getMetrics()                   │
│    ├─ Payment Success Rate: 99.5%                            │
│    ├─ Total Volume: 5,000 USDC                               │
│    ├─ Top Agent: GPT-4 (2500 USDC earnings)                  │
│    ├─ Avg Confirmation: 245ms                                │
│    └─ Total Active Agents: 42                                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Example: Building a Monitoring Dashboard

```typescript
// Real-time monitoring dashboard
const analyticsTracker = createX402AnalyticsTracker({
  enableRealtime: true,
  metricsInterval: 60000, // Update every minute
  retentionPeriod: 86400, // Keep 24 hours of data
  onPayment: (event) => {
    console.log(`Payment recorded: ${event.amount} from ${event.payer}`)
  },
  onMetrics: (metrics) => {
    console.log(`Metrics updated:`, {
      success_rate: metrics.performance.successRate,
      total_volume: metrics.volume.total.toString(),
      avg_confirmation: metrics.performance.averageConfirmationTime
    })
  }
})

// Start tracking
analyticsTracker.start()

// Subscribe to real-time updates
analyticsTracker.on('payment', (event: X402PaymentEvent) => {
  // Update dashboard in real-time
  updateUI({
    latest_payment: {
      agent: event.agent,
      amount: event.amount,
      status: event.status,
      time: new Date(Number(event.timestamp))
    }
  })
})

analyticsTracker.on('metrics', (metrics: X402TransactionMetrics) => {
  // Update charts and statistics
  updateCharts({
    volume_chart: metrics.volume.byToken,
    success_rate: metrics.performance.successRate,
    top_agents: metrics.agents.topEarners
  })
})

// Get historical data
const last24h = analyticsTracker.getMetrics(86400)
console.log(`Last 24 hours:`)
console.log(`- Total payments: ${last24h.payments.total}`)
console.log(`- Successful: ${last24h.payments.successful}`)
console.log(`- Failed: ${last24h.payments.failed}`)
console.log(`- Total volume: ${last24h.volume.total.toString()}`)

// Get agent-specific metrics
const agentEarnings = analyticsTracker.getAgentEarnings(agentAddress)
console.log(`${agentAddress}:`)
console.log(`- Total earnings: ${agentEarnings.totalEarnings.toString()}`)
console.log(`- Total calls: ${agentEarnings.totalCalls}`)
console.log(`- Average per call: ${agentEarnings.averagePerCall.toString()}`)

// Get payment history for agent
const history = analyticsTracker.getAgentPaymentHistory(agentAddress, 50)
// Display last 50 payments to this agent
```

### Monitoring Key Metrics

**Critical x402 Metrics**:

| Metric | Source | Target | Monitoring |
|--------|--------|--------|-----------|
| **Payment Success Rate** | `payments.successful / payments.total` | >99% | Alert if <95% |
| **Average Confirmation Time** | `average(confirmationTime)` | <300ms | Alert if >500ms |
| **Total Volume** | `sum(amount)` | Track growth | Monitor for anomalies |
| **Top Agents by Earnings** | `agentEarnings` sorted | Track leaders | Top 10 display |
| **Failed Payments** | `payments.failed` | <1% | Alert if >2% |
| **Average Price** | `volume.total / payments.successful` | Trends | Monitor for gaming |
| **Active Agents** | `unique(agents)` | Adoption | Growth tracking |
| **Cost per Transaction** | Blockchain fees | <$0.001 | Verify efficiency |

---

## Summary: Integration Matrix

| Layer | Component | x402 Fields Used | Integration Point |
|-------|-----------|------------------|-------------------|
| **Rust Program** | Agent struct | 8 fields (enabled, address, tokens, price, endpoint, payments, calls) | Core data store |
| **Rust Program** | escrow_payment.rs | x402_total_payments, x402_total_calls | Update on payment completion |
| **Rust Program** | reputation.rs | x402_total_calls, x402_total_payments | Used in score calculation |
| **TypeScript SDK** | AgentDiscoveryClient | All 8 x402 fields | Search, filter, pricing info |
| **TypeScript SDK** | X402Client | payment_address, accepted_tokens, price_per_call | Payment verification |
| **TypeScript SDK** | Middleware | All fields in verification | HTTP 402 response |
| **TypeScript SDK** | ReputationClient | x402_total_calls via recordPayment | Automatic updates |
| **TypeScript SDK** | X402AnalyticsTracker | All fields | Event tracking |
| **CLI** | agent register | None (MISSING) | Should initialize x402 |
| **CLI** | agent status | service_endpoint (not yet used) | Display x402 status |

---

## Critical Gaps & Recommendations

1. **MISSING: Enable x402 Instruction**
   - Need `enable_x402` or `configure_x402` instruction
   - Should set x402 fields after agent registration
   - Implement in `programs/src/instructions/agent_x402.rs`

2. **MISSING: CLI x402 Commands**
   - `agent configure-x402` for setup
   - `agent payment-status` for monitoring
   - `payment simulate` for testing

3. **MISSING: x402 Registration Integration**
   - CLI prompts for x402 config during registration
   - Validation of x402 parameters
   - One-transaction setup (register + enable x402)

4. **TODO: Integration Tests**
   - End-to-end x402 payment flow
   - Escrow + x402 milestone payments
   - Reputation calculation from x402 data
   - Analytics aggregation verification

5. **TODO: Error Handling Improvements**
   - Token account validation (might not exist)
   - Payment expiration handling
   - Retry logic for failed verifications
   - Network resilience

