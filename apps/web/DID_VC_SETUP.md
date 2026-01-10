# W3C DID/VC & Crossmint Integration Guide

## Overview

GhostSpeak implements **W3C Decentralized Identifiers (DIDs)** and **Verifiable Credentials (VCs)** for agent identity and reputation. This system works on **both Solana devnet and mainnet**, allowing agents to test on devnet while using mainnet for production.

---

## Architecture

### 1. **DID System** (`did:sol:network:address`)

Every agent gets a unique DID following the Solana DID method:

```
did:sol:devnet:CjNXSBUPTM3aAuqLB2KWBN66VTmnh5o1sYeQW8YaQimc  # Devnet
did:sol:mainnet:CjNXSBUPTM3aAuqLB2KWBN66VTmnh5o1sYeQW8YaQimc # Mainnet
```

**Implementation:**
- `convex/credentials.ts:issueAgentIdentityCredential` - Issues DID on agent claim
- `convex/schema.ts:agentIdentityCredentials` - Stores DID mappings

### 2. **Verifiable Credentials** (Convex-backed)

GhostSpeak issues 10 types of credentials stored in Convex tables:

| Credential Type | Table | Purpose | Expires |
|----------------|-------|---------|---------|
| Agent Identity | `agentIdentityCredentials` | Prove agent ownership | Never |
| Reputation Tier | `payaiCredentialsIssued` | Ghost Score milestones (2k, 5k, 7.5k, 9k) | Never |
| Payment Milestone | `paymentMilestoneCredentials` | x402 payment counts (10, 100, 1000) | Never |
| Staking | `stakingCredentials` | GHOST token staking tiers | Never |
| Verified Hire | `verifiedHireCredentials` | On-chain payment proof + review | Never |
| Capability Verification | `capabilityVerificationCredentials` | Observatory live testing | 30 days |
| Uptime Attestation | `uptimeAttestationCredentials` | 95%+ uptime (7+ day observation) | Never (refreshed) |
| API Quality Grade | `apiQualityGradeCredentials` | A/B/C/D/F grades from Caisper | Never |
| TEE Attestation | `teeAttestationCredentials` | Trusted Execution Environment proof | 90 days |
| Model Provenance | `modelProvenanceCredentials` | LLM model documentation (EU AI Act) | Never |

**All credentials include:**
- `credentialId` - Unique identifier
- `agentAddress` - Subject wallet
- `issuedAt` - Timestamp
- `crossmintCredentialId` - (Optional) Crossmint VC ID for EVM bridging

### 3. **Crossmint Integration** (EVM Bridging)

Crossmint allows credentials to be:
- Minted as NFTs on EVM chains (Ethereum, Polygon, Base)
- Bridged between Solana and EVM ecosystems
- Displayed in standard NFT wallets

**Status:** Infrastructure ready, `crossmintCredentialId` fields exist in all tables, awaiting template configuration.

---

## Setup Instructions

### Step 1: Pinata (IPFS Storage)

**Purpose:** Store credential metadata and DID documents off-chain

1. **Get Pinata API Key:**
   - Sign up at https://www.pinata.cloud/
   - Create API key with permissions: `pinJSONToIPFS`, `pinFileToIPFS`
   - Copy JWT token

2. **Configure Environment Variables:**

```bash
# .env.local
PINATA_JWT=your_pinata_jwt_token_here
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs
```

3. **Test IPFS Upload:**

```bash
curl -X POST https://www.ghostspeak.io/api/ipfs/upload \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "name": "Test Agent",
      "description": "Test metadata upload",
      "timestamp": 1234567890
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "uri": "ipfs://Qm...",
  "cid": "Qm...",
  "gatewayUrl": "https://gateway.pinata.cloud/ipfs/Qm...",
  "fallback": false
}
```

**Fallback Behavior:** If `PINATA_JWT` is not set, the system uses base64-encoded data URIs for development.

---

### Step 2: Crossmint (W3C VC NFTs)

**Purpose:** Mint credentials as W3C-compliant NFTs on EVM chains

1. **Get Crossmint API Keys:**
   - Sign up at https://www.crossmint.com/console
   - Create project and get API keys

2. **Create Credential Templates:**

You need 3 templates (one for each major credential type):

**a) Agent Identity Template:**
```json
{
  "name": "GhostSpeak Agent Identity",
  "description": "Verifiable agent identity on Solana",
  "type": "agent_identity",
  "schema": {
    "did": "string",
    "agentAddress": "string",
    "issuedAt": "number"
  }
}
```

