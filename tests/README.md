# GhostSpeak Testing Suite

Comprehensive testing framework covering integration, performance, security, and user acceptance testing.

## Test Categories

### 1. Integration Tests (`/integration`)
Live blockchain transaction testing on Solana devnet.

```bash
# Run integration tests
npm test tests/integration/blockchain-live.test.ts
```

**Coverage:**
- Agent registration and retrieval
- Marketplace listing creation
- Escrow payment flows
- A2A communication channels
- Error handling and edge cases

### 2. Performance Tests (`/performance`)
Load testing and performance benchmarking.

```bash
# Run performance tests
npm test tests/performance/agent-load.test.ts
```

**Metrics:**
- Concurrent agent registration (100+ agents)
- Query performance at scale
- Memory usage monitoring
- Connection pool efficiency
- Throughput measurements

### 3. Security Audit (`/security`)
Credential storage and security validation.

```bash
# Run security audit
npm test tests/security/credential-audit.test.ts
```

**Validations:**
- File permission checks (0600)
- Encryption standards (AES-256-GCM)
- Input sanitization
- Access control
- Audit logging
- GDPR compliance

### 4. User Acceptance Tests (`/user-acceptance`)
End-to-end user experience validation.

```bash
# Run UAT framework
npm test tests/user-acceptance/uat-framework.ts

# Run manual UAT session
npx tsx tests/user-acceptance/uat-framework.ts
```

**Scenarios:**
- First-time user setup
- Agent registration flow
- Marketplace interactions
- Developer experience
- Error recovery
- Help system

## Running All Tests

```bash
# Run all test suites
npm test

# Run specific category
npm test tests/integration
npm test tests/performance
npm test tests/security
npm test tests/user-acceptance

# Generate coverage report
npm run test:coverage
```

## Test Requirements

### Environment Setup
1. Solana devnet access
2. Valid RPC endpoints
3. Test wallet with SOL
4. Node.js 20+

### Configuration
```bash
# Set test environment
export GHOSTSPEAK_RPC_URL=https://api.devnet.solana.com
export GHOSTSPEAK_CLUSTER=devnet
export NODE_ENV=test
```

## Performance Benchmarks

### Agent Operations
- Registration: < 5s per agent
- Bulk operations: > 20 agents/sec
- Query response: < 2s
- Memory growth: < 100MB

### Security Standards
- Encryption: AES-256-GCM
- Key derivation: PBKDF2 (100k+ iterations)
- File permissions: 0600
- Audit logs: All access attempts

### User Experience
- First interaction: < 30s to first success
- Error recovery: Clear messaging
- Help availability: Context-sensitive
- Operation feedback: Progress indicators

## Continuous Integration

### GitHub Actions
```yaml
- name: Run Tests
  run: |
    npm test tests/integration
    npm test tests/performance
    npm test tests/security
    npm test tests/user-acceptance
```

### Pre-commit Hooks
```bash
# .husky/pre-commit
npm test tests/security/credential-audit.test.ts
```

## Reporting

Test results are generated in:
- `coverage/` - Code coverage reports
- `uat-report.md` - User acceptance results
- `.test-results/` - Performance metrics

## Contributing

When adding new features:
1. Add integration tests for blockchain interactions
2. Include performance benchmarks
3. Validate security implications
4. Test user experience flows