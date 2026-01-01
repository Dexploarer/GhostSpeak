# Caisper (plugin-ghostspeak) - Capability Analysis

**Date**: December 31, 2025
**Based on**: Actual plugin code reading
**File**: `plugin-ghostspeak/src/plugin.ts` (1,258 lines)

---

## What Caisper Actually Does

**Character**: "Caisper - Bouncer & Concierge of the Solana Agents Club"
**Role**: "Checks IDs at the door and knows exactly who you need inside"

### ✅ What Caisper CAN Do (Production-Ready)

#### 1. Ghost Score Checking ✅

**Action**: `checkGhostScoreAction`
**Provider**: `ghostScoreProvider`

```typescript
// Fetches REAL on-chain data from GhostSpeak blockchain
const client = createGhostSpeakClient();
const agentData = await client.agents.getAgentAccount(agentAddress);

// Calculates Ghost Score from on-chain reputation
const reputationScore = Number(agentData.reputationScore || 0);
const ghostScore = Math.min(1000, Math.round(reputationScore / 100));
const tier = getGhostScoreTier(ghostScore); // PLATINUM/GOLD/SILVER/BRONZE/NEWCOMER
```

**What it provides**:
- 📊 Ghost Score (0-1000)
- 🏆 Tier (PLATINUM/GOLD/SILVER/BRONZE/NEWCOMER)
- ✅ Total Jobs Completed
- 📈 Success Rate
- 🟢/🔴 Active Status

**Example**:
```
User: "Check ghost score for 7xKXt...9Gk"
Caisper:
Ghost Score for Agent (7xKXt...9Gk):
📊 Ghost Score: 785/1000
🏆 Tier: GOLD
✅ Total Jobs Completed: 1247
📈 Success Rate: 94%
🟢 Active
```

#### 2. API Routes for Trust Data ✅

**Available Routes**:

1. **`GET /api/ghost-score/:agentAddress`**
   - Returns Ghost Score, tier, metrics
   - Real blockchain data

2. **`GET /api/reputation/:agentAddress`**
   - Detailed reputation breakdown
   - Success rate, service quality, risk score
   - Trust level (HIGH/MEDIUM/LOW)

3. **`GET /api/agents/search?query=...&minScore=...`**
   - Search agents by name/description
   - Filter by minimum Ghost Score
   - Returns sorted by reputation

4. **`GET /api/trust-scoreboard?limit=10&category=...`**
   - Top agents by Ghost Score
   - Leaderboard functionality
   - Filter by category

5. **`GET /api/payai/discover?capability=...&maxPrice=...`**
   - Discover PayAI marketplace agents
   - Uses real PayAI Client SDK
   - Filter by capability and price

#### 3. Basic Credential Verification ⚠️

**Route**: `POST /api/credentials/verify`

```typescript
// Basic structure validation (NOT full cryptographic verification)
const isValid = !!(
  credential['@context'] &&
  credential.type &&
  credential.issuer &&
  credential.credentialSubject
);
```

**What it does**:
- ✅ Validates W3C credential structure
- ✅ Checks required fields exist
- ❌ Does NOT verify cryptographic signatures
- ❌ Does NOT verify on-chain credential data

**Note**: Says "In production, this would use CrossmintVCClient or similar"

---

## ❌ What Caisper CANNOT Do (Missing or Incomplete)

### 1. Credential Issuance ❌

**Not implemented** in the plugin. To issue credentials, you need to use:
- The web app (`@ghostspeak/web`)
- The SDK directly (`@ghostspeak/sdk`)
- The CLI (`@ghostspeak/cli`)

**Why not in plugin**: Credential issuance requires:
- Wallet signing (agent needs private key)
- Crossmint API integration
- On-chain transaction execution

**What the plugin says**:
```typescript
// From /api/elizaos/register-with-ghostspeak route (line 1102)
instructions: {
  step2: {
    title: 'Issue Verifiable Credential',
    description: 'Get W3C credential for cross-chain identity',
    code: `const credential = await client.credentials.issueAgentIdentityCredential({
      agentId: agent.address,
      name: '${name}',
      capabilities: ${JSON.stringify(capabilities)},
      syncToCrossmint: true, // Bridge to EVM
    });`,
  }
}
```

### 2. Agent Registration ❌

**Route**: `POST /api/agents/register` (line 894)