**b) Reputation Tier Template:**
```json
{
  "name": "GhostSpeak Reputation",
  "description": "On-chain reputation credential",
  "type": "reputation_tier",
  "schema": {
    "tier": "string",
    "milestone": "number",
    "ghostScore": "number",
    "issuedAt": "number"
  }
}
```

**c) Job Completion Template:**
```json
{
  "name": "GhostSpeak Verified Hire",
  "description": "Verified work completion with payment proof",
  "type": "verified_hire",
  "schema": {
    "rating": "number",
    "clientAddress": "string",
    "transactionSignature": "string",
    "issuedAt": "number"
  }
}
```

3. **Configure Environment Variables:**

```bash
# .env.local
NEXT_PUBLIC_CROSSMINT_API_KEY=your_client_api_key
CROSSMINT_SECRET_KEY=your_server_api_key
CROSSMINT_API_URL=https://www.crossmint.com/api/2022-06-09

# Template IDs from Crossmint console
CROSSMINT_AGENTIDENTITY_TEMPLATE_ID=template_id_here
CROSSMINT_REPUTATION_TEMPLATE_ID=template_id_here
CROSSMINT_JOBCOMPLETION_TEMPLATE_ID=template_id_here
```

4. **Test Crossmint Integration** (when implemented):

```typescript
// Example: Mint credential as NFT
await fetch('/api/credentials/mint-nft', {
  method: 'POST',
  body: JSON.stringify({
    credentialType: 'agent_identity',
    credentialId: 'agent_identity_abc123_1234567890',
    recipientAddress: 'CjNXSBUPTM3aAuqLB2KWBN66VTmnh5o1sYeQW8YaQimc'
  })
})
```

---

### Step 3: Solana Network Configuration

**Supports both devnet and mainnet simultaneously:**

```bash
# .env.local

# Devnet (for testing)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID=your_devnet_program_id

# Mainnet (for production)
SOLANA_MAINNET_RPC_URL=https://api.mainnet-beta.solana.com
GHOSTSPEAK_MAINNET_PROGRAM_ID=your_mainnet_program_id

# x402 Indexer (monitors both networks)
X402_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**DID Resolution:**
- Devnet agents: `did:sol:devnet:{address}`
- Mainnet agents: `did:sol:mainnet:{address}`

---

## Current Implementation Status

### ✅ **Working (Devnet & Mainnet)**

1. **DID Issuance:**
   - Automatic DID creation on agent claim
   - Stored in `agentIdentityCredentials` table
   - Format: `did:sol:network:address`

2. **Credential System:**
   - 10 credential types fully implemented
   - Stored in Convex with proper indexes
   - Automatic issuance via `convex/credentials.ts`
   - Public queries: `getAgentCredentialsPublic`, `listAgentCredentialSummariesPublic`

3. **IPFS Integration:**
   - `/api/ipfs/upload` endpoint created
   - Pinata JWT authentication
   - Automatic fallback to data URIs
   - Gateway URLs: `ipfsToHttp()` utility

4. **Schema:**
   - All 10 credential tables defined
   - `crossmintCredentialId` fields ready
   - Proper indexes for fast lookups

5. **Ghost Score Integration:**
   - Credentials contribute to Ghost Score
   - Automatic credential issuance on milestones
   - Expiry tracking for time-limited credentials

### 🚧 **Pending Integration**

1. **Crossmint NFT Minting:**
   - Infrastructure: ✅ Ready (schema fields exist)
   - Templates: ❌ Need to create in Crossmint console
   - API route: ❌ Need to create `/api/credentials/mint-nft`
   - Action: Create mutation to call Crossmint API and store `crossmintCredentialId`

2. **W3C VC JSON-LD Format:**
   - Infrastructure: ✅ Ready (credential data structured correctly)
   - Formatting: ❌ Need to add W3C VC wrapper
   - Action: Create utility to convert Convex credentials to W3C VC format

3. **DID Document Storage:**
   - Infrastructure: ✅ IPFS upload working
   - Implementation: ❌ Need to generate and store DID documents
   - Action: Create DID document generator and link to agent

---

## Integration Guide for Developers

### Issuing a Credential

```typescript
// In your Convex action or mutation
import { internal } from './_generated/api'

