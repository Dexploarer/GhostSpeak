# Solana Attestation Service (SAS) Integration

Native Solana verifiable credentials for GhostSpeak - W3C compatible, on-chain, free, and open!

## Why SAS Instead of Crossmint?

✅ **Free & Open**: No enterprise pricing required
✅ **Native Solana**: On-chain storage, no external dependencies
✅ **W3C Compatible**: Same standards as Crossmint
✅ **Better Architecture**: Simpler credential→schema→attestation model
✅ **Production Ready**: Launched May 2025 on Solana mainnet

## Architecture

```
GhostSpeak Credential (Issuing Authority)
  ├── AgentIdentity Schema
  │   └── Alice's AgentIdentity Attestation
  │   └── Bob's AgentIdentity Attestation
  ├── ReputationTier Schema
  │   └── Alice's ReputationTier Attestation
  ├── PaymentMilestone Schema
  ├── VerifiedStaker Schema
  └── VerifiedHire Schema
```

## Setup

### 1. Initial Setup (One-Time)

Run the setup script to create the GhostSpeak credential and all schemas:

```bash
cd packages/web
bun run scripts/setup-sas.ts
```

This will:
- Create the GhostSpeak credential authority
- Create 5 credential schemas
- Generate keypairs for signing
- Save configuration to `sas-config.json`

**IMPORTANT**: Save the generated keypairs securely!

### 2. Configuration

Set environment variables from the setup output:

```bash
export SAS_CLUSTER="devnet"  # or "mainnet-beta"
export SAS_AUTHORITY_ADDRESS="<authority-address>"
export SAS_CREDENTIAL_PDA="<credential-pda>"
# ... other schema PDAs
```

## Usage

### Issue a Credential

```typescript
import { createSolanaClient } from "gill";
import { issueAttestation } from "./lib/sas";
import type { AgentIdentityData } from "./lib/sas";

const client = createSolanaClient({ urlOrMoniker: "devnet" });

const data: AgentIdentityData = {
  agent: "AgentPublicKey...",
  did: "did:sol:AgentPublicKey",
  name: "Alice AI",
  capabilities: ["coding", "research", "analysis"],
  x402Enabled: true,
  x402ServiceEndpoint: "https://alice.ai/x402",
  owner: "OwnerPublicKey...",
  registeredAt: Date.now() / 1000,
  issuedAt: Date.now() / 1000,
};

const { instruction, attestationPda } = await issueAttestation({
  client,
  payer,
  authority,
  authorizedSigner,
  schemaType: "AGENT_IDENTITY",
  data,
  nonce: userWalletAddress, // Unique per user
  expiryDays: 365,
});

// Send transaction with instruction
```

### Verify a Credential

```typescript
import { verifyAttestation } from "./lib/sas";

const result = await verifyAttestation({
  client,
  authority: authorityAddress,
  schemaType: "AGENT_IDENTITY",
  nonce: userWalletAddress,
});

if (result?.isValid) {
  console.log("Credential is valid!");
  console.log("Data:", result.data);
  console.log("Expires:", new Date(result.expiry * 1000));
} else {
  console.log("Credential is invalid or expired");
}
```

### Get All User Credentials

```typescript
import { getUserAttestations } from "./lib/sas";

const attestations = await getUserAttestations({
  client,
  authority: authorityAddress,
  nonce: userWalletAddress,
});

attestations.forEach((att) => {
  console.log(`${att.schemaType}: Valid until ${new Date(att.expiry * 1000)}`);
});
```

### Revoke a Credential

```typescript
import { revokeAttestation } from "./lib/sas";

const { instruction } = await revokeAttestation({
  client,
  payer,
  authority: authorityAddress,
  authorizedSigner,
  schemaType: "AGENT_IDENTITY",
  nonce: userWalletAddress,
});

// Send transaction with instruction
```

## Credential Types

### 1. Agent Identity
Proves agent registration and capabilities.

**Fields**: agent, did, name, capabilities, x402Enabled, x402ServiceEndpoint, owner, registeredAt, issuedAt

### 2. Reputation Tier
Agent reputation level and performance metrics.

**Fields**: agent, tier, score, successfulJobs, totalEarned, lastUpdated

### 3. Payment Milestone
Verifiable proof of payment completion.

**Fields**: jobId, agentId, clientId, amount, milestoneNumber, completedAt, txSignature

### 4. Verified Staker
Proves staking commitment.

**Fields**: agent, stakedAmount, lockPeriod, stakedAt, isActive

### 5. Verified Hire
Proof of hiring agreement.

**Fields**: jobId, agentId, clientId, startDate, agreedRate, terms

## Integration Points

- **Agent Registration** (`convex/agents.ts`): Issue AgentIdentity on registration
- **Reputation Updates** (`convex/reputation.ts`): Issue ReputationTier on tier changes
- **Payment Completion** (`convex/payments.ts`): Issue PaymentMilestone on payment
- **Staking**: Issue VerifiedStaker on stake
- **Hiring**: Issue VerifiedHire on job start

## Benefits

| Feature | Crossmint | SAS |
|---------|-----------|-----|
| Cost | Enterprise only | Free |
| Storage | External (IPFS) | On-chain |
| Setup | Complex templates | Simple schemas |
| Availability | 502 errors | Native Solana |
| Standards | W3C VC 2.0 | W3C VC 2.0 |
| Tokenization | ❌ | ✅ (Token-2022) |

## Resources

- [Solana Attestation Service](https://attest.solana.com/)
- [GitHub Repository](https://github.com/solana-foundation/solana-attestation-service)
- [Official Announcement](https://solana.com/news/solana-attestation-service)
- [W3C VC 2.0 Standard](https://www.w3.org/TR/vc-data-model-2.0/)
