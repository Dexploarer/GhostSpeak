# Caisper Full Feature Parity - Implementation Plan

**Date**: December 31, 2025
**Goal**: Achieve full feature parity across Caisper Plugin, Web App, SDK, and CLI
**Status**: Planning → Implementation

---

## Current State

| Feature | Caisper Plugin | Web App | SDK | CLI |
|---------|---------------|---------|-----|-----|
| Check Ghost Score | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Issue Credentials | ❌ | ✅ Full | ✅ Full | ✅ Full |
| Register Agents | ❌ Mock | ✅ Full | ✅ Full | ✅ Full |
| PayAI Webhooks | ❌ | ✅ Full | ✅ Full | ❌ |
| Crossmint Bridge | ❌ | ✅ Full | ✅ Full | ❌ |

## Target State

| Feature | Caisper Plugin | Web App | SDK | CLI |
|---------|---------------|---------|-----|-----|
| Check Ghost Score | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Issue Credentials | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Register Agents | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| PayAI Webhooks | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Crossmint Bridge | ✅ Full | ✅ Full | ✅ Full | ✅ Full |

---

## Architecture Requirements

### 1. Wallet/Signer Management

**Challenge**: ElizaOS agents need private keys to sign transactions

**Solution Options**:

#### Option A: Agent Runtime Wallet (RECOMMENDED)
```typescript
// ElizaOS agents can have wallets in their runtime
interface IAgentRuntime {
  agentId: string
  wallet?: {
    privateKey: string  // Or encrypted key
    publicKey: string
    address: string
  }
}

// In Caisper plugin
const signer = await createSignerFromRuntime(runtime)
```

**Pros**:
- ✅ Each agent has its own wallet
- ✅ Secure (agent controls its own keys)
- ✅ Aligns with ElizaOS architecture

**Cons**:
- ❌ Need to document how agents get wallets
- ❌ Key management complexity

#### Option B: Shared Service Wallet
```typescript
// Plugin service holds a master wallet
export class GhostSpeakWalletService extends Service {
  private masterSigner: KeyPairSigner

  async signTransaction(runtime: IAgentRuntime, tx: Transaction) {
    // Use master wallet to sign
  }
}
```

**Pros**:
- ✅ Simpler to set up
- ✅ One wallet for all plugin operations

**Cons**:
- ❌ All agents share one wallet
- ❌ Not truly autonomous
- ❌ Security risk

**DECISION**: Use Option A (Agent Runtime Wallet)

### 2. Credential Issuance

**Requirements**:
- Agent must be registered on GhostSpeak
- Agent needs wallet to sign
- Crossmint integration for EVM bridge
- W3C credential format

**Implementation**:
```typescript
const issueCredentialAction: Action = {
  name: 'ISSUE_CREDENTIAL',
  description: 'Issue a Verifiable Credential for an agent',

  handler: async (runtime, message, state, options, callback) => {
    // 1. Get signer from runtime
    const signer = await getAgentSigner(runtime)

    // 2. Parse credential details from message
    const { agentId, credentialType, subject } = parseMessage(message)

    // 3. Create GhostSpeak client
    const client = createGhostSpeakClient()

    // 4. Issue credential on-chain
    const credential = await client.credentials.issueAgentIdentityCredential({
      agentId: address(agentId),
      owner: signer.address,
      name: subject.name,
      capabilities: subject.capabilities,
      x402Enabled: true,
      syncToCrossmint: true,
      recipientEmail: subject.email,
    })

    // 5. Return result
    return {
      success: true,
      data: {
        credentialId: credential.solanaCredential.credentialId,
        crossmintId: credential.crossmintSync?.id,
      }
    }
  }
}
```

### 3. Agent Registration

**Requirements**:
- Wallet to sign registration transaction
- Agent metadata (name, description, capabilities)
- Optional: Merkle tree for compressed NFT

**Implementation**:
```typescript
const registerAgentAction: Action = {
  name: 'REGISTER_AGENT',
  description: 'Register a new agent on GhostSpeak',

  handler: async (runtime, message, state, options, callback) => {
    // 1. Get signer from runtime
    const signer = await getAgentSigner(runtime)

    // 2. Parse agent details
    const { name, description, capabilities, model } = parseMessage(message)

    // 3. Create GhostSpeak client
    const client = createGhostSpeakClient()

    // 4. Register agent on-chain
    const agent = await client.agents.register(signer, {
      name,
      description,
      capabilities,
      model,
    })

    // 5. Store agent address in runtime state
    await runtime.setState('ghostspeakAgentAddress', agent.address)

    return {
      success: true,
      data: {
        agentAddress: agent.address.toString(),
        transactionSignature: agent.signature,
      }
    }
  }
}
```

### 4. PayAI Webhook Handler

**Challenge**: Plugins don't typically run webhook servers

**Solution Options**:

#### Option A: Route-Based Webhook Handler (RECOMMENDED)
```typescript
// In plugin routes
{
  name: 'payai-webhook-handler',
  path: '/api/payai/webhook',
  type: 'POST',
  handler: async (req: RouteRequest, res: RouteResponse) => {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

      // Verify webhook signature
      const isValid = await verifyPayAIWebhookSignature(req, body)
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid webhook signature' })
      }

      // Process payment event
      const { agentAddress, paymentSignature, amount, success } = body

      // Update reputation
      await updateAgentReputation(agentAddress, {
        paymentSignature,
        amount,
        success,
      })

      // Maybe issue credential at milestone
      await maybeIssueCredential(agentAddress)

      return res.json({ success: true })
    } catch (error) {
      logger.error({ error }, 'PayAI webhook error')
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}
```

**Pros**:
- ✅ Uses ElizaOS route system
- ✅ No separate server needed
- ✅ Can use agent runtime

**Cons**:
- ❌ Depends on ElizaOS running HTTP server
- ❌ May not work in all deployment modes

#### Option B: Service with Polling
```typescript
export class PayAIPollingService extends Service {
  private intervalId: any

  async start() {
    // Poll for new payments every 5 minutes
    this.intervalId = setInterval(async () => {
      await this.pollPayments()
    }, 5 * 60 * 1000)
  }

  async pollPayments() {
    // Fetch recent payments from PayAI API or on-chain
    // Update reputation accordingly
  }

  async stop() {
    clearInterval(this.intervalId)
  }
}
```

**Pros**:
- ✅ Works in any deployment
- ✅ No webhook server needed
- ✅ Reliable

**Cons**:
- ❌ Delayed updates (5 min intervals)
- ❌ More API calls
- ❌ Potential missed events

**DECISION**: Implement both (Route for webhook + Service for polling as backup)

### 5. Crossmint Bridge Integration

**Requirements**:
- Crossmint API key
- Credential templates
- Recipient email/wallet

**Implementation**:
```typescript
// In credential issuance action
import { CrossmintVCClient } from '@ghostspeak/sdk'

const crossmint = new CrossmintVCClient({
  apiKey: process.env.CROSSMINT_SECRET_KEY,
  environment: process.env.CROSSMINT_ENV || 'staging',
  chain: 'base-sepolia',
})

// Issue credential with Crossmint sync
const result = await crossmint.issueReputationCredential(
  templateId,
  recipientEmail,
  subject
)
```

---

## Implementation Tasks

### Phase 1: Foundation (1-2 hours)

#### Task 1.1: Wallet/Signer Management
- [ ] Create `getAgentSigner()` helper function
- [ ] Support runtime.wallet
- [ ] Support environment variable fallback
- [ ] Add wallet validation
- [ ] Document wallet setup for agents

#### Task 1.2: Configuration Schema
- [ ] Add Crossmint config to plugin
- [ ] Add PayAI config
- [ ] Add Solana network config
- [ ] Validate all required env vars

### Phase 2: Core Actions (2-3 hours)

#### Task 2.1: Issue Credential Action
- [ ] Create `ISSUE_CREDENTIAL` action
- [ ] Implement W3C credential issuance
- [ ] Add Crossmint sync
- [ ] Add examples and validation
- [ ] Error handling

#### Task 2.2: Register Agent Action
- [ ] Create `REGISTER_AGENT` action
- [ ] Implement on-chain registration
- [ ] Handle compressed NFT option
- [ ] Store agent address in runtime state
- [ ] Error handling

#### Task 2.3: Verify Credential Action (Enhanced)
- [ ] Upgrade from basic structure check to full verification
- [ ] Add on-chain credential lookup
- [ ] Add Crossmint verification
- [ ] Add signature verification
- [ ] Return detailed verification result

### Phase 3: PayAI Integration (1-2 hours)

#### Task 3.1: PayAI Webhook Route
- [ ] Create `/api/payai/webhook` route
- [ ] Implement webhook signature verification
- [ ] Parse payment events
- [ ] Update agent reputation
- [ ] Auto-issue credentials at milestones

#### Task 3.2: PayAI Polling Service
- [ ] Create `PayAIPollingService`
- [ ] Implement on-chain payment polling
- [ ] Sync with webhook data (dual-source)
- [ ] Handle missed events

### Phase 4: CLI Updates (1 hour)

#### Task 4.1: CLI Webhook Support
- [ ] Add `ghostspeak webhook start` command
- [ ] Run webhook server locally
- [ ] Tunnel to PayAI (ngrok or similar)
- [ ] Log webhook events

#### Task 4.2: CLI Crossmint Support
- [ ] Add `ghostspeak credential issue --crossmint` flag
- [ ] Bridge credentials to EVM
- [ ] Show Crossmint credential ID

### Phase 5: Testing & Documentation (1-2 hours)

#### Task 5.1: Integration Tests
- [ ] Test credential issuance
- [ ] Test agent registration
- [ ] Test PayAI webhook flow
- [ ] Test Crossmint bridging
- [ ] Test all actions in ElizaOS context

#### Task 5.2: Documentation
- [ ] Update Caisper README
- [ ] Add wallet setup guide
- [ ] Document all new actions
- [ ] Add Crossmint setup guide
- [ ] Add PayAI webhook setup guide

---

## Environment Variables Required

### For Caisper Plugin

```bash
# Solana Configuration
SOLANA_CLUSTER=devnet  # or mainnet-beta
SOLANA_RPC_URL=https://api.devnet.solana.com
GHOSTSPEAK_PROGRAM_ID=GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9

# Agent Wallet (per agent)
AGENT_WALLET_PRIVATE_KEY=base58-encoded-private-key

# PayAI Configuration
PAYAI_WEBHOOK_SECRET=your-webhook-secret
PAYAI_FACILITATOR_URL=https://facilitator.payai.network

# Crossmint Configuration
CROSSMINT_SECRET_KEY=your-secret-key
CROSSMINT_REPUTATION_TEMPLATE_ID=your-template-id
CROSSMINT_ENV=staging  # or production
CROSSMINT_CHAIN=base-sepolia
```

### For CLI

```bash
# Same as above, plus:
WEBHOOK_PORT=3000  # For local webhook server
NGROK_AUTH_TOKEN=your-ngrok-token  # For webhook tunneling
```

---

## Code Structure

### New Files to Create

1. **`plugin-ghostspeak/src/wallet.ts`** (150 lines)
   - Wallet/signer management
   - Runtime wallet extraction
   - Environment variable fallback

2. **`plugin-ghostspeak/src/actions/issueCredential.ts`** (200 lines)
   - Issue credential action
   - Crossmint integration
   - W3C credential formatting

3. **`plugin-ghostspeak/src/actions/registerAgent.ts`** (150 lines)
   - Agent registration action
   - On-chain transaction handling

4. **`plugin-ghostspeak/src/actions/verifyCredential.ts`** (250 lines)
   - Enhanced credential verification
   - On-chain lookup
   - Signature verification

5. **`plugin-ghostspeak/src/services/PayAIPollingService.ts`** (200 lines)
   - PayAI polling service
   - On-chain payment tracking
   - Reputation updates