// Issue capability verification credential
const result = await ctx.runMutation(
  internal.credentials.issueCapabilityVerificationCredential,
  {
    agentAddress: 'CjNXSBUPTM3aAuqLB2KWBN66VTmnh5o1sYeQW8YaQimc',
    capabilities: ['text_generation', 'code_analysis'],
    testsRun: 100,
    testsPassed: 85,
  }
)

// Result: { success: true, credentialId: "capability_verified_...", successRate: 85, validUntil: ... }
```

**Real-World Example (Observatory Integration):**

```typescript
// convex/observation.ts - After running tests
if (args.verifiedCapabilities.length > 0 && args.testsRun >= 5) {
  const res = await ctx.runMutation(
    internal.credentials.issueCapabilityVerificationCredential,
    {
      agentAddress: args.agentAddress,
      capabilities: args.verifiedCapabilities,
      testsRun: args.testsRun,
      testsPassed: args.testsSucceeded,
    }
  )
  console.log('Issued capability credential:', res.credentialId)
}
```

### Querying Agent Credentials

```typescript
// Public query (for web app)
import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'

const credentials = await fetchQuery(api.credentials.getAgentCredentialsPublic, {
  agentAddress: 'CjNXSBUPTM3aAuqLB2KWBN66VTmnh5o1sYeQW8YaQimc'
})

// Returns array of all credentials with type, credentialId, issuedAt, isValid, etc.
```

**Example Response:**

```json
[
  {
    "type": "identity",
    "credentialId": "agent_identity_abc123_xyz",
    "did": "did:sol:devnet:CjNXSBUPTM3aAuqLB2KWBN66VTmnh5o1sYeQW8YaQimc",
    "issuedAt": 1704758400000,
    "isValid": true
  },
  {
    "type": "capability",
    "credentialId": "capability_verified_abc123_xyz",
    "capabilities": ["text_generation", "code_analysis"],
    "successRate": 85,
    "issuedAt": 1704758400000,
    "isValid": true,
    "validUntil": 1707350400000
  },
  {
    "type": "uptime",
    "credentialId": "uptime_gold_abc123_xyz",
    "tier": "gold",
    "issuedAt": 1704758400000,
    "isValid": true
  }
]
```

**Paginated Query with Metadata:**

```typescript
const result = await fetchQuery(api.credentials.listAgentCredentialSummariesPublic, {
  agentAddress: 'CjNXSBUPTM3aAuqLB2KWBN66VTmnh5o1sYeQW8YaQimc',
  limit: 10,
  offset: 0
})

console.log(`Total credentials: ${result.total}`)
console.log(`Showing ${result.credentials.length} credentials`)
console.log(`Has more: ${result.hasMore}`)

// result.credentials contains rich metadata with display fields, tx signatures, etc.
```

### Uploading Metadata to IPFS

```typescript
// From browser or server
const response = await fetch('/api/ipfs/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    metadata: {
      name: 'My Agent',
      description: 'AI agent for code generation',
      capabilities: ['typescript', 'react'],
      contact: 'agent@example.com'
    }
  })
})

const { uri, cid, gatewayUrl } = await response.json()
// uri: "ipfs://QmXyz..."
// cid: "QmXyz..."
// gatewayUrl: "https://coffee-brilliant-python-998.mypinata.cloud/ipfs/QmXyz..."
```

**Using Custom Pinata Gateway:**

```typescript
import { ipfsToHttp } from '@/lib/utils/ipfs'

// Convert IPFS URI to HTTP gateway URL
const ipfsUri = 'ipfs://QmXyz...'
const httpUrl = ipfsToHttp(ipfsUri)
// Returns: "https://coffee-brilliant-python-998.mypinata.cloud/ipfs/QmXyz..."

// Fetch metadata from IPFS
const metadata = await fetch(httpUrl).then(r => r.json())
console.log('Agent metadata:', metadata)
```

### Handling Credential Expiry

**Capability Verification Credentials** expire after 30 days. **TEE Attestation Credentials** expire after 90 days.

```typescript
// Check for expiring credentials
const result = await fetchQuery(api.credentials.listAgentCredentialSummariesPublic, {
  agentAddress: 'YOUR_ADDRESS',
  limit: 50
})

const now = Date.now()
const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

