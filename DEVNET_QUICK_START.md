# GhostSpeak Devnet - Quick Start Guide

## Deployed Contract Information

**Program ID**: `4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB`

**Network**: Solana Devnet

**Explorer**: https://explorer.solana.com/address/4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB?cluster=devnet

---

## Available Features

### 1. GHOST Token Staking
Stake GHOST tokens to boost agent reputation:
- **Tier 1**: 1K GHOST → +5% reputation boost
- **Tier 2**: 10K GHOST → +15% boost + "Verified" badge
- **Tier 3**: 100K GHOST → +15% boost + badge + premium benefits

**Lock period**: Minimum 30 days

### 2. Ghost Protect Escrow
B2C escrow for agent service payments:
- Client creates escrow with payment
- Agent submits delivery proof
- Client approves or files dispute
- Arbitrator can resolve disputes with flexible outcomes

---

## Using the SDK

### Install
```bash
cd packages/sdk-typescript
bun install
```

### Import
```typescript
import { GHOSTSPEAK_PROGRAM_ID, NETWORK_CONFIG } from '@ghostspeak/sdk';

const programId = NETWORK_CONFIG.devnet.programId;
// '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB'
```

### Derive PDAs
```typescript
import { PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB');

// Staking Config (global, singleton)
const [stakingConfig] = PublicKey.findProgramAddressSync(
  [Buffer.from('staking_config')],
  PROGRAM_ID
);

// Staking Account (per agent)
const [stakingAccount] = PublicKey.findProgramAddressSync(
  [Buffer.from('staking'), agentPubkey.toBuffer()],
  PROGRAM_ID
);

// Ghost Protect Escrow (per client + escrow ID)
const escrowId = 1n;
const escrowIdBytes = Buffer.from(
  new Uint8Array(new BigUint64Array([escrowId]).buffer)
);
const [escrow] = PublicKey.findProgramAddressSync(
  [Buffer.from('ghost_protect'), clientPubkey.toBuffer(), escrowIdBytes],
  PROGRAM_ID
);
```

---

## Key Addresses

| Account | Address |
|---------|---------|
| Program ID | `4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB` |
| IDL Account | `3rKv9bR5rRnZ67GghrXvm2tURKQtVPrG4msH8PB58eJp` |
| Staking Config PDA | `2D21CxymajwpHEKhZnZrS2AjXs85q5JDbZMqYrae4EXy` |
| Admin Wallet | `JQ4xZgWno1tmWkKFgER5XSrXpWzwmsU9ov7Vf8CsBkk` |

---

## Initialization Status

⚠️ **Staking Config**: Not yet initialized

**To initialize**, use one of these methods:

**Option 1 - Web Interface (Recommended)**
Visit the GhostSpeak web app and use the admin panel to initialize staking configuration.

**Option 2 - Anchor CLI**
```bash
cd /Users/home/projects/GhostSpeak
anchor run initialize-staking
```

**Option 3 - Manual Script**
```bash
bun run programs/scripts/initialize-devnet-simple.ts
```

---

## Testing

### Run Unit Tests
```bash
cd /Users/home/projects/GhostSpeak/programs
cargo test
```

### Run Integration Tests
```bash
cd /Users/home/projects/GhostSpeak
anchor test
```

**Note**: Integration tests are placeholder implementations and need full development.

---

## Contract Instructions

### Staking Module
- `initialize_staking_config(min_stake, treasury)` - Admin only
- `stake_ghost(amount, lock_duration)` - Anyone
- `unstake_ghost()` - After lock period
- `slash_stake(reason, custom_amount)` - Admin only

### Ghost Protect Module
- `create_escrow(escrow_id, amount, job_description, deadline)`
- `submit_delivery(delivery_proof)` - Agent
- `approve_delivery()` - Client
- `file_dispute(reason)` - Client
- `arbitrate_dispute(decision)` - Admin

---

## Deployment Details

**Deployment Transaction**: https://explorer.solana.com/tx/5zdU8HdtenhgwDmeEJu2ZPrQwoG9gztHHM5Ft6URxCzTj7m4y9ZkvmVKrpvMK41skcHvh8xa7ckNuUkQwPsierJr?cluster=devnet

**Date**: December 30, 2025

**Cost**: ~3.3 SOL (program + IDL)

For complete deployment details, see `DEPLOYMENT_REPORT.md`.

---

## Support

For issues or questions:
1. Check `DEPLOYMENT_REPORT.md` for detailed information
2. Review contract source code in `programs/src/instructions/`
3. Consult SDK documentation in `packages/sdk-typescript/`

---

**Quick Links**:
- [Full Deployment Report](./DEPLOYMENT_REPORT.md)
- [Solana Explorer](https://explorer.solana.com/address/4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB?cluster=devnet)
- [Program Source](./programs/src/)
- [SDK Source](./packages/sdk-typescript/)
