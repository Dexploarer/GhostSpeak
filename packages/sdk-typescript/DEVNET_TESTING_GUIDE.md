# GhostSpeak Devnet Testing Guide

## 🎉 Complete Setup for Devnet Testing

This guide covers the complete workflow for testing GhostSpeak features on devnet, including staking, agent registration, and on-chain authorization storage.

---

## ✅ What's Been Set Up

### 1. **Automatic Staking Vault Initialization**
- ✅ Rust program updated with `init_if_needed` for staking vault
- ✅ Vault automatically created on first stake
- ✅ Deployed to devnet (Program: `4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB`)

### 2. **Devnet GHOST Token**
- ✅ Mint Address: `BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh`
- ✅ Supply: 1,000,000 GHOST (6 decimals)
- ✅ Fully operational on devnet

### 3. **Airdrop Functionality**
- ✅ CLI command: `ghost airdrop` / `ghost faucet`
- ✅ Webapp UI: `/devnet-tools` page
- ✅ API route: `/api/airdrop/ghost`
- ✅ Rate limiting: 10,000 GHOST per wallet per 24 hours

### 4. **Optional On-Chain Authorization Storage**
- ✅ Fully implemented and tested (8/11 tests passing)
- ✅ Default fee: 0.002 SOL
- ✅ Tiered pricing support
- ✅ Facilitator-paid option

---

## 🚀 Quick Start: Testing on Devnet

### Method 1: Using the CLI

```bash
# 1. Get devnet SOL
solana airdrop 2 --url devnet

# 2. Get devnet GHOST tokens
ghost airdrop

# Expected output:
# 🪂 GhostSpeak Devnet GHOST Airdrop
# ================================================================
#   Recipient: YourWalletAddress...
#   Amount: 10,000 GHOST
#   Network: devnet
#
# ✅ Airdrop successful!
#   Transaction: 3UBS6FM...
#   New Balance: 10,000 GHOST

# 3. Stake GHOST tokens (minimum 1,000 required)
ghost stake 1000

# 4. Register an agent
ghost agent register --name "Test Agent" --type ai-assistant

# 5. Test on-chain features
# Now you can test agent registration, reputation updates, and authorization storage
```

### Method 2: Using the Web App

1. **Visit `/devnet-tools` page**
   - Connect your wallet
   - Click "Get 10K Devnet GHOST" button
   - Wait for confirmation

2. **Go to `/dashboard/staking`**
   - Stake at least 1,000 GHOST tokens
   - Lock for 30+ days

3. **Visit `/dashboard/agents`**
   - Register a new agent
   - Agent will automatically have reputation tracking enabled

4. **Test Features**
   - Create authorizations
   - Update reputation
   - Test on-chain storage (optional, 0.002 SOL fee)

---

## 📊 Current Status

### Staking Configuration

```bash
Staking Config PDA: 2D21CxymajwpHEKhZnZrS2AjXs85q5JDbZMqYrae4EXy
Min Stake: 1,000 GHOST (Sybil resistance)
Min Lock: 30 days
Vault Status: ✅ Auto-initializes on first stake
```

### GHOST Token Details

```json
{
  "mint": "BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh",
  "decimals": 6,
  "initialSupply": 1000000,
  "network": "devnet",
  "mainnetGhost": "DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump"
}
```

---

## 🔧 Advanced Testing

### Test On-Chain Authorization Storage

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk-typescript'

const client = new GhostSpeakClient({
  network: 'devnet',
  rpcEndpoint: 'https://api.devnet.solana.com'
})

// Estimate storage cost
const cost = await client.authorization.estimateStorageCost({
  authorizedSource: facilitatorPubkey,
  expiresIn: 30 * 24 * 60 * 60, // 30 days
}, {
  storageFee: 2000000n // 0.002 SOL (default)
})

console.log('Storage cost:', cost, 'SOL') // 0.002

// Store authorization on-chain (optional)
const signature = await client.authorization.storeAuthorizationOnChain(
  authorization,
  {
    enabled: true,
    storageFee: 2000000n, // 0.002 SOL
    feePayedByAgent: true  // Agent pays (vs facilitator)
  }
)
```

### Test Tiered Pricing

```typescript
// Configure tiered pricing
const tierConfig = {
  customFees: {
    604800: 1000000n,   // 7 days = 0.001 SOL
    2592000: 1500000n,  // 30 days = 0.0015 SOL
    7776000: 2000000n,  // 90 days = 0.002 SOL
  }
}

const cost7d = await client.authorization.estimateStorageCost(
  { authorizedSource, expiresIn: 7 * 24 * 60 * 60 },
  tierConfig
)
// Returns: 0.001 SOL

