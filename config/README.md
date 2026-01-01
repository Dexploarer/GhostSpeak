# Configuration Files

This directory contains centralized configuration for the GhostSpeak protocol.

## Files

### `program-ids.ts`
**Status:** ✅ **CORRECTED & ACTIVE**

Single source of truth for program IDs across all networks.

- **Devnet:** `4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB` ✅ (matches Anchor.toml and lib.rs)
- **Localnet:** `4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB`
- **Testnet:** `4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB` (same as devnet for now)
- **Mainnet:** `4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB` (TODO: Update after mainnet deployment)

**Usage:**
```typescript
import { getCurrentProgramId, getNetworkConfig } from '../config/program-ids'

const programId = getCurrentProgramId('devnet')
const config = getNetworkConfig('devnet')
```

**Used by:**
- `scripts/verify-deployment.ts`
- `scripts/health-check.ts`
- `scripts/mainnet/initialize-protocol-fees.ts`
- `packages/cli/src/services/AgentService.ts`

### `token-config.ts`
**Status:** ✅ **ACTIVE**

Single source of truth for token mint addresses across all networks.

**Contains:**
- GHOST token mints (devnet/mainnet/testnet/localnet)
- USDC token mints (devnet/mainnet/testnet/localnet)
- USDT token mints (devnet/mainnet/testnet/localnet)
- SOL native mint
- Token metadata (decimals, supply, etc.)
- Helper functions to get tokens by network

**Usage:**
```typescript
import { getGhostTokenMint, getUSDCTokenMint, TOKEN_CONFIG } from '../config/token-config'

const ghostMint = getGhostTokenMint('devnet')
const usdcMint = getUSDCTokenMint('mainnet')
const solMint = TOKEN_CONFIG.SOL.mint
```

## Summary

### ✅ Completed

1. **Program ID Consistency** - Fixed mismatch between config and actual deployment
2. **Missing Function Body** - Fixed empty `getCurrentProgramId` function
3. **Mainnet Script** - Updated to use config instead of hardcoded IDs
4. **Token Configuration** - Created `token-config.ts` with all token mints
5. **Security Config** - Removed unused `security-config.ts` to simplify codebase

## Usage Guidelines

1. **Always use config files** - Don't hardcode program IDs or addresses
2. **Single source of truth** - Update config files, not individual files
3. **Network-aware** - Use network-specific configs, not hardcoded values
4. **Environment variables** - Use env vars for sensitive values (keys, secrets)