```typescript
// Returns MOCK response - actual implementation needs wallet integration
const mockAddress = '11111111111111111111111111111111';
const mockSignature = 'mock-transaction-signature';

return {
  success: true,
  address: mockAddress,
  signature: mockSignature,
  message: 'Agent registration initiated. In production, this would execute a blockchain transaction.',
};
```

**Why not implemented**: Requires wallet/signer which agents don't have in plugin context

### 3. Full Credential Verification ❌

Only does structure validation, not:
- ❌ Cryptographic signature verification
- ❌ On-chain credential lookup
- ❌ Crossmint credential verification
- ❌ Issuer verification

### 4. PayAI Reputation Tracking ❌

- ✅ Can DISCOVER PayAI agents
- ❌ Cannot TRACK reputation from PayAI
- ❌ Cannot RECORD payments from PayAI webhooks
- ❌ Cannot ISSUE credentials based on PayAI data

**Why**: PayAI webhook handler is in the web app (`packages/web/app/api/payai/webhook/route.ts`), not in the plugin

### 5. ElizaOS Cloud Integration ❌

**Routes**:
- `/api/elizaos/discover` - Returns empty (no public API)
- `/api/elizaos/register` - Returns instructions only
- `/api/elizaos/register-with-ghostspeak` - Returns code examples only

**Why**: ElizaOS Cloud doesn't have public agent discovery API

---

## What This Means

### Caisper is a "Trust Checker", Not a "Trust Issuer"

```
┌─────────────────────────────────────────────────┐
│         GhostSpeak Full Capabilities            │
├─────────────────────────────────────────────────┤
│                                                 │
│  READ Operations (✅ Caisper HAS):              │
│  • Check Ghost Scores                           │
│  • Verify credential structure                  │
│  • Search agents by reputation                  │
│  • View trust scoreboard                        │
│  • Discover PayAI agents                        │
│                                                 │
│  WRITE Operations (❌ Caisper MISSING):         │
│  • Issue Verifiable Credentials                 │
│  • Register new agents                          │
│  • Record PayAI payments                        │
│  • Track reputation updates                     │
│  • Bridge credentials to EVM                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Where the Full Features Are

| Feature | Caisper Plugin | Web App | SDK | CLI |
|---------|---------------|---------|-----|-----|
| **Check Ghost Score** | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Search Agents** | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **View Scoreboard** | ✅ Full | ✅ Full | ✅ Full | ❌ |
| **Verify Credentials** | ⚠️ Basic | ✅ Full | ✅ Full | ✅ Full |
| **Issue Credentials** | ❌ | ✅ Full | ✅ Full | ✅ Full |
| **Register Agents** | ❌ Mock | ✅ Full | ✅ Full | ✅ Full |
| **PayAI Webhooks** | ❌ | ✅ Full | ✅ Full | ❌ |
| **Crossmint Bridge** | ❌ | ✅ Full | ✅ Full | ❌ |
| **Staking** | ❌ | ✅ Full | ✅ Full | ❌ |

---

## Use Cases

### What Caisper is PERFECT For ✅

1. **Pre-interaction Trust Checks**
   ```
   Agent: "Before I hire this agent, what's their Ghost Score?"
   Caisper: "Ghost Score: 785/1000 (GOLD tier), 94% success rate, 1247 jobs completed"
   ```

2. **Agent Discovery**
   ```
   Agent: "Find me code analysis agents with Ghost Score above 700"
   Caisper: *Returns filtered agent list with scores*
   ```

3. **Trust Scoreboard**
   ```
   Agent: "Show me the top 10 most trusted agents"
   Caisper: *Returns leaderboard with Ghost Scores*
   ```

4. **PayAI Marketplace Discovery**
   ```
   Agent: "What agents are available on PayAI?"
   Caisper: *Queries PayAI Client, returns agent list*
   ```

### What Caisper CANNOT Do ❌

1. **Issue Credentials**
   - Caisper can't issue W3C credentials
   - Need to use SDK/Web App/CLI

2. **Register New Agents**
   - Caisper returns mock data
   - Need wallet signing from SDK/Web App

3. **Track Reputation from PayAI**
   - Caisper can discover PayAI agents
   - Can't track payments or update reputation
   - That happens in web app webhook handler

4. **Bridge Credentials to EVM**
   - Caisper doesn't integrate with Crossmint
   - Need SDK/Web App for EVM bridging

---

## Architecture Clarity

### How Caisper Fits In

```
ElizaOS Agent using Caisper Plugin
  ↓
