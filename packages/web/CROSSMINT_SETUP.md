# Crossmint Verifiable Credentials Setup Guide

This guide explains how to set up Crossmint Verifiable Credentials for the GhostSpeak credential issuance system.

## Prerequisites

- Crossmint account
- API access to Crossmint staging environment

## Step 1: Get API Keys

1. Navigate to Server-side keys section in Crossmint dashboard
2. Click "Create new key"
3. Select the following scopes under Minting API:
   - `credentials:template.create`
   - `credentials.read`
   - `credentials.create`
4. Save the API key securely

## Step 2: Create Credential Templates

You need to create 5 templates via the Crossmint API. Use the following endpoint:

```
POST https://staging.crossmint.com/api/v1-alpha1/credentials/templates/
```

### Template 1: Agent Identity

```json
{
  "type": "agent_identity_v1",
  "encryption": "none",
  "metadata": {
    "name": "GhostSpeak Agent Identity",
    "description": "Verifiable credential proving agent registration and capabilities",
    "imageUrl": "https://your-domain.com/credentials/agent-identity.png"
  },
  "chain": "base-sepolia",
  "schema": {
    "agent": "string",
    "did": "string",
    "name": "string",
    "capabilities": "array",
    "x402Enabled": "boolean",
    "x402ServiceEndpoint": "string",
    "owner": "string",
    "registeredAt": "number",
    "issuedAt": "number"
  }
}
```

### Template 2: Reputation Tier

```json
{
  "type": "reputation_tier_v1",
  "encryption": "none",
  "metadata": {
    "name": "GhostSpeak Reputation Tier",
    "description": "Verifiable credential for agent reputation milestones (Bronze/Silver/Gold/Platinum)",
    "imageUrl": "https://your-domain.com/credentials/reputation-tier.png"
  },
  "chain": "base-sepolia",
  "schema": {
    "agent": "string",
    "reputationScore": "number",
    "totalJobsCompleted": "number",
    "totalEarnings": "number",
    "successRate": "number",
    "avgRating": "number",
    "disputeRate": "number",
    "snapshotTimestamp": "number"
  }
}
```

### Template 3: Payment Milestone

```json
{
  "type": "payment_milestone_v1",
  "encryption": "none",
  "metadata": {
    "name": "GhostSpeak Payment Milestone",
    "description": "Verifiable credential for payment count achievements (10/100/1000 payments)",
    "imageUrl": "https://your-domain.com/credentials/payment-milestone.png"
  },
  "chain": "base-sepolia",
  "schema": {
    "agent": "string",
    "milestone": "number",
    "tier": "string",
    "totalPayments": "number",
    "totalVolume": "number",
    "successRate": "number",
    "issuedAt": "number"
  }
}
```

### Template 4: Staking Verified

```json
{
  "type": "staking_verified_v1",
  "encryption": "none",
  "metadata": {
    "name": "GhostSpeak Verified Staker",
    "description": "Verifiable credential for GHOST token staking verification",
    "imageUrl": "https://your-domain.com/credentials/staking-verified.png"
  },
  "chain": "base-sepolia",
  "schema": {
    "agent": "string",
    "tier": "string",
    "badge": "string",
    "amountStaked": "number",
    "stakingTier": "number",
    "reputationBoostBps": "number",
    "unlockAt": "number",
    "issuedAt": "number"
  }
}
```

### Template 5: Verified Hire

```json
{
  "type": "verified_hire_v1",
  "encryption": "none",
  "metadata": {
    "name": "GhostSpeak Verified Hire",
    "description": "Verifiable credential for payment-proven agent reviews",
    "imageUrl": "https://your-domain.com/credentials/verified-hire.png"
  },
  "chain": "base-sepolia",
  "schema": {
    "agent": "string",
    "client": "string",
    "rating": "number",
    "review": "string",
    "transactionSignature": "string",
    "jobCategory": "string",
    "timestamp": "number",
    "issuedAt": "number"
  }
}
```

## Step 3: Save Template IDs

After creating each template, Crossmint will return a response with a `collectionId`. Save these IDs for the next step.

## Step 4: Set Convex Environment Variables

Add the following environment variables to your Convex deployment:

```bash
# Crossmint API Key
bunx convex env set CROSSMINT_SECRET_KEY "your_api_key_here"

# Template IDs from Step 2
bunx convex env set CROSSMINT_AGENT_IDENTITY_TEMPLATE_ID "template_id_from_step2"
bunx convex env set CROSSMINT_REPUTATION_TEMPLATE_ID "template_id_from_step2"
bunx convex env set CROSSMINT_PAYMENT_MILESTONE_TEMPLATE_ID "template_id_from_step2"
bunx convex env set CROSSMINT_STAKING_TEMPLATE_ID "template_id_from_step2"
bunx convex env set CROSSMINT_VERIFIED_HIRE_TEMPLATE_ID "template_id_from_step2"
```

## Step 5: Verify Setup

Test the credential issuance by:

1. **Testing Payment Milestone**: Make a PayAI payment and verify the credential is issued
2. **Testing Staking**: Stake GHOST tokens and check for staking credential
3. **Testing Review**: Submit a verified hire review with transaction signature

Check Convex logs for credential issuance confirmations:
```
[Credentials] Credential issued successfully: { credentialId, tier }
```

## Troubleshooting

### Credentials not issuing

1. Check Convex logs for errors:
   ```bash
   bunx convex logs
   ```

2. Verify environment variables are set:
   ```bash
   bunx convex env list
   ```

3. Check Crossmint API key has correct scopes

### Failed issuance

The system automatically logs failed credential issuances. Check:
- `payaiCredentialsIssued` table for issued credentials
- Convex error logs for Crossmint API errors
- Network connectivity to Crossmint staging API

## Production Considerations

When moving to production:

1. Update API endpoint from staging to production:
   ```typescript
   // In credentialsAction.ts
   const baseUrl = 'https://www.crossmint.com' // Change from staging
   ```

2. Change chain from `base-sepolia` to `base` (mainnet)

3. Create production templates with production API keys

4. Update environment variables with production values

## Additional Resources

- [Crossmint VC Documentation](https://docs.crossmint.com/verifiable-credentials)
- [Crossmint API Reference](https://docs.crossmint.com/api-reference/verifiable-credentials)
- [Crossmint VC Demo](https://github.com/Crossmint/verifiable-credentials-demo)
