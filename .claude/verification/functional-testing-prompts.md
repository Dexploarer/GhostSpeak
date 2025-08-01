# Enhanced Functional Verification Prompts for GhostSpeak Protocol

## 🔧 **Compilation Testing Prompts**

### **TypeScript Build Verification**
```
🗓️ CRITICAL CONTEXT: Today is July 2025. This is the GhostSpeak AI agent commerce protocol.

🔬 TECHNOLOGY STACK:
- @solana/kit (Web3.js v2+) - NOT legacy @solana/web3.js v1
- Bun package manager with modern workspace support
- TypeScript with strict type checking and ESM modules
- tsup build system with WASM integration

🚨 COMPILATION VERIFICATION (P0 CRITICAL):

1. **TypeScript Export/Import Issues**:
   - Check for missing exports that cause "Module has no exported member" errors
   - Verify all imports resolve correctly with .js extensions
   - Ensure type definitions are properly exported from index files
   - Flag circular dependency issues

2. **Build System Compatibility**:
   - Will this code compile with tsup + WASM integration?
   - Are all dependencies available and compatible?
   - Check for eval() usage that breaks bundling
   - Verify ESM module compatibility

3. **Type Safety Verification**:
   - Are all types properly defined and exported?
   - Check for improper 'any' usage that should be typed
   - Verify interface compatibility across modules
   - Flag missing null/undefined handling

4. **GhostSpeak-Specific Patterns**:
   - Uses Address types from @solana/addresses (not string/PublicKey)
   - Proper TransactionSigner interface usage
   - Modern @solana/kit RPC patterns
   - Token-2022 integration with extensions

CRITICAL: This code must compile successfully with 'bun run build' and produce valid dist/ output.
```

### **Rust/Anchor Compilation Verification**
```
🗓️ CRITICAL CONTEXT: Today is July 2025. GhostSpeak protocol on Solana.

🔬 TECHNOLOGY STACK:
- Anchor 0.31.1+ with 2025 security patterns
- Solana 2.1.0 (Agave) client
- Program ID: F3qAjuzkNTbDL6wtZv4wGyHUi66j7uM2uRCDXWJ3Bg87

🚨 RUST COMPILATION VERIFICATION (P0 CRITICAL):

1. **Constant and Import Resolution**:
   - All constants defined (MAX_GENERAL_STRING_LENGTH, MAX_URL_LENGTH, etc.)
   - All imports available and correct paths
   - GhostSpeakError enum variants exist
   - Event types properly defined

2. **Anchor Pattern Compliance**:
   - Proper #[derive(Accounts)] syntax for 0.31.1+
   - Valid account constraints and seeds
   - Correct instruction parameter handling
   - Proper error macro usage (require!, err!)

3. **Account Structure Validation**:
   - All referenced account types (Agent, UserRegistry, etc.) exist
   - LEN constants defined for space calculations
   - Proper PDA derivation with canonical patterns
   - Account validation methods available

4. **Method Call Verification**:
   - All called methods exist on respective structs
   - Proper state management method signatures
   - Error handling with correct error types
   - Clock and sysvar usage patterns

CRITICAL: This code must compile successfully with 'anchor build' and produce ghostspeak_marketplace.so.
```

---

## ⚡ **On-Chain Functionality Prompts**

### **Deployment Verification**
```
🗓️ CRITICAL CONTEXT: July 2025 Solana development with GhostSpeak protocol.

🚨 ON-CHAIN DEPLOYMENT VERIFICATION (P0 CRITICAL):

1. **Program Deployment Capability**:
   - Will this program deploy successfully to Solana devnet?
   - Are all account constraints valid for on-chain execution?
   - Proper program ID integration and references
   - No deployment-blocking issues

2. **Instruction Execution Viability**:
   - Will these instructions execute successfully with valid inputs?
   - Proper account ordering and constraint validation
   - Signer verification and authorization checks
   - State changes that won't cause runtime errors

3. **Resource Constraints**:
   - Compute unit usage reasonable (< 200,000 CU per instruction)
   - Account space calculations correct
   - Memory allocations optimized for on-chain execution
   - No operations that exceed Solana limits

4. **Integration Compatibility**:
   - Compatible with existing GhostSpeak program state
   - Proper cross-instruction state consistency
   - Event emission patterns work correctly
   - Error propagation follows expected patterns

CRITICAL: This code must work in real Solana blockchain environment, not just compile.
```

### **Transaction Execution Testing**
```
🗓️ CRITICAL CONTEXT: July 2025 GhostSpeak protocol transaction testing.

🚨 TRANSACTION EXECUTION VERIFICATION (P1 CRITICAL):

1. **Input Validation Effectiveness**:
   - Will validation actually prevent invalid inputs?
   - Proper bounds checking for all user-provided data
   - String length limits enforced correctly
   - Numeric overflow/underflow protection

2. **Account State Management**:
   - State transitions are atomic and consistent
   - No race conditions in multi-instruction sequences
   - Proper initialization of new accounts
   - State validation prevents invalid configurations

3. **Error Handling Robustness**:
   - Errors provide meaningful context for debugging
   - Proper error propagation through instruction chain
   - No panics or unhandled error conditions
   - Graceful failure modes with cleanup

4. **Performance Characteristics**:
   - Instructions complete within reasonable time
   - No infinite loops or expensive operations
   - Efficient account lookups and data access
   - Optimized for frequent execution patterns

CRITICAL: These transactions must execute successfully with real user data and network conditions.
```

