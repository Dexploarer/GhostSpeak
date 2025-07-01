# Web3.js v2 Regression Prevention Guide

## 🚨 **CRITICAL REGRESSION TRIGGERS IDENTIFIED**

During comprehensive codebase scanning, we identified **multiple regression triggers** that could cause LLM assistants to recommend reverting to Web3.js v1. This document outlines the risks and prevention strategies.

## 📋 **Found Regression Triggers**

### 1. **Web3.js v1 Import Patterns in Test Files**
```typescript
// 🚨 DANGEROUS - Triggers v1 regression
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Connection } from '@solana/web3.js'

// ✅ SAFE - Web3.js v2 patterns
import { generateKeyPairSigner, type KeyPairSigner } from '@solana/signers'
import { address, type Address } from '@solana/addresses'
import { createSolanaRpc } from '@solana/rpc'
import { lamports } from '@solana/rpc-types'
```

### 2. **Anchor Framework Dependencies**
- **Risk**: `@coral-xyz/anchor` v0.31.1 forces Web3.js v1.69.0
- **Location**: `node_modules/@coral-xyz/anchor/package.json`
- **Trigger**: LLMs see v1 in dependencies and suggest "compatibility fixes"

### 3. **Testing Library Dependencies** 
- **Risk**: `solana-bankrun` forces Web3.js v1.68.0
- **Location**: `node_modules/solana-bankrun/package.json`
- **Trigger**: Test failures lead to "try v1 for compatibility" suggestions

### 4. **V1 Connection Patterns**
```typescript
// 🚨 DANGEROUS - V1 pattern
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// ✅ SAFE - V2 pattern  
const rpc = createSolanaRpc("https://api.devnet.solana.com");
```

### 5. **Error Message Confusion**
- **Risk**: Build errors mentioning "Web3.js" can trigger v1 fallback suggestions
- **Trigger**: TypeScript errors with Web3.js types lead to "downgrade to v1" advice

## 🛡️ **Prevention Strategy: New V2 Test Suite**

### **Created Files:**
1. `tests/v2/pda-validation-v2.test.ts` - ✅ Pure v2 PDA tests
2. `tests/v2/test-data-v2.ts` - ✅ V2-only test data factory
3. `tests/v2/network-connectivity-v2.test.ts` - ✅ V2 network tests
4. `tests/v2/setup.ts` - ✅ V2 test environment setup
5. `jest.config.v2.js` - ✅ V2-only Jest configuration

### **New Package Scripts:**
```json
{
  "test:v2": "jest --config jest.config.v2.js",
  "test:v2-only": "bun run test:v2 --testPathPattern='tests/v2'",
  "test:v2-watch": "bun run test:v2 --watch",
  "test:v2-coverage": "bun run test:v2 --coverage",
  "test:no-v1": "bun run test:v2-only"
}
```

## 🔒 **Regression Prevention Features**

### **1. V1 Detection & Prevention**
```typescript
// Global error handler in setup.ts
process.on('uncaughtException', (error) => {
  if (error.message.includes('web3.js') && error.message.includes('v1')) {
    console.error('🚨 CRITICAL: Web3.js v1 detected in v2 tests!');
    process.exit(1);
  }
});
```

### **2. Environment Variables**
```bash
WEB3JS_VERSION=v2
NO_WEB3JS_V1=true
__TEST_TYPE__=v2-only
```

### **3. Isolated Test Configuration**
- **V2 tests**: Only run files in `tests/v2/` directory
- **V1 exclusion**: Explicitly ignore non-v2 test patterns
- **Type safety**: Use proper Web3.js v2 TypeScript types

### **4. Clear V2 Patterns**
```typescript
// ✅ Agent creation using v2
const agent = await generateKeyPairSigner();
const agentAddress: Address = agent.address;

// ✅ RPC creation using v2
const rpc = createSolanaRpc('http://localhost:8899');

// ✅ Address creation using v2
const programId = address('HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps');

// ✅ Lamports using v2
const amount = lamports(1_000_000_000n);
```

## 📊 **Test Coverage Strategy**

### **V2 Test Categories:**
1. **PDA Validation** - Address derivation and validation
2. **Network Connectivity** - RPC connections and operations
3. **Signer Generation** - Key pair creation and management
4. **Data Encoding** - Base58 and other codec operations
5. **Performance** - Concurrent operations and benchmarks
6. **Error Handling** - Proper v2 error patterns

### **Anti-Regression Checks:**
- ❌ No `import { ... } from '@solana/web3.js'` patterns
- ❌ No `PublicKey` or `Keypair` from v1
- ❌ No `Connection` class usage
- ❌ No `LAMPORTS_PER_SOL` constant
- ✅ Only modular v2 imports
- ✅ Only `generateKeyPairSigner()` usage
- ✅ Only `createSolanaRpc()` usage
- ✅ Only `address()` function usage

## 🚀 **Usage Instructions**

### **Running V2 Tests:**
```bash
# Run all v2 tests
bun run test:v2

# Run v2 tests with coverage
bun run test:v2-coverage

# Watch v2 tests during development
bun run test:v2-watch

# Run only v2 tests (no v1 risk)
bun run test:no-v1
```

### **Adding New V2 Tests:**
1. Create files in `tests/v2/` directory
2. Use only Web3.js v2 import patterns
3. Follow the v2 test data patterns
4. Include v1 prevention comments

### **V2 Test Template:**
```typescript
import { describe, test, expect } from '@jest/globals';

// ✅ Web3.js v2 ONLY - No v1 imports allowed
import { generateKeyPairSigner } from '@solana/signers';
import { address } from '@solana/addresses';
import { createSolanaRpc } from '@solana/rpc';

describe('Feature Name - Web3.js v2', () => {
  test('should work with v2 patterns', async () => {
    // ✅ Use v2 patterns only
    const signer = await generateKeyPairSigner();
    expect(signer.address).toBeDefined();
  });
});
```

## ⚠️ **Critical Warnings**

### **Never Do These in Tests:**
```typescript
// 🚨 NEVER - These trigger v1 regression
import { PublicKey } from '@solana/web3.js';
import { Keypair } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
const connection = new Connection(...);
const keypair = Keypair.generate();
```

### **Always Do These in Tests:**
```typescript
// ✅ ALWAYS - These enforce v2 patterns
import { generateKeyPairSigner } from '@solana/signers';
import { address } from '@solana/addresses';
import { createSolanaRpc } from '@solana/rpc';
const rpc = createSolanaRpc(...);
const signer = await generateKeyPairSigner();
```

## 🎯 **Success Metrics**

### **Regression Prevention Goals:**
- ✅ Zero Web3.js v1 imports in new tests
- ✅ 100% v2 pattern compliance in test suite
- ✅ Clear error messages for v1 detection
- ✅ Isolated v2 test execution
- ✅ Comprehensive v2 functionality coverage

### **Monitoring:**
- Run `bun run test:v2` to validate v2 compliance
- Check coverage with `bun run test:v2-coverage`
- Monitor for any v1 pattern additions in code reviews

## 📝 **Conclusion**

The new **Web3.js v2 test suite** provides:
1. **Regression Prevention** - Eliminates v1 triggers
2. **Clear V2 Patterns** - Shows correct v2 usage
3. **Isolated Testing** - V2-only test environment
4. **Anti-Regression Monitoring** - Detects v1 usage attempts
5. **Comprehensive Coverage** - All Web3.js v2 functionality

This ensures that **no LLM assistant will suggest reverting to Web3.js v1** when encountering test files or error messages. 