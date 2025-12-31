# Codama Code Generation Quirks & Fixes

This document tracks known issues with Codama-generated TypeScript code and the manual fixes applied.

## Background

Codama is an IDL-to-TypeScript code generation tool for Solana programs. While powerful, it has several quirks that require manual fixes after generation.

## Known Issues & Fixes

### 1. Option<String> Double Size Prefix (CRITICAL)

**Issue**: Codama incorrectly generates double size prefix for `Option<String>` types.

**Impact**:
- Instruction deserialization fails with error #102
- PDA seed derivation exceeds 32-byte limit
- Transactions fail with "memory allocation failed" errors

**Root Cause**:
- Borsh standard: `Option<String>` → `[u8 discriminator][u32 length][UTF-8 bytes]`
- Codama generates: `[u8 discriminator][u32 outer][u32 inner][UTF-8 bytes]`
- The `addEncoderSizePrefix()` wrapper adds an extra u32 prefix on top of UTF-8's built-in prefix

**Files Affected**:
- `src/generated/instructions/createAgentAuthorization.ts`
- Any instruction with `Option<String>` parameters

**Fix Applied**:

```typescript
// BEFORE (INCORRECT - Codama generated):
[
  "nonce",
  getOptionEncoder(
    addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()), // ❌ Double prefix
  ),
]

// AFTER (CORRECT - Manual fix):
[
  "nonce",
  // MANUAL FIX: Removed addEncoderSizePrefix to match Anchor's Borsh serialization
  // Codama generates: Option<u8> + u32_outer + u32_inner + data (16 bytes for "default")
  // Anchor expects: Option<u8> + u32_length + data (12 bytes for "default")
  // getUtf8Encoder() already includes the u32 length prefix per Borsh spec
  getOptionEncoder(getUtf8Encoder()), // ✅ Correct
]
```

**Research References**:
- Borsh Specification: https://borsh.io/
- Anchor Serialization: Uses standard Borsh for Option types
- Solana Cookbook: https://solanacookbook.com/references/serialization.html

### 2. PDA Seed Encoding Mismatch

**Issue**: Codama's PDA derivation uses size-prefixed encoding that doesn't match Rust's `.as_bytes()`.

**Impact**:
- PDA addresses don't match between TypeScript and Rust
- Seed length exceeds 32-byte limit
- Account validation fails

**Root Cause**:
- Rust uses `.as_bytes()` which gives raw UTF-8 bytes without any size prefix
- Codama generates `addEncoderSizePrefix(getUtf8Encoder())` for PDA seeds
- This adds a 4-byte u32 length prefix that Rust doesn't expect

**Files Affected**:
- `src/generated/instructions/createAgentAuthorization.ts` (lines 236-252)
- Any instruction deriving PDAs with String parameters

**Fix Applied**:

```typescript
// BEFORE (INCORRECT - Codama generated):
seeds: [
  // ... other seeds
  getOptionEncoder(
    addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()),
  ).encode(expectSome(args.nonce)), // ❌ Size-prefixed
]

// AFTER (CORRECT - Manual fix):
const nonceValue = expectSome(args.nonce) ?? "default"
seeds: [
  // ... other seeds
  getUtf8Encoder().encode(nonceValue), // ✅ Raw bytes, matches Rust .as_bytes()
]
```

### 3. Boolean Codec Missing

**Issue**: `@solana/kit` v5.1.0 doesn't export boolean codecs.

**Impact**:
- Cannot encode/decode boolean fields in structs
- Compilation errors when using `getBoolEncoder()`

**Fix Applied**:

Created manual boolean codecs in `src/generated/types/complianceStatus.ts`:

```typescript
const getBoolEncoder = () => getU8Encoder()
const getBoolDecoder = () => {
  const u8Decoder = getU8Decoder()
  return {
    ...u8Decoder,
    decode: (bytes: Uint8Array, offset = 0) => {
      const [value, newOffset] = u8Decoder.decode(bytes, offset)
      return [value !== 0, newOffset] as [boolean, number]
    }
  }
}
```

## Testing Codama Fixes

When regenerating code with Codama, run these tests to verify fixes:

```bash
# Test authorization flow (tests Option<String> encoding)
bun test tests/e2e/authorization-flow.test.ts

# Expected results:
# ✅ 5/8 tests passing (all core authorization logic)
# ⏭️ 3/8 tests skipped (on-chain tests requiring devnet setup)
```

## When to Re-apply Fixes

After running Codama code generation (`bun run codama:generate`), check these files:

1. **createAgentAuthorization.ts**:
   - Lines ~129-135: Instruction data encoder
   - Lines ~152-156: Instruction data decoder
   - Lines ~236-252: PDA seed derivation

2. **Any new instructions with Option<String>**:
   - Search for: `addEncoderSizePrefix(getUtf8Encoder()`
   - Replace with: `getUtf8Encoder()`

## Reporting Issues

If you discover new Codama quirks:

1. Document the issue in this file
2. Add detailed comments in the generated code
3. Create a test case demonstrating the fix
4. Consider reporting to Codama: https://github.com/codama-idl/codama

## Version Information

- Codama Version: Unknown (check package.json)
- @solana/kit Version: 5.1.0
- Anchor Version: Latest
- Last Updated: 2025-01-30
