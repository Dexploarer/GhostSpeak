# Security Policy

## Supported Versions

We actively support the following versions of the GhostSpeak TypeScript SDK:

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | ✅ Yes             |
| 1.6.x   | ✅ Yes (LTS)       |
| < 1.6   | ❌ No              |

## Reporting a Vulnerability

The GhostSpeak team takes security seriously. If you discover a security vulnerability, please follow our responsible disclosure process:

### 🚨 **For Critical Security Issues**

**DO NOT** create a public GitHub issue. Instead:

1. **Email**: Send details to `security@ghostspeak.com`
2. **Encrypt**: Use our PGP key (available on request)
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Your contact information

### 📧 **Expected Response Timeline**

- **Initial Response**: Within 24 hours
- **Assessment**: Within 72 hours
- **Resolution Timeline**: Varies by severity (see below)

### 🎯 **Severity Levels**

| Severity | Response Time | Description |
|----------|---------------|-------------|
| **Critical** | 24-48 hours | Remote code execution, private key exposure |
| **High** | 1-3 days | Authentication bypass, unauthorized fund access |
| **Medium** | 1-2 weeks | Information disclosure, denial of service |
| **Low** | 2-4 weeks | Minor information leaks, non-security bugs |

## Security Features

The GhostSpeak SDK implements multiple layers of security:

### 🔐 **Cryptographic Security**
- **ElGamal Encryption**: Zero-knowledge proofs for confidential transfers
- **Ed25519 Signatures**: Cryptographic verification for all transactions
- **Bulletproof Verification**: Range proofs ensuring transaction validity
- **PDA Security**: Canonical program-derived address patterns

### 🛡️ **Protocol Security**
- **Rate Limiting**: Built-in anti-spam protection for all instructions
- **Input Validation**: Comprehensive validation at instruction level
- **Reentrancy Protection**: All state-changing instructions protected
- **Multisig Support**: Multi-signature wallet integration

### 🔍 **Development Security**
- **Type Safety**: 100% TypeScript with strict mode enabled
- **Lint Compliance**: Zero ESLint warnings with security rules
- **Dependency Scanning**: Regular security audits of dependencies
- **Test Coverage**: Comprehensive unit and integration tests

## Security Best Practices

When using the GhostSpeak SDK:

### ✅ **Recommended Practices**

```typescript
// ✅ Always validate user inputs
import { validateAddress, validateAmount } from '@ghostspeak/sdk'

// ✅ Use environment variables for sensitive data
const rpcUrl = process.env.SOLANA_RPC_URL
const privateKey = process.env.WALLET_PRIVATE_KEY

// ✅ Implement proper error handling
try {
  const result = await client.agents.register(signer, params)
} catch (error) {
  console.error('Registration failed:', error.message)
  // Handle error appropriately
}

// ✅ Use multisig for high-value operations
const multisigWallet = await client.multisig.create({
  owners: [owner1, owner2, owner3],
  threshold: 2
})
```

### ❌ **Security Anti-Patterns**

```typescript
// ❌ NEVER hardcode private keys
const signer = createKeyPairSignerFromBytes("hardcoded-key")

// ❌ NEVER log sensitive information
console.log('Private key:', privateKey)

// ❌ NEVER ignore error handling
await client.escrow.create(signer, params) // Missing try/catch

// ❌ NEVER use unvalidated user input
const amount = userInput // Should be validated first
```

## Vulnerability Disclosure History

We maintain transparency about resolved security issues:

### 2025
- **2025-01-31**: Enhanced bulletproof verification (Medium) - Resolved
- **2025-01-15**: Type safety improvements (Low) - Resolved

*No critical or high-severity vulnerabilities have been identified to date.*

## Security Research

We welcome security research and responsible disclosure. Researchers who follow our guidelines may be eligible for:

- **Public Recognition**: Credit in our security acknowledgments
- **Swag & Merchandise**: GhostSpeak branded items
- **Protocol Tokens**: Rewards for significant findings

## Additional Resources

- **Documentation**: [Security Guide](./docs/SECURITY_AUDIT.md)
- **Best Practices**: [Development Guidelines](./README.md#security-standards)
- **Community**: [Discord Security Channel](https://discord.gg/ghostspeak)

---

*This security policy is reviewed quarterly and updated as needed. Last updated: January 31, 2025*