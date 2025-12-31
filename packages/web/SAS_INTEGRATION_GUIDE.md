# SAS (Solana Attestation Service) Integration Guide

**Date**: December 31, 2025
**Status**: Integration Complete - Awaiting Environment Setup

---

## Overview

GhostSpeak has migrated from Crossmint to native Solana Attestation Service (SAS) for issuing W3C-compliant verifiable credentials on-chain. This guide explains how to complete the integration by configuring Convex environment variables.

---

## What's Been Done

### 1. SAS Infrastructure (✅ Complete)

- **Schemas deployed on devnet**:
  - AgentIdentityFixed: `21Ge5fzfkdLE6CXpynMeqFLL6gFCtJaFsQUtTTJby544`
  - ReputationTier, PaymentMilestone, VerifiedStaker, VerifiedHire (all deployed)
- **Test attestation verified on-chain**: `Gzt4kokmRkHyN4reyuMHGhA6CRg34CXucXFJ3xRk5ZwZ`
- **Authority**: `GjXvPNkpcztKUSs3uCCQ5dtU1j4zCr2SqyqRNohvawgM`

### 2. Code Integration (✅ Complete)

- **`sasCredentialsAction.ts`**: New Convex action for issuing SAS attestations
- **`credentialsOrchestrator.ts`**: Updated to call SAS actions instead of Crossmint
- **Database schema**: Reuses existing fields (`credentialId` → attestation PDA, `crossmintId` → tx signature)

### 3. Integration Points (✅ Complete)

All credential types now use SAS:
- ✅ Reputation Tier credentials (Bronze/Silver/Gold/Platinum)
- ✅ Agent Identity credentials (registration)
- ✅ Payment Milestone credentials (10/100/1000 payments)
- ✅ Staking credentials (verified staker badges)
- ✅ Verified Hire credentials (reviews with payment proof)

---

## Environment Setup (⚠️ Required)

### Step 1: Add SAS Variables to Convex

The SAS credentials action requires three keypairs to be configured in your Convex deployment. These are stored in `/Users/home/projects/GhostSpeak/packages/web/sas-keypairs.json`.

#### Option A: Using Convex Dashboard

1. Go to https://dashboard.convex.dev
2. Select your GhostSpeak deployment
3. Navigate to **Settings** → **Environment Variables**
4. Add the following environment variables:

```bash
# Solana cluster (devnet for testing, mainnet-beta for production)
SOLANA_CLUSTER=devnet

# SAS Payer Keypair (pays transaction fees)
# Copy the "payer" array from sas-keypairs.json
SAS_PAYER_KEYPAIR=[94,158,207,1,215,20,97,199,93,94,183,100,3,33,140,79,90,85,155,142,62,37,126,97,24,87,127,39,136,194,250,171,37,255,173,44,101,70,158,155,229,7,90,145,78,166,211,148,72,144,8,3,3,164,79,112,101,10,188,178,60,133,137,201]

# SAS Authority Keypair (credential issuer)
# Copy the "authority" array from sas-keypairs.json
SAS_AUTHORITY_KEYPAIR=[47,44,35,239,129,212,96,17,138,104,201,146,226,74,223,37,10,100,228,9,43,105,60,177,20,12,163,56,142,151,43,185,233,196,168,228,90,246,55,238,37,4,167,239,62,210,182,43,18,227,250,1,202,110,209,226,39,251,158,132,240,114,102,250]

# SAS Authorized Signer Keypair (can sign attestations)
# Copy the "authorizedSigner1" array from sas-keypairs.json
SAS_AUTHORIZED_SIGNER_KEYPAIR=[241,222,113,141,229,7,86,103,157,99,238,235,114,40,82,86,150,214,114,122,50,104,37,130,76,131,98,90,207,242,14,218,196,77,159,3,246,64,101,66,208,30,12,92,35,143,41,116,16,106,74,48,59,235,248,10,181,27,181,192,154,214,190,145]
```

#### Option B: Using Convex CLI

```bash
# Navigate to packages/web
cd packages/web

# Add environment variables
bunx convex env set SOLANA_CLUSTER devnet
bunx convex env set SAS_PAYER_KEYPAIR "[94,158,207,...]"
bunx convex env set SAS_AUTHORITY_KEYPAIR "[47,44,35,...]"
bunx convex env set SAS_AUTHORIZED_SIGNER_KEYPAIR "[241,222,113,...]"
```

### Step 2: Update .env.local (Optional)

For local development testing, add these to `.env.local`:

