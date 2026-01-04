# GhostSpeak Devnet Deployment

**Last Updated**: 2026-01-03T17:54:15.078Z
**Network**: Solana Devnet

---

## Program Deployments

### GhostSpeak Program
- **Program ID**: `4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB`
- **Deployment Date**: December 30, 2025
- **Deployment Signature**: `5zdU8HdtenhgwDmeEJu2ZPrQwoG9gztHHM5Ft6URxCzTj7m4y9ZkvmVKrpvMK41skcHvh8xa7ckNuUkQwPsierJr`
- **Status**: ✅ Active

---

## Token Deployments

### GHOST Token (Devnet Testing)
- **Mint Address**: `HaFP2LFWJ8fwe5j837CR6YPJpAwsN27hVqNDAnLcwt81`
- **Token Account**: `C1R4zCXHBzo3ngbH9jsAVHPn93Y2nstehj57CCzZXtEV`
- **Decimals**: 9
- **Total Supply**: 1,000,000,000 GHOST
- **Minted**: 2026-01-03T17:54:15.079Z
- **Purpose**: Devnet testing of staking, payments, and rewards
- **Network**: Devnet only
- **Mint Authority**: JQ4xZgWno1tmWkKFgER5XSrXpWzwmsU9ov7Vf8CsBkk (can mint more for testing)
- **Freeze Authority**: JQ4xZgWno1tmWkKFgER5XSrXpWzwmsU9ov7Vf8CsBkk

### USDC (Devnet)
- **Mint Address**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- **Purpose**: Payment testing

---

## Mainnet References (Read-Only)

### GHOST Token (Mainnet - Production)
- **Mint Address**: `DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump`
- **Decimals**: 6
- **Total Supply**: ~999.75M GHOST (immutable)
- **Note**: This is the real production token on mainnet

---

## Environment Variables

Add these to your `.env`:

```bash
# Solana Network
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# GhostSpeak Program
GHOSTSPEAK_PROGRAM_ID=4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB
GHOSTSPEAK_PROGRAM_ID_DEVNET=4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB

# Tokens (Devnet)
GHOSTSPEAK_GHOST_TOKEN_MINT_DEVNET=HaFP2LFWJ8fwe5j837CR6YPJpAwsN27hVqNDAnLcwt81
GHOSTSPEAK_GHOST_TOKEN_DECIMALS_DEVNET=9
GHOSTSPEAK_USDC_MINT_DEVNET=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Mainnet (Read-Only Reference)
GHOSTSPEAK_GHOST_TOKEN_MINT_MAINNET=DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRYJkehvpump
GHOSTSPEAK_GHOST_TOKEN_DECIMALS_MAINNET=6
```

---

## Explorer Links

### Devnet
- [GhostSpeak Program](https://explorer.solana.com/address/4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB?cluster=devnet)
- [GHOST Token Mint](https://explorer.solana.com/address/HaFP2LFWJ8fwe5j837CR6YPJpAwsN27hVqNDAnLcwt81?cluster=devnet)
- [GHOST Token Account](https://explorer.solana.com/address/C1R4zCXHBzo3ngbH9jsAVHPn93Y2nstehj57CCzZXtEV?cluster=devnet)
- [USDC Mint](https://explorer.solana.com/address/4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU?cluster=devnet)

### Mainnet (Production)
- [GHOST Token](https://explorer.solana.com/address/DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRYJkehvpump)
- [DEX Screener](https://dexscreener.com/solana/e44xj7jyjxyermlqqwrpu4nekcphawfjf3ppn2uokgdb)

---

## Testing Workflow

### 1. Agent Discovery (Mainnet → Devnet)
```bash
# Discover real x402 agents on mainnet
# Register them on devnet GhostSpeak program for testing
```

### 2. Staking & Rewards (Devnet)
```bash
# Use devnet GHOST token for testing staking tiers
# Mint Address: HaFP2LFWJ8fwe5j837CR6YPJpAwsN27hVqNDAnLcwt81
# No real value, unlimited supply for testing
```

### 3. Credential Issuance (Devnet)
```bash
# Issue W3C credentials on devnet
# Test Crossmint bridge to EVM testnet
```

---

## Important Notes

⚠️ **Devnet tokens have no value** - Use for testing only
✅ **Program is deployed** - No need to redeploy unless updating
✅ **Can mint more tokens** - Mint authority retained for testing
📝 **Keep this file updated** - Document all changes here
🔐 **Never lose this info** - Commit to git immediately

---

## Quick Commands

```bash
# Check token balance
spl-token balance HaFP2LFWJ8fwe5j837CR6YPJpAwsN27hVqNDAnLcwt81

# Mint more tokens (for testing)
spl-token mint HaFP2LFWJ8fwe5j837CR6YPJpAwsN27hVqNDAnLcwt81 1000000000

# View token info
spl-token display HaFP2LFWJ8fwe5j837CR6YPJpAwsN27hVqNDAnLcwt81
```