---

## 🧪 **Integration Testing Prompts**

### **Cross-Module Compatibility**
```
🗓️ CRITICAL CONTEXT: July 2025 GhostSpeak protocol integration testing.

🚨 INTEGRATION VERIFICATION (P2 HIGH):

1. **Module Interaction Compatibility**:
   - Works correctly with existing Agent, Escrow, Channel modules
   - Shared state consistency across different instruction types
   - Proper event coordination between modules
   - No conflicts with existing functionality

2. **SDK Integration**:
   - TypeScript SDK can properly invoke these instructions
   - Instruction builders generate correct transaction data
   - RPC client integration works with modern patterns
   - Error handling translates correctly to SDK users

3. **Token-2022 Integration**:
   - Compatible with Token-2022 extensions and transfers
   - Proper handling of transfer fees and confidential operations
   - ElGamal encryption integration works correctly
   - ZK proof program integration functional

4. **Development Workflow Compatibility**:
   - Integrates with existing build and test processes
   - CLI tools can interact with new functionality
   - Documentation and examples remain accurate
   - No breaking changes to existing user workflows

CRITICAL: New code must enhance, not break, existing GhostSpeak functionality.
```

---

## 📊 **Performance and Security Prompts**

### **Security Analysis**
```
🗓️ CRITICAL CONTEXT: July 2025 GhostSpeak protocol security verification.

🚨 SECURITY VERIFICATION (P1 CRITICAL):

1. **Input Validation Security**:
   - All user inputs validated before processing
   - No injection vulnerabilities (SQL, command, etc.)
   - Proper sanitization of string inputs
   - Bounds checking prevents buffer overflows

2. **Authorization and Access Control**:
   - Admin operations properly protected
   - User authorization correctly verified
   - No privilege escalation vulnerabilities
   - Rate limiting prevents abuse

3. **Cryptographic Security**:
   - Uses proven cryptographic libraries (@noble/curves)
   - No custom crypto implementations without review
   - Proper key management and storage
   - No leakage of sensitive data in logs/errors

4. **Reentrancy and State Protection**:
   - No reentrancy vulnerabilities in cross-program invocations
   - State changes are atomic and consistent
   - Proper locking mechanisms where needed
   - No race conditions in concurrent operations

CRITICAL: Code must be production-ready from a security perspective.
```

### **Performance Analysis**
```
🗓️ CRITICAL CONTEXT: July 2025 GhostSpeak protocol performance verification.

🚨 PERFORMANCE VERIFICATION (P2 HIGH):

1. **Compute Unit Efficiency**:
   - Instructions use < 200,000 CU for normal operations
   - No unnecessary computations or loops
   - Efficient algorithm implementations
   - Optimized account access patterns

2. **Memory Usage Optimization**:
   - Minimal heap allocations in on-chain code
   - Efficient data structures for account storage
   - No memory leaks in long-running operations
   - Stack usage within Solana limits

3. **Transaction Size Optimization**:
   - Account lists minimized for instruction efficiency
   - Data serialization optimized for size
   - No unnecessary account inclusions
   - Batch operations where appropriate

4. **Network Efficiency**:
   - RPC calls minimized and batched where possible
   - Account caching strategies implemented
   - Efficient retry and error recovery patterns
   - Connection pooling and resource management

CRITICAL: Code must perform efficiently in production blockchain environment.
```

---

## 🎯 **Success Criteria Templates**

### **Compilation Success Verification**
```
✅ COMPILATION SUCCESS CRITERIA:
- Rust: 'anchor build' completes without errors
- TypeScript: 'bun run build' produces dist/ output
- Linting: 'bun run lint' returns 0 errors
- Type checking: 'bun run type-check' passes
- Tests: All unit and integration tests pass
```

### **Functional Success Verification**
```
✅ FUNCTIONAL SUCCESS CRITERIA:
- Deployment: 'anchor deploy --provider.cluster devnet' succeeds
- Instructions: All instruction tests pass in anchor test
- Integration: Full test suite passes without failures
- Performance: Compute units within acceptable limits
- Security: No vulnerabilities detected in analysis
```

### **Integration Success Verification**
```
✅ INTEGRATION SUCCESS CRITERIA:
- Compatibility: No breaking changes to existing functionality
- SDK: TypeScript SDK properly interfaces with new code
- CLI: Command-line tools integrate seamlessly
- Documentation: All examples and docs remain accurate
- Workflow: Development and deployment processes unchanged
```

---

**Usage Instructions**: These prompts should be used with kluster.ai MCP verification tools to provide comprehensive analysis of GhostSpeak protocol code, ensuring both functional correctness and integration compatibility.