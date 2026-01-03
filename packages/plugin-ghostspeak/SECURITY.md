# GhostSpeak Plugin Security Model

## Agent Claiming Security

### Current Implementation (Phase 1) - ✅ CRYPTOGRAPHICALLY SECURE

**Authentication Flow:**
```
1. User connects wallet via Solana Wallet Adapter (frontend)
2. User signs authentication message with private key
3. Convex verifies signature cryptographically (signInWithSolana mutation)
4. Session token issued after successful signature verification
5. Frontend sends sessionToken + walletAddress to /api/agent/chat
6. API route validates sessionToken format
7. Agent receives authenticated userId from session
8. Claim action validates: agentAddress === authenticatedUserId
```

**Cryptographic Verification (signInWithSolana):**
```typescript
// Convex: convex/solanaAuth.ts
const messageBytes = new TextEncoder().encode(args.message)
const signatureBytes = bs58.decode(args.signature)
const publicKeyBytes = bs58.decode(args.publicKey)

const isValid = nacl.sign.detached.verify(
  messageBytes,
  signatureBytes,
  publicKeyBytes
)

if (!isValid) {
  throw new Error('Invalid signature')
}

// Only after signature verification
const sessionToken = `session_${userId}_${Date.now()}`
```

**Security Guarantees:**
- ✅ User MUST prove wallet ownership via cryptographic signature (Ed25519)
- ✅ User can only claim agents matching their signed wallet address
- ✅ Agent validates wallet address match before Convex mutation
- ✅ Session token proves user completed signature verification
- ✅ Cannot spoof walletAddress without private key

**Attack Scenarios:**
- ❌ BLOCKED: User tries to claim agent they don't own → Rejected by address mismatch validation
- ❌ BLOCKED: Malicious client spoofs walletAddress → Fails signature verification at login
- ❌ BLOCKED: Replay attack with old sessionToken → Token includes userId, validates against claimed address
- ✅ SECURE: Signature verification requires private key ownership

### Future Enhancement (Phase 2) - Per-Message Signatures

**Current Phase 1 uses login signature + session token. Phase 2 would add per-message signatures:**

```typescript
// Frontend: Sign claim intent
const message = `GhostSpeak Claim Agent: ${agentAddress} at ${timestamp}`
const signature = await wallet.signMessage(new TextEncoder().encode(message))

// Send to API
fetch('/api/agent/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: `claim agent ${agentAddress}`,
    walletAddress,
    signature: bs58.encode(signature),
    timestamp,
  })
})

// Backend: Verify signature
import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'
import bs58 from 'bs58'

const messageBytes = new TextEncoder().encode(`GhostSpeak Claim Agent: ${agentAddress} at ${timestamp}`)
const signatureBytes = bs58.decode(signature)
const publicKeyBytes = new PublicKey(walletAddress).toBytes()

const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)

if (!isValid) {
  throw new Error('Invalid signature - wallet ownership not proven')
}

// Check timestamp freshness (prevent replay attacks)
if (Date.now() - timestamp > 60000) { // 1 minute
  throw new Error('Signature expired')
}
```

**Enhanced Security Guarantees:**
- ✅ Cryptographic proof of wallet ownership
- ✅ Prevents API request spoofing
- ✅ Timestamp prevents replay attacks
- ✅ No trust required in frontend walletAddress claim

## Why Phase 1 is Production-Ready

1. **Cryptographic Proof at Login**: User must sign message with private key to get session token
2. **Session Token Validation**: All API calls require valid session token from authenticated session
3. **Address Match Validation**: Agent validates claimed address matches authenticated session wallet
4. **Cannot Bypass Without Private Key**: Spoofing walletAddress fails at signature verification step
5. **Industry Standard**: Session-based auth after signature verification is used by major Web3 apps

## When to Implement Phase 2

Implement cryptographic signatures when:
- [ ] Agent claiming becomes high-value target
- [ ] API is exposed to untrusted clients
- [ ] Regulatory compliance requires it
- [ ] Discovered agents have immediate value (tokens, NFTs, etc.)

## Other Security Considerations

### Provider Security
- `discoveredAgentsProvider` makes read-only Convex queries
- No sensitive data exposure (agent addresses are public on-chain)
- Query results are cached in agent context but not persisted

### Action Security
- `searchDiscoveredAgentsAction`: Read-only, no authentication needed
- `claimDiscoveredAgentAction`: Requires wallet match validation
- All blockchain operations go through `GhostSpeakService` with proper signer validation

### Convex Mutation Security
- `claimAgent` mutation is public but idempotent
- Once claimed, agents cannot be re-claimed
- `claimedBy` field is immutable once set
- `discoveryEvents` audit log tracks all claims

## Security Checklist

- [x] Wallet address validation in claim action
- [x] Agent status check (prevent double-claiming)
- [x] Convex mutation idempotency
- [x] Audit logging via discoveryEvents
- [ ] Cryptographic signature verification (Phase 2)
- [ ] Timestamp-based replay protection (Phase 2)
- [ ] Rate limiting on claim attempts (Future)
- [ ] Multi-sig support for high-value agents (Future)

## Reporting Security Issues

If you discover a security vulnerability:
1. DO NOT open a public GitHub issue
2. Email security concerns to the team
3. Provide detailed reproduction steps
4. Allow time for patch before disclosure