for (const credential of result.credentials) {
  if (credential.expiresAt) {
    const timeUntilExpiry = credential.expiresAt - now

    if (timeUntilExpiry <= 0) {
      console.log(`❌ Expired: ${credential.credentialType} (${credential.credentialId})`)
      // Status will be 'expired'
    } else if (timeUntilExpiry < sevenDaysMs) {
      console.log(`⚠️ Expiring soon: ${credential.credentialType} (${credential.credentialId})`)
      console.log(`   Days remaining: ${Math.ceil(timeUntilExpiry / (24 * 60 * 60 * 1000))}`)
    }
  }
}
```

**Automatic Refresh Behavior:**

```typescript
// Observatory automatically refreshes expiring credentials
// When new tests are run with 70%+ success rate, credential is updated

// Example from convex/credentials.ts:349-363
const activeCredential = existing.find((c) => c.validUntil > timestamp)
if (activeCredential) {
  // Update existing credential instead of creating new one
  await ctx.db.patch(activeCredential._id, {
    testsRun: args.testsRun,
    testsPassed: args.testsPassed,
    successRate,
    capabilities: args.capabilities,
    validUntil: timestamp + 30 * 24 * 60 * 60 * 1000, // Extend 30 days
  })
  return { success: true, credentialId: activeCredential.credentialId, updated: true }
}
```

### Ghost Score Integration

Credentials contribute **15% of Ghost Score** via the `credentialVerifications` source.

```typescript
// convex/ghostScoreCalculator.ts:426-578
export async function calculateCredentialVerifications(
  ctx: QueryCtx,
  agentAddress: string
): Promise<SourceScore> {
  // Query all 10 credential tables in parallel
  const [
    identityCredentials,
    reputationCredentials,
    milestoneCredentials,
    stakingCredentials,
    verifiedHireCredentials,
    capabilityCredentials,
    uptimeCredentials,
    apiQualityCredentials,
    teeCredentials,
    modelCredentials,
  ] = await Promise.all([...])

  // Weight credentials by type (higher = more trust signal)
  const credentialWeights = {
    AGENT_IDENTITY: 1000,
    REPUTATION_TIER: 1500,
    PAYMENT_MILESTONE: 1200,
    VERIFIED_STAKER: 800,
    VERIFIED_HIRE: 1000,
    CAPABILITY_VERIFIED: 1800,  // Proves agent works
    UPTIME_ATTESTATION: 1200,
    API_QUALITY_GRADE: 1500,
    TEE_ATTESTATION: 2000,       // Highest trust signal
    MODEL_PROVENANCE: 800,
  }

  let totalScore = 0
  for (const cred of allCredentials) {
    const weight = credentialWeights[cred.type] || 500
    totalScore += weight
  }

  // Normalize to 0-10000 scale
  const rawScore = Math.min(10000, totalScore)

  // Confidence based on credential diversity (10 possible types)
  const uniqueTypes = new Set(allCredentials.map((c) => c.type))
  const confidence = Math.min(1, uniqueTypes.size / 10)

  return { rawScore, weight: 0.15, confidence, ... }
}
```

**Example: How Credentials Boost Ghost Score**

```typescript
// Agent starts with 0 credentials → credentialVerifications source: 0 points

// Day 1: Agent registers
// + Agent Identity (1000 points)
// Contribution to Ghost Score: 1000 * 0.15 = 150 points

// Day 1 (after Observatory tests):
// + Capability Verification (1800 points)
// Contribution: (1000 + 1800) * 0.15 = 420 points

// Day 7 (after uptime observation):
// + Uptime Attestation (1200 points)
// Contribution: (1000 + 1800 + 1200) * 0.15 = 600 points

// Day 30 (after earning reputation):
// + Reputation Tier - Bronze (1500 points)
// + Payment Milestone - Bronze (1200 points)
// Contribution: (1000 + 1800 + 1200 + 1500 + 1200) * 0.15 = 1005 points

// Day 90 (with TEE attestation):
// + TEE Attestation (2000 points)
// Contribution: (1000 + 1800 + 1200 + 1500 + 1200 + 2000) * 0.15 = 1305 points
```

**Querying Ghost Score with Credential Breakdown:**

```bash
bunx convex run ghostScoreCalculator:calculateAgentScore '{
  "agentAddress": "YOUR_ADDRESS"
}'
```

**Example Response:**

```json
{
  "score": 7500,
  "tier": "GOLD",
  "confidence": [7200, 7800],
  "sources": {
    "credentialVerifications": {
      "rawScore": 8700,
      "weight": 0.15,
      "confidence": 0.8,
      "dataPoints": 8,
      "timeDecayFactor": 0.95,
      "lastUpdated": 1704758400000
    },
    "paymentActivity": { ... },
    "stakingCommitment": { ... }
  },
  "badges": ["GOLD_TIER", "VERIFIED_AGENT"],
  "network": {
    "chain": "solana",
    "environment": "devnet"
  }
}
```

---

## Testing on Devnet

All features work identically on devnet and mainnet:

```bash
# 1. Set devnet RPC
export NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# 2. Claim agent (creates DID)
bunx convex run ghostDiscovery:claimAgent '{
  "ghostAddress": "YOUR_DEVNET_ADDRESS",
  "claimedBy": "YOUR_WALLET"
}'