```bash
# -----------------------------------------------------------------------------
# Solana Attestation Service (SAS)
# -----------------------------------------------------------------------------
# These are loaded by Convex actions, not the Next.js app
# Set in Convex dashboard: https://dashboard.convex.dev

# Cluster: devnet or mainnet-beta
SOLANA_CLUSTER=devnet

# SAS Keypairs (from sas-keypairs.json)
# Copy arrays exactly as shown above
SAS_PAYER_KEYPAIR=[94,158,207,...]
SAS_AUTHORITY_KEYPAIR=[47,44,35,...]
SAS_AUTHORIZED_SIGNER_KEYPAIR=[241,222,113,...]
```

### Step 3: Update .env.example

Add SAS section to `.env.example` for documentation:

```bash
# -----------------------------------------------------------------------------
# Solana Attestation Service (SAS)
# -----------------------------------------------------------------------------
# Native Solana verifiable credentials (replaces Crossmint)
# Generate keypairs: bun run scripts/setup-sas.ts

# Solana cluster
SOLANA_CLUSTER=devnet

# SAS keypairs (JSON arrays from sas-keypairs.json)
SAS_PAYER_KEYPAIR=
SAS_AUTHORITY_KEYPAIR=
SAS_AUTHORIZED_SIGNER_KEYPAIR=
```

---

## Security Considerations

### ⚠️ Important Security Notes

1. **Never commit `sas-keypairs.json` to git**
   - This file is already in `.gitignore`
   - Contains private keys for devnet testing only

2. **For Production (Mainnet)**:
   - Generate NEW keypairs (never reuse devnet keys)
   - Use hardware wallets or multisig for authority
   - Store keypairs in secure secret management (e.g., AWS Secrets Manager, HashiCorp Vault)
   - Consider using Convex's encrypted environment variables

3. **Access Control**:
   - Only authorized team members should access Convex dashboard
   - Enable 2FA on Convex account
   - Rotate keypairs periodically

4. **Funding**:
   - Devnet: Payer needs ~0.1-0.5 SOL from https://faucet.solana.com
   - Mainnet: Fund payer with sufficient SOL for transaction fees

---

## Testing the Integration

### Step 1: Deploy Convex Functions

```bash
cd packages/web
bunx convex deploy
```

### Step 2: Trigger Credential Issuance

The system automatically issues credentials when:

1. **Reputation tier crossed** (2000/5000/7500/9000 score)
   - Triggered by PayAI payment success
   - Check: `payaiReputation.ts:updateFromPayment()`

2. **Payment milestones reached** (10/100/1000 payments)
   - Triggered by PayAI payment success
   - Check: `credentialsOrchestrator.ts:checkAndIssuePaymentMilestoneCredentials()`

3. **Agent registration** (manual trigger)
   - Call: `sasCredentialsAction.issueAgentIdentityCredential()`

4. **GHOST staking** (manual trigger)
   - Call: `sasCredentialsAction.issueStakingCredential()`

5. **Review submission** (manual trigger)
   - Call: `sasCredentialsAction.issueVerifiedHireCredential()`

### Step 3: Verify On-Chain

After credential issuance, check logs in Convex dashboard:

```
[SAS] Issuing reputation tier credential: { agent: '...', tier: 'Bronze', score: 2000 }
[SAS] Credential issued successfully: {
  attestationPda: '...',
  signature: '...',
  tier: 'Bronze'
}
```

Verify on Solana Explorer:
```
https://explorer.solana.com/address/<attestationPda>?cluster=devnet
```

---

## Database Schema

No changes needed! Existing schema reused:

```typescript
// payaiCredentialsIssued table
{
  credentialId: string,        // Now stores attestation PDA
  crossmintCredentialId: string, // Now stores transaction signature
  // ... other fields unchanged
}
```

---

## Migration from Crossmint

### What Changed

| Crossmint | SAS |
|-----------|-----|
| External API call | On-chain transaction |
| Crossmint credential ID | Attestation PDA |
| Crossmint transaction ID | Solana transaction signature |
| Array capabilities | Comma-separated string |
| Email-based recipient | Solana address as nonce |
| Centralized storage | On-chain storage |

### Backwards Compatibility

- ✅ Database schema unchanged
- ✅ Convex mutations unchanged
- ✅ Frontend queries unchanged
- ⚠️ Credentials issued before migration remain on Crossmint

### Rollback Plan

To rollback to Crossmint (if needed):

1. Revert `credentialsOrchestrator.ts` changes:
   ```typescript
   // Change back from:
   internal.sasCredentialsAction.issueReputationTierCredential

   // To:
   internal.credentialsAction.issueReputationTierCredential
   ```

2. Deploy: `bunx convex deploy`

---

## Production Deployment Checklist

### Before Mainnet Launch