const cost30d = await client.authorization.estimateStorageCost(
  { authorizedSource, expiresIn: 30 * 24 * 60 * 60 },
  tierConfig
)
// Returns: 0.0015 SOL
```

---

## 📁 File Structure

### CLI Files
```
packages/cli/src/commands/
  ├── airdrop.ts              # Airdrop command implementation
  └── index.ts                # Command registration
```

### Web App Files
```
packages/web/
  ├── app/
  │   ├── devnet-tools/page.tsx          # Devnet tools page
  │   └── api/airdrop/ghost/route.ts     # Server-side airdrop API
  └── components/devnet/
      └── AirdropButton.tsx              # Airdrop button component
```

### SDK Files
```
packages/sdk-typescript/
  ├── scripts/
  │   ├── mint-devnet-ghost.ts           # Token minting script
  │   └── create-staking-account.ts      # Staking setup script
  ├── src/modules/authorization/
  │   └── AuthorizationModule.ts         # On-chain storage implementation
  └── docs/
      ├── AUTHORIZATION_STORAGE.md       # Feature documentation
      └── ON_CHAIN_STORAGE_STATUS.md     # Implementation status
```

### Rust Program
```
programs/src/instructions/
  └── staking.rs                         # Updated with vault init_if_needed
```

---

## 🎯 Testing Checklist

### Basic Flow
- [ ] Get devnet SOL from Solana faucet
- [ ] Claim 10,000 GHOST tokens via airdrop
- [ ] Stake at least 1,000 GHOST tokens
- [ ] Register an agent successfully
- [ ] Verify agent reputation tracking works

### On-Chain Storage (Optional)
- [ ] Estimate storage cost for different durations
- [ ] Store authorization on-chain (0.002 SOL)
- [ ] Verify authorization is stored correctly
- [ ] Test facilitator-paid storage option
- [ ] Test tiered pricing configurations

### Rate Limiting
- [ ] Claim airdrop successfully
- [ ] Attempt second claim within 24 hours (should fail)
- [ ] Wait 24 hours and claim again (should succeed)

---

## 🐛 Troubleshooting

### "Insufficient SOL"
**Solution**: Get more devnet SOL from https://faucet.solana.com

### "Staking vault AccountNotInitialized"
**Solution**: This should not happen anymore! The vault auto-initializes on first stake. If you see this error, please report it as a bug.

### "Insufficient GHOST tokens staked"
**Solution**: You need at least 1,000 GHOST tokens staked to register an agent. Use `ghost airdrop` to get more tokens.

### "Faucet balance too low"
**Solution**: Contact the GhostSpeak team to refill the devnet faucet. The team wallet needs to mint more devnet GHOST tokens.

### "Rate limit exceeded"
**Solution**: Wait 24 hours between airdrop claims. Check `/devnet-tools` page for exact time remaining.

---

## 📚 Related Documentation

- [Authorization Storage Guide](./docs/AUTHORIZATION_STORAGE.md) - Complete guide to on-chain authorization storage
- [On-Chain Storage Status](./docs/ON_CHAIN_STORAGE_STATUS.md) - Implementation details and test results
- [Devnet GHOST Token Info](./DEVNET_GHOST_TOKEN.md) - Token details and configuration

---

## 🔗 Useful Links

- **Devnet Explorer**: https://explorer.solana.com/?cluster=devnet
- **SOL Faucet**: https://faucet.solana.com
- **GHOST Mint**: https://explorer.solana.com/address/BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh?cluster=devnet
- **Program**: https://explorer.solana.com/address/4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB?cluster=devnet

---

## 💡 Pro Tips

1. **Batch your testing**: The 24-hour airdrop limit means you should plan your testing sessions
2. **Use tiered pricing**: Test different storage durations to see how costs scale
3. **Monitor faucet balance**: Check `/devnet-tools` to see how many claims are left
4. **Keep SOL for fees**: Always keep ~0.1 SOL in your wallet for transaction fees
5. **Report issues**: If you encounter bugs, report them with transaction signatures for faster debugging

---

## 🎉 What's Next?

With the vault initialized and airdrop system operational, you can now:
- ✅ Test complete agent registration flow
- ✅ Test reputation update mechanisms
- ✅ Test optional on-chain authorization storage
- ✅ Build and test your own integrations
- ✅ Develop facilitator services on devnet

**Happy testing! 🚀**

---

*Last updated: 2025-12-30*
*Devnet Program Version: v0.1.0*
*SDK Version: v2.0.4*