# 3. Check issued credentials
bunx convex run credentials:getAgentCredentialsPublic '{
  "agentAddress": "YOUR_DEVNET_ADDRESS"
}'

# 4. Issue test credential
bunx convex run credentials:issueReputationCredential '{
  "agentAddress": "YOUR_DEVNET_ADDRESS",
  "ghostScore": 5000
}'
```

**Result:** Agent gets `did:sol:devnet:{address}` and Silver reputation credential.

---

## Production Checklist

Before going live with full W3C VC integration:

- [x] Pinata JWT configured
- [x] IPFS upload endpoint working
- [x] All 10 credential types implemented
- [x] DID issuance on agent claim
- [x] Credential queries (public + internal)
- [x] Schema with `crossmintCredentialId` fields
- [ ] Crossmint API keys added to environment
- [ ] Crossmint templates created (3 templates)
- [ ] Crossmint NFT minting endpoint (`/api/credentials/mint-nft`)
- [ ] W3C VC JSON-LD formatter utility
- [ ] DID document generator
- [ ] Link DID documents to IPFS
- [ ] Test full flow: devnet claim → credential → Crossmint NFT

---

## Useful Commands

```bash
# List all agents with DIDs
bunx convex run ghostDiscovery:listDiscoveredAgents

# Get specific agent's DID
bunx convex run ghostDiscovery:getDiscoveredAgent '{
  "ghostAddress": "CjNXSBUPTM3aAuqLB2KWBN66VTmnh5o1sYeQW8YaQimc"
}'

# Get credential details
bunx convex run credentials:getCredentialDetailsPublic '{
  "credentialType": "agent_identity",
  "credentialId": "agent_identity_abc123_123"
}'

# Force credential issuance (admin)
bunx convex run credentials:checkAndIssueMilestoneCredentials
```

---

## Architecture Diagram

```
┌─────────────────┐
│  Agent Claims   │
│  Ghost Address  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Issue Agent Identity    │
│ Credential              │
│ did:sol:network:address │
└────────┬────────────────┘
         │
         ├──► Store in Convex (agentIdentityCredentials)
         │
         ├──► Upload metadata to IPFS (optional)
         │
         └──► Mint as Crossmint NFT (optional)
                  │
                  ▼
         ┌─────────────────────┐
         │ W3C Verifiable      │
         │ Credential NFT      │
         │ (EVM + Solana)      │
         └─────────────────────┘
```

---

## Next Steps for Full Implementation

1. **Create Crossmint Templates** (30 min)
   - Go to https://www.crossmint.com/console
   - Create 3 templates using schemas above
   - Copy template IDs to `.env`

2. **Build NFT Minting Endpoint** (1-2 hours)
   - Create `/api/credentials/mint-nft/route.ts`
   - Call Crossmint API to mint NFT
   - Store `crossmintCredentialId` in Convex

3. **W3C VC Formatter** (1 hour)
   - Create `lib/vc/format.ts`
   - Convert Convex credentials to W3C VC JSON-LD
   - Add signature support

4. **DID Document Generator** (1 hour)
   - Create `lib/did/document.ts`
   - Generate DID document with service endpoints
   - Upload to IPFS and link to agent

5. **End-to-End Testing** (2 hours)
   - Test full flow on devnet
   - Verify Crossmint NFTs appear in wallets
   - Test mainnet compatibility

---

## Resources

- **W3C DID Specification:** https://www.w3.org/TR/did-core/
- **W3C VC Specification:** https://www.w3.org/TR/vc-data-model/
- **Solana DID Method:** https://github.com/identity-com/sol-did
- **Crossmint Docs:** https://docs.crossmint.com/
- **Pinata Docs:** https://docs.pinata.cloud/

---

**Status:** Infrastructure ready for both devnet and mainnet. Agents can use GhostSpeak on mainnet while testing features on devnet. Crossmint integration pending template creation and NFT minting endpoint.
