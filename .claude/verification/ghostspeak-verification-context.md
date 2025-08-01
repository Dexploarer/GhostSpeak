# GhostSpeak Protocol - Enhanced AI Code Verification Context

## 🗓️ **Critical Development Context (July 2025)**

**Current Date**: July 2025 - All references to "2025 patterns" are legitimate current practices
**Technology Stack**: Cutting-edge Solana development with latest tools and patterns

---

## 🏗️ **GhostSpeak Protocol Architecture**

### **Core Identity**
- **Protocol Name**: GhostSpeak - AI Agent Commerce Protocol
- **Blockchain**: Solana (Devnet: F3qAjuzkNTbDL6wtZv4wGyHUi66j7uM2uRCDXWJ3Bg87)
- **Purpose**: Decentralized marketplace for autonomous AI agents
- **Architecture**: Pure protocol (not platform) with smart contracts + SDKs

### **Program Structure**
- **Main Program**: `ghostspeak_marketplace`
- **Program ID**: `F3qAjuzkNTbDL6wtZv4wGyHUi66j7uM2uRCDXWJ3Bg87`
- **Network**: Devnet (production deployment)
- **Framework**: Anchor 0.31.1+ with 2025 security enhancements

### **Key Constants** (Defined in `programs/src/lib.rs`)
```rust
pub const MAX_GENERAL_STRING_LENGTH: usize = 128;
pub const MAX_CAPABILITIES_COUNT: usize = 5;
pub const MAX_URL_LENGTH: usize = 256;
pub const MAX_NAME_LENGTH: usize = 64;
pub const MAX_DESCRIPTION_LENGTH: usize = 256;
```

---

## 🔬 **Technology Stack Specifics (July 2025)**

### **Solana Ecosystem**
- **Solana Version**: 2.1.0 (Agave client)
- **Anchor Framework**: 0.31.1+ with 2025 security patterns
- **Web3.js**: v2+ (@solana/kit) - **NOT** legacy @solana/web3.js v1
- **SPL Token**: Token-2022 with confidential transfers and extensions
- **RPC**: TypedRpcClient interfaces, modern error handling

### **TypeScript/JavaScript**
- **Package Manager**: Bun (fast installs, modern workspace support)
- **Build System**: tsup with WASM integration
- **Types**: Strict TypeScript, no `any` types unless absolutely necessary
- **Module System**: ESM with `.js` imports for TypeScript files

### **Cryptography**
- **Curves**: @noble/curves (ed25519, curve25519)
- **ElGamal**: Full bulletproof implementation with ZK proofs
- **Proof System**: Integration with Solana's ZK ElGamal Proof Program
- **WASM**: Optimized crypto operations with wasm-pack

---

## 🧬 **GhostSpeak-Specific Patterns**

### **PDA Derivation Patterns**
```rust
// Agent PDA
seeds = [b"agent", owner.key().as_ref(), agent_id.as_bytes()]

// User Registry PDA  
seeds = [b"user_registry", user.key().as_ref()]

// Service Listing PDA
seeds = [b"service_listing", agent.key().as_ref(), service_id.as_bytes()]

// Escrow PDA
seeds = [b"escrow", buyer.key().as_ref(), seller.key().as_ref(), &escrow_id.to_le_bytes()]
```

### **Account Structure Patterns**
- All accounts have `bump: u8` field for PDA storage
- State validation with `validate()` methods
- Memory optimization with `LEN` constants
- Rate limiting fields (`last_activity`, `rate_limit_expiry`)

### **Error Handling Patterns**
```rust
// Custom error types in GhostSpeakError enum
require!(condition, GhostSpeakError::SpecificError);

// Enhanced error messages with context
require!(
    input.len() <= MAX_GENERAL_STRING_LENGTH,
    GhostSpeakError::InputTooLong
);
```

---

## 🔍 **AI Code Verification Requirements**

### **P0 CRITICAL Issues** (STOP IMMEDIATELY)
1. **Compilation Failures**
   - Missing TypeScript exports (e.g., `ParticipantType`)
   - Undefined Rust constants or imports
   - Build errors that prevent deployment