6. **`plugin-ghostspeak/src/routes/payaiWebhook.ts`** (150 lines)
   - PayAI webhook handler
   - Signature verification
   - Event processing

### Modified Files

1. **`plugin-ghostspeak/src/plugin.ts`**
   - Add new actions
   - Add PayAI polling service
   - Add PayAI webhook route
   - Update config schema

2. **`plugin-ghostspeak/package.json`**
   - Add @solana/signers dependency
   - Add @solana/transactions dependency
   - Ensure all SDK dependencies

---

## Testing Strategy

### Unit Tests

```typescript
// tests/wallet.test.ts
describe('Wallet Management', () => {
  it('should extract wallet from runtime', async () => {
    const runtime = createMockRuntime({ wallet: testWallet })
    const signer = await getAgentSigner(runtime)
    expect(signer.address).toBe(testWallet.address)
  })

  it('should fallback to environment variable', async () => {
    process.env.AGENT_WALLET_PRIVATE_KEY = testPrivateKey
    const runtime = createMockRuntime({})
    const signer = await getAgentSigner(runtime)
    expect(signer).toBeDefined()
  })
})
```

### Integration Tests

```typescript
// tests/integration/credential.test.ts
describe('Credential Issuance', () => {
  it('should issue credential on-chain', async () => {
    const action = issueCredentialAction
    const result = await action.handler(
      runtime,
      createMessage('Issue credential for agent X'),
      state,
      options,
      callback
    )

    expect(result.success).toBe(true)
    expect(result.data.credentialId).toBeDefined()
  })
})
```

---

## Risks & Mitigations

### Risk 1: Wallet Security
**Risk**: Agent private keys stored in environment variables
**Mitigation**:
- Document best practices (encrypted storage, vault services)
- Support hardware wallet integration (future)
- Add key rotation support

### Risk 2: ElizaOS Route Compatibility
**Risk**: ElizaOS might not support HTTP routes in all deployments
**Mitigation**:
- Implement polling service as fallback
- Document route requirements
- Provide both webhook and polling options

### Risk 3: Crossmint API Rate Limits
**Risk**: High volume credential issuance might hit rate limits
**Mitigation**:
- Batch credential requests
- Implement retry logic
- Cache credentials locally

### Risk 4: Transaction Fees
**Risk**: Agents need SOL for transaction fees
**Mitigation**:
- Document SOL requirements
- Implement auto-airdrop for devnet
- Use compressed NFTs (cheaper)

---

## Success Criteria

### Phase 1: Foundation ✅
- [ ] Wallet management works
- [ ] Configuration validated
- [ ] Tests pass

### Phase 2: Core Actions ✅
- [ ] Credential issuance works end-to-end
- [ ] Agent registration works
- [ ] Enhanced credential verification works
- [ ] All actions have tests

### Phase 3: PayAI Integration ✅
- [ ] Webhook handler receives events
- [ ] Polling service finds payments
- [ ] Reputation updates correctly
- [ ] Auto-credential issuance works

### Phase 4: CLI Updates ✅
- [ ] CLI webhook server works
- [ ] CLI Crossmint bridging works

### Phase 5: Full Parity ✅
- [ ] All features work in Caisper
- [ ] All features work in CLI
- [ ] Documentation complete
- [ ] Tests pass

---

## Timeline

**Total Estimated Time**: 8-10 hours

- Phase 1: 1-2 hours
- Phase 2: 2-3 hours
- Phase 3: 1-2 hours
- Phase 4: 1 hour
- Phase 5: 1-2 hours
- Buffer: 1-2 hours

**Start**: December 31, 2025
**Target Completion**: January 1, 2026

---

## Next Steps

1. **Review and approve this plan**
2. **Set up development environment**
3. **Begin Phase 1: Foundation**
4. **Implement incrementally with tests**
5. **Document as we go**

---

**Ready to start implementing?**

Let me know if you want me to:
1. Start with Phase 1 (Wallet Management)
2. Adjust the plan
3. Focus on a specific feature first
