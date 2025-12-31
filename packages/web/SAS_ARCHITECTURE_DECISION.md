# SAS Architecture Decision

**Date**: December 31, 2025
**Status**: Recommendation

---

## Problem

`gill` (v0.10.2) and `sas-lib` (v1.0.10) have TypeScript type incompatibilities that prevent them from compiling in Convex actions:

```
Type 'TransactionSigner' is not assignable to type 'TransactionSigner<string>'.
Property '"__transactionSize:@solana/kit"' is missing...
```

While the code works at runtime (test scripts succeed), TypeScript compilation fails, preventing deployment to Convex.

---

## Options Considered

### Option A: Fix Type Mismatches (❌ Not Viable)
- Would require forking `gill` or `sas-lib`
- Libraries are actively developed, changes would break
- Maintenance burden too high

### Option B: Disable TypeCheck (❌ Already Tried)
- Used `--typecheck=disable` but functions still don't deploy
- Convex may have additional compilation steps that fail
- Not a reliable solution

### Option C: Separate SAS Service (✅ Recommended)
Create a standalone Bun/Node.js API service for SAS operations:

```
┌─────────────┐         ┌──────────────┐         ┌────────────┐
│   Convex    │────────▶│  SAS Service │────────▶│   Solana   │
│  Actions    │  HTTP   │  (Bun API)   │  RPC    │  Blockchain│
└─────────────┘         └──────────────┘         └────────────┘
```

**Advantages**:
- ✅ Full control over runtime environment
- ✅ Libraries work perfectly (proven by test scripts)
- ✅ Can use latest Solana tooling
- ✅ Better separation of concerns
- ✅ Easier to debug and monitor
- ✅ Can add rate limiting, caching, etc.

**Disadvantages**:
- Requires separate deployment
- HTTP latency (minimal, ~50-100ms)
- Need API authentication

---

## Recommended Implementation

### 1. Create SAS API Service

**File**: `packages/sas-api/server.ts`

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createSolanaClient, createKeyPairSignerFromBytes } from 'gill'
import { issueAttestation } from './lib/sas/attestations'

const app = new Hono()

// Load config from environment or database
const config = await loadSASConfig()

app.use('/*', cors())

app.post('/issue-credential', async (c) => {
  const { type, data, nonce } = await c.req.json()

  // Validate API key from Convex
  const apiKey = c.req.header('Authorization')
  if (!validateApiKey(apiKey)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Issue attestation
  const result = await issueAttestation({
    client: config.client,
    payer: config.payer,
    authority: config.authority,
    authorizedSigner: config.authorizedSigner,
    schemaType: type,
    data,
    nonce,
  })

  return c.json({
    success: true,
    attestationPda: result.attestationPda,
    signature: result.signature,
  })
})

export default app
```

### 2. Deploy Options

#### A. Railway/Render (Easiest)
```bash
# Dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY . .
RUN bun install
CMD ["bun", "run", "server.ts"]
```

#### B. Cloudflare Workers (Free Tier)
- Bun-compatible
- Global edge deployment
- Zero cold starts

#### C. Vercel Edge Functions
- Seamless Next.js integration
- Built-in monitoring

### 3. Update Convex Actions

```typescript
// convex/sasCredentialsAction.ts
export const issueAgentIdentityCredential = internalAction({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // Call external SAS API
    const response = await fetch('https://sas-api.yourapp.com/issue-credential', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'AGENT_IDENTITY',
        data: args,
        nonce: args.agentAddress,
      }),
    })

    const result = await response.json()

    // Record in database
    await ctx.runMutation(internal.credentialsOrchestrator.recordAgentIdentityCredential, {
      agentAddress: args.agentAddress,
      credentialId: result.attestationPda,
      crossmintId: result.signature,
      did: args.did,
    })

    return result
  }
})
```

---

## Alternative: Hybrid Approach

Keep credential **verification** in Convex (read-only, no crypto issues) and move only **issuance** to external service:

```typescript
// Convex can verify attestations (no keypairs needed)
export const verifyCredential = query({
  handler: async (ctx, { address, schemaType }) => {
    const attestation = await fetchAttestationFromSolana(address, schemaType)
    return { valid: attestation.isValid, data: attestation.data }
  }
})

// External service handles issuance (needs keypairs)
// POST /api/sas/issue
```

---

## Migration Path

### Phase 1: Quick Fix (Current Sprint)
1. Create simple Bun API server for SAS operations
2. Deploy to Railway (free tier, 5 min setup)
3. Update Convex actions to call API
4. Test end-to-end

### Phase 2: Production Hardening
1. Add proper authentication (JWT tokens)
2. Implement rate limiting
3. Add monitoring/logging
4. Set up CI/CD

### Phase 3: Optimization
1. Add caching layer (Redis)
2. Implement retry logic
3. Add webhook notifications
4. Monitor performance

---

## Decision

**Recommended**: Option C - Separate SAS Service

**Rationale**:
- Proven to work (test scripts succeed)
- Clean architecture
- Future-proof
- Easy to maintain
- Can use any Solana tooling we want

**Next Steps**:
1. Create `packages/sas-api` with Bun server
2. Deploy to Railway
3. Update Convex actions to call API
4. Test end-to-end flow
5. Document deployment process

---

## Appendix: Test Script Evidence

Our test scripts prove the SAS integration works perfectly outside Convex:

```bash
$ bun run scripts/verify-existing-attestation.ts
✅ ATTESTATION VERIFIED!
Agent: 3ZLCyEv44BNZde4zdFkFAkzABzW4cxbQNmV1Jo5bAzyE
Expires: 2026-12-31T14:11:02.000Z

$ bun run scripts/test-direct-sas.ts
✅ Transaction confirmed!
✅ ATTESTATION VERIFIED!
```

The issue is **only** with Convex's TypeScript compilation, not the runtime functionality.

---

**Conclusion**: Move SAS operations to a separate, purpose-built service where the libraries work perfectly. This is a better architecture anyway and gives us more flexibility.