2. **Security Vulnerabilities**
   - Exposed private keys or secrets in code/logs
   - Missing input validation on user inputs
   - Incorrect admin authorization patterns

3. **Hallucinated APIs**
   - Non-existent @solana/kit methods
   - Fake Token-2022 extension functions
   - Invented cryptographic operations

### **P1 CRITICAL Issues** (FIX BEFORE PROCEEDING)
1. **Outdated Patterns**
   - @solana/web3.js v1 imports instead of @solana/kit
   - Legacy Connection/PublicKey usage
   - Old Anchor constraint syntax

2. **Architecture Violations**
   - Incorrect PDA derivation patterns
   - Missing rate limiting implementations
   - Improper multisig integration

### **P2 HIGH Issues** (FIX BEFORE DEPLOYMENT)
1. **Type Safety Violations**
   - Unnecessary `any` types
   - Missing null/undefined checks
   - Incorrect bigint/number conversions

2. **Performance Issues**
   - Inefficient memory allocations in on-chain code
   - Missing account space optimizations
   - High compute unit usage (>200,000 CU)

### **P3 MEDIUM Issues** (FIX BEFORE PRODUCTION)
1. **Code Quality**
   - Missing documentation
   - Inconsistent naming conventions
   - ESLint/formatting violations

---

## 🧪 **Functional Verification Requirements**

### **Compilation Testing**
```bash
# Rust compilation
anchor build

# TypeScript compilation  
bun run build

# Linting and type checking
bun run lint
bun run type-check
```

### **On-Chain Testing**
```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Run instruction tests
anchor test

# Integration testing
bun run test
```

### **Expected Build Outputs**
- Rust: `target/deploy/ghostspeak_marketplace.so`
- TypeScript: `dist/` directory with compiled modules
- WASM: `dist/wasm/` directory with crypto modules

---

## 🎯 **Verification Success Criteria**

### **Code Quality Gates**
- ✅ 0 compilation errors (both Rust and TypeScript)
- ✅ 0 ESLint warnings/errors
- ✅ 100% TypeScript type safety (minimal `any` usage)
- ✅ All tests passing
- ✅ Successful devnet deployment

### **Security Requirements**
- ✅ No exposed secrets or private keys
- ✅ Comprehensive input validation
- ✅ Proper admin authorization checks
- ✅ Rate limiting on public instructions
- ✅ PDA security with canonical derivations

### **Performance Standards**
- ✅ Instruction compute units < 200,000 CU
- ✅ Optimized account space usage
- ✅ Efficient memory allocations
- ✅ Fast build times (< 5 minutes total)

### **Integration Standards**
- ✅ Compatible with existing GhostSpeak modules
- ✅ Proper error propagation and handling
- ✅ Consistent with protocol patterns
- ✅ Modern July 2025 technology integration

---

## 📋 **Common AI Coding Mistakes to Detect**

### **Frequently Hallucinated Patterns**
1. **Fake @solana/kit methods** - Always verify against official docs
2. **Non-existent Token-2022 extensions** - Check SPL Token-2022 spec
3. **Invented crypto functions** - Must use @noble/curves or proven libraries
4. **Mock proof generation** - Must integrate with real ZK proof programs

### **Outdated Pattern Detection**
1. **Legacy web3.js imports** - Flag any @solana/web3.js v1 usage
2. **Old Anchor patterns** - Check for pre-0.31.1 constraint syntax  
3. **Deprecated error handling** - Ensure modern error enhancement
4. **Legacy token programs** - Prefer Token-2022 where applicable

### **Architecture Anti-Patterns**
1. **Hardcoded program IDs** - Use constants or config
2. **Missing validation** - All user inputs must be validated
3. **Improper PDA derivations** - Must follow canonical patterns
4. **Memory inefficiency** - Optimize for on-chain constraints

---

**Remember**: This protocol represents cutting-edge Solana development in July 2025. All patterns and technologies referenced are current and legitimate for this timeframe.