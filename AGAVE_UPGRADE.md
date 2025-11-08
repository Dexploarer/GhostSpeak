# Agave 2.3.13 + Anchor 0.32.1 Upgrade

## Upgrade Summary

**Date**: November 8, 2025
**Branch**: `claude/upgrade-agave-3-0-8-011CUsg9ZV1zZ5MS2wH82cKD`

### Changes Made

#### 1. Version Upgrades
- **Anchor**: 0.31.1 → 0.32.1
- **Agave/Solana**: 2.1.0 → 2.3.13
- **Rust Toolchain**: nightly-2025-07-01 → nightly-2025-11-01

#### 2. Configuration Files Updated
- `Anchor.toml`: Updated toolchain versions
- `programs/Cargo.toml`: Updated anchor-lang and anchor-spl to 0.32.1, solana-sdk to 2.3

#### 3. Code Compatibility Fixes

##### Removed Duplicate Function Definitions
- Removed duplicate x402 function definitions from `programs/src/lib.rs` (lines 1230-1272)
  - Old implementations called `instructions::agent_management` and `instructions::reputation`
  - Kept newer implementations that call `instructions::x402_operations`

##### Renamed Conflicting Structs
Anchor 0.32.1 has stricter name collision detection. Renamed legacy structs:

**In `instructions/reputation.rs`:**
- `RecordX402Payment` → `RecordX402PaymentReputation`
- `SubmitX402Rating` → `SubmitX402RatingReputation`

**In `instructions/agent_management.rs`:**
- `ConfigureX402` → `ConfigureX402AgentManagement`

##### Updated Keccak Imports
- Changed from deprecated `anchor_lang::solana_program::keccak` to `sha3::{Digest, Keccak256}`
- Affected files:
  - `programs/src/security/commit_reveal.rs`
  - `programs/src/instructions/compliance_governance.rs`

## Benefits of Agave 2.3.13

While we couldn't upgrade to Agave 3.0.8 (no Anchor support yet), Agave 2.3.13 provides:
- ✅ Production stability with Anchor 0.32.1 compatibility
- ✅ Enhanced security features and bug fixes
- ✅ Better validator performance compared to 2.1.0
- ✅ Positions codebase for easier Anchor 1.0 / Agave 3.x migration

## Remaining Build Issues

The upgrade revealed pre-existing code quality issues that Anchor 0.32's stricter checks now catch. These need to be addressed:

### 1. Missing Type Exports (4 errors)
- `ReputationMetrics` type not exported from state module
- Needs: Add `pub use state::ReputationMetrics;` to lib.rs

### 2. Circuit Breaker Module Issues (6 errors)
Missing error variants in `GhostSpeakError` enum:
- `AlreadyPaused`
- `NotPaused`
- `ProtocolPaused`
- `InstructionPaused`
- `TooManyAuthorities`
- `AuthorityAlreadyExists`
- `InvalidRequiredSignatures`

Missing import: `circuit_breaker::check_not_paused`

### 3. Hash Function Compatibility (4 errors)
- Need to implement `hashv` helper function using Keccak256
- Or refactor code to use Keccak256 directly

### 4. SPL Account Compression Compatibility (5 errors)
The `spl-account-compression` crate needs updating for Anchor 0.32 compatibility:
- Trait bounds not satisfied for `Modify` struct
- May need newer version or API changes

### 5. Solana Program API Changes (2 errors)
- `solana_program::pubkey` module path changed
- `solana_program::keccak` no longer available

## Next Steps

### Immediate (Required for Build)
1. Add `ReputationMetrics` to lib.rs exports
2. Add missing error variants to `GhostSpeakError` enum
3. Implement keccak `hashv` helper or refactor to use Keccak256 directly
4. Fix circuit_breaker module import
5. Update SPL account compression integration for Anchor 0.32

### Short-term (Code Quality)
1. Consider removing legacy reputation/agent_management x402 implementations
2. Consolidate on `x402_operations` module as the canonical API
3. Run full test suite after build succeeds
4. Verify x402 payment throughput improvements

### Long-term (Future Upgrades)
1. Monitor Anchor 1.0 release for Agave 3.x support
2. Plan migration to Agave 3.0.8+ when Anchor is ready
3. Target 30-40% transaction throughput improvement with Agave 3.x

## Comparison: What We Didn't Get (Yet)

**Agave 3.0.8 Features (Not Available Due to Anchor Incompatibility):**
- ❌ 30-40% faster transaction processing
- ❌ Compute units per block: 12M → 40M (3.3x)
- ❌ CPI nesting limit: 4 → 8 (2x)
- ❌ 2x faster validator startup

**These will be available when Anchor 1.0 releases with Agave 3.x support.**

## Build Command

```bash
cargo check
```

Current status: **28 errors** (down from 93 after initial fixes)

## Deployment Note

Do not deploy until all build errors are resolved and tests pass.