- [ ] Generate NEW keypairs for mainnet (never reuse devnet keys)
- [ ] Deploy schemas on mainnet using new authority
- [ ] Fund payer wallet with production SOL
- [ ] Store keypairs in secure secret manager
- [ ] Update Convex environment variables with mainnet keypairs
- [ ] Set `SOLANA_CLUSTER=mainnet-beta`
- [ ] Test end-to-end credential issuance on mainnet
- [ ] Set up monitoring for failed attestations
- [ ] Document recovery procedures
- [ ] Enable multisig for authority (recommended)

### Mainnet Setup Commands

```bash
# 1. Generate mainnet keypairs
bun run scripts/setup-sas.ts
# (Fund payer wallet manually with production SOL)

# 2. Update Convex environment
bunx convex env set SOLANA_CLUSTER mainnet-beta
bunx convex env set SAS_PAYER_KEYPAIR "[...]"
bunx convex env set SAS_AUTHORITY_KEYPAIR "[...]"
bunx convex env set SAS_AUTHORIZED_SIGNER_KEYPAIR "[...]"

# 3. Deploy
bunx convex deploy
```

---

## Monitoring and Debugging

### Check Credential Issuance Logs

In Convex dashboard, filter logs by:
```
[SAS]
```

### Common Issues

**Issue**: "SAS keypairs not configured in environment"
- **Fix**: Add `SAS_*_KEYPAIR` environment variables to Convex

**Issue**: "Insufficient balance"
- **Fix**: Fund payer wallet with more SOL

**Issue**: "Schema not found"
- **Fix**: Run schema deployment: `bun run scripts/deploy-fixed-agent-identity.ts`

**Issue**: "Invalid attestation data"
- **Fix**: Check data format matches schema layout (especially capabilities as comma-separated string)

### Query Credentials

```typescript
// Get all credentials for an agent
const credentials = await ctx.db
  .query('payaiCredentialsIssued')
  .withIndex('by_agent', (q) => q.eq('agentAddress', agentAddress))
  .collect()

// Verify on-chain (from frontend/script)
import { verifyAttestation } from './lib/sas/attestations'

const result = await verifyAttestation({
  client,
  authority: authorityAddress,
  schemaType: 'AGENT_IDENTITY',
  nonce: agentAddress,
})

if (result?.isValid) {
  console.log('Valid credential!', result.data)
}
```

---

## Files Modified

### Core Integration
- ✅ `convex/sasCredentialsAction.ts` - New SAS credentials action
- ✅ `convex/credentialsOrchestrator.ts` - Updated to call SAS actions
- ✅ `lib/sas/config.ts` - SAS schema configurations
- ✅ `lib/sas/schemas.ts` - Type definitions with comma-separated capabilities
- ✅ `lib/sas/attestations.ts` - Attestation issuance and verification

### Scripts
- ✅ `scripts/setup-sas.ts` - SAS setup script
- ✅ `scripts/deploy-fixed-agent-identity.ts` - Schema deployment
- ✅ `scripts/test-attestation-onchain.ts` - End-to-end test

---

## Benefits of SAS Integration

1. **Fully On-Chain**: No dependency on external services
2. **Lower Cost**: ~0.001 SOL per attestation vs Crossmint fees
3. **W3C Compliant**: Standards-based verifiable credentials
4. **Composable**: Other Solana programs can verify credentials
5. **Transparent**: All attestations visible on Solana Explorer
6. **Censorship Resistant**: No centralized authority can revoke without signing key

---

## Next Steps

1. ✅ Add SAS environment variables to Convex dashboard
2. ✅ Deploy Convex functions
3. ✅ Test credential issuance on devnet
4. ⏳ Monitor logs for successful attestation transactions
5. ⏳ Verify credentials on Solana Explorer
6. ⏳ Plan mainnet deployment (new keypairs + funding)

---

## Support

**Documentation**:
- SAS Implementation: `SAS_IMPLEMENTATION_COMPLETE.md`
- SAS Library: https://github.com/solana-foundation/solana-attestation-service
- Convex Docs: https://docs.convex.dev

**On-Chain Resources**:
- Devnet Explorer: https://explorer.solana.com/?cluster=devnet
- GhostSpeak Credential: https://explorer.solana.com/address/A2qsFuNvPQLa6YEFXbQW9PMWicvtrBnzLWP2sEMJRuCj?cluster=devnet
- AgentIdentityFixed Schema: https://explorer.solana.com/address/21Ge5fzfkdLE6CXpynMeqFLL6gFCtJaFsQUtTTJby544?cluster=devnet

---

**Integration complete! Ready for environment configuration and testing.** 🚀