"Check ghost score for agent X"
  ↓
Caisper Plugin
  ↓
GhostSpeakClient (from SDK)
  ↓
Solana RPC (read blockchain data)
  ↓
Return Ghost Score to agent
```

**Caisper uses the SDK but only exposes READ operations**

### For WRITE Operations, Use:

```
User/Agent
  ↓
Web App or SDK or CLI
  ↓
GhostSpeakClient (full features)
  ↓
Wallet Signing
  ↓
On-chain transaction (register, issue credential, etc.)
  ↓
PayAI webhook (if reputation tracking)
  ↓
Update Ghost Score
```

---

## Code Evidence

### What Caisper Uses from SDK

```typescript
// Line 18: Imports from SDK
import { GhostSpeakClient, createPayAIClient } from '@ghostspeak/sdk';

// Line 159: Creates client
function createGhostSpeakClient(): GhostSpeakClient {
  return new GhostSpeakClient({
    cluster: (process.env.SOLANA_CLUSTER as 'devnet' | 'mainnet-beta' | 'testnet') || 'devnet',
    rpcEndpoint: process.env.SOLANA_RPC_URL,
  });
}

// Line 241: Uses SDK to fetch agent data
const client = createGhostSpeakClient();
const agentData = await client.agents.getAgentAccount(agentAddress);

// Line 700: Uses SDK to get all agents
const allAgents = await client.agents.getAllAgents();

// Line 952: Uses PayAI Client
const payaiClient = createPayAIClient({
  facilitatorUrl,
});
const result = await payaiClient.listResources({
  capability,
  maxPrice,
});
```

### What Caisper DOESN'T Use

```typescript
// ❌ Not used in plugin:
// client.credentials.issueAgentIdentityCredential()
// client.credentials.issueReputationCredential()
// client.agents.register()
// client.staking.stake()
// CrossmintVCClient
```

---

## Answer to Your Question

### Q: "Does the GhostSpeak plugin offer the verified credentials and everything GhostSpeak actual does?"

### A: **No, but it offers the most important part for agents**

**What Caisper DOES offer**:
- ✅ Ghost Score checking (full on-chain data)
- ✅ Agent search and discovery
- ✅ Trust scoreboard (leaderboard)
- ✅ PayAI marketplace discovery
- ⚠️ Basic credential structure validation

**What Caisper DOESN'T offer**:
- ❌ Credential issuance
- ❌ Agent registration (only mock)
- ❌ Full credential verification
- ❌ PayAI reputation tracking
- ❌ Crossmint EVM bridging
- ❌ Staking

### Why This Makes Sense

**For ElizaOS agents using Caisper**:
- They need to CHECK trust before interacting with other agents
- They don't need to ISSUE credentials themselves
- They don't need to REGISTER (their operator does that via web app/CLI)

**For Agent Operators**:
- Use web app or SDK or CLI to:
  - Register agents
  - Issue credentials
  - Track reputation from PayAI
  - Manage staking

### Summary

**Caisper = Read-Only Trust Oracle for Eliza Agents**

It's like a bouncer at a club:
- ✅ Can check IDs (Ghost Scores)
- ✅ Can tell you who's inside (agent search)
- ✅ Can show you the VIP list (scoreboard)
- ❌ Can't issue new IDs (credential issuance)
- ❌ Can't register new members (agent registration)

**And that's exactly what it should be!** Agents need to check trust, not issue credentials.

---

## Recommendations

### For Agent Trust Checking ✅
**Use Caisper** - Perfect for:
- Pre-interaction trust verification
- Agent discovery
- Reputation checks
- PayAI marketplace discovery

### For Credential Issuance ❌
**Use SDK/Web App/CLI** - Required for:
- Issuing W3C credentials
- Registering new agents
- Tracking PayAI reputation
- Bridging to EVM
- Staking GHOST tokens

### For PayAI Integration 🔄
**Both**:
- Caisper: Discover PayAI agents
- Web App: Track PayAI payments, update reputation

---

**END OF ANALYSIS**

✅ Caisper is a specialized trust checker for Eliza agents
❌ It's not a full GhostSpeak client (and doesn't need to be)
🎯 For full features, use the web app, SDK, or CLI
