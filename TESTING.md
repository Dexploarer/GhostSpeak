# GhostSpeak Test Suite

Comprehensive test suite for DID, reputation tags, and multi-source aggregation features.

## Test Structure

```
programs/tests/
├── did_tests.rs                  # Rust DID integration tests
├── reputation_tags_tests.rs      # Rust reputation tags tests
├── multi_source_tests.rs         # Rust multi-source reputation tests
└── security_validation.rs        # Existing security tests

packages/sdk-typescript/tests/
├── unit/
│   ├── modules/
│   │   ├── did-module.test.ts
│   │   └── multi-source-aggregator.test.ts
│   └── utils/
│       └── reputation-tag-engine.test.ts
├── fixtures/
│   ├── did-fixtures.ts
│   └── reputation-fixtures.ts
└── e2e/
    └── (see packages/web/tests/e2e/)

packages/web/tests/e2e/
├── did-operations.spec.ts
├── reputation-tags.spec.ts
└── multi-source-reputation.spec.ts
```

## Running Tests

### Rust Tests

```bash
# Run all Rust tests
bun run test:programs

# Run specific test file
cd programs
cargo test --test did_tests
cargo test --test reputation_tags_tests
cargo test --test multi_source_tests

# Run with output
cargo test --test did_tests -- --nocapture

# Run specific test
cargo test test_did_creation
```

### TypeScript Unit Tests

```bash
# Run all SDK tests
cd packages/sdk-typescript
bun test

# Run specific test files
bun test tests/unit/modules/did-module.test.ts
bun test tests/unit/utils/reputation-tag-engine.test.ts
bun test tests/unit/modules/multi-source-aggregator.test.ts

# Run tests with coverage
bun test --coverage

# Watch mode
bun test --watch
```

### E2E Tests with Playwright

```bash
# Install Playwright (first time only)
cd packages/web
bunx playwright install

# Run all E2E tests
bun run test:e2e

# Run specific E2E test
bunx playwright test tests/e2e/did-operations.spec.ts
bunx playwright test tests/e2e/reputation-tags.spec.ts
bunx playwright test tests/e2e/multi-source-reputation.spec.ts

# Run with UI mode
bunx playwright test --ui

# Run in headed mode (see browser)
bunx playwright test --headed

# Debug mode
bunx playwright test --debug
```

### Run All Tests

```bash
# From project root
bun run test:all
```

## Test Coverage

Target: **≥80% code coverage**

### Coverage by Module

Run coverage reports:

```bash
# TypeScript coverage
cd packages/sdk-typescript
bun test --coverage

# View HTML report
open coverage/index.html
```

### Expected Coverage

**DID Module:**
- ✅ Create DID document
- ✅ Update DID document (add/remove methods & services)
- ✅ Deactivate DID document
- ✅ Resolve DID document
- ✅ W3C export functionality
- ✅ PDA derivation
- ✅ DID validation

**Reputation Tags:**
- ✅ Auto-tagging based on metrics
- ✅ Confidence scoring
- ✅ Tag decay over time
- ✅ Category management (skill, behavior, compliance)
- ✅ Tag limits enforcement
- ✅ Staleness detection
- ✅ Evidence tracking

**Multi-Source Reputation:**
- ✅ Source score management
- ✅ Weighted score calculation
- ✅ Conflict detection (>30% variance)
- ✅ Source reliability tracking
- ✅ Primary source selection
- ✅ Normalization factors

## Test Fixtures

Reusable test data is available in `packages/sdk-typescript/tests/fixtures/`:

```typescript
// DID fixtures
import {
  createMockDidDocument,
  createMockVerificationMethod,
  createMockServiceEndpoint,
  VALID_DID_STRINGS,
  INVALID_DID_STRINGS,
} from './fixtures/did-fixtures'

// Reputation fixtures
import {
  createMockReputationMetrics,
  createMockTagScore,
  createMockSourceScore,
  COMMON_SKILL_TAGS,
  COMMON_BEHAVIOR_TAGS,
} from './fixtures/reputation-fixtures'
```

## Test Patterns

### Rust Tests

```rust
#[tokio::test]
async fn test_did_creation() {
    // Setup
    let controller = Pubkey::new_unique();
    let did_doc = create_test_did_document(controller);

    // Test
    assert_eq!(did_doc.controller, controller);
    assert!(!did_doc.deactivated);

    // Cleanup (if needed)
}
```

### TypeScript Unit Tests

```typescript
import { test, expect, describe, beforeEach } from 'bun:test'

describe('DidModule', () => {
  let didModule: DidModule

  beforeEach(() => {
    didModule = new DidModule(config)
  })

  test('should create DID document', async () => {
    const signature = await didModule.create({
      controller: mockController,
    })

    expect(signature).toBeTruthy()
  })
})
```

### E2E Tests

```typescript
import { test, expect } from '@playwright/test'

test('should display DID on agent page', async ({ page }) => {
  await page.goto('/agents/test-agent-id')

  const didString = await page.locator('[data-testid="did-string"]').textContent()
  expect(didString).toContain('did:sol:')
})
```

## Test Data Management

### Mock Data

All tests use isolated mock data to avoid dependencies on external services:

- **Rust tests**: Helper functions create test structs
- **TypeScript tests**: Fixtures in `tests/fixtures/`
- **E2E tests**: Test data seeded before test runs

### Test Wallets

For E2E and integration tests requiring wallets:

```bash
# Generate test keypair
solana-keygen new --outfile test-wallet.json --no-bip39-passphrase

# Airdrop SOL (devnet)
solana airdrop 2 test-wallet.json --url devnet
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Nightly builds

### GitHub Actions

```yaml
# .github/workflows/test.yml
- name: Run Rust tests
  run: cargo test --all

- name: Run TypeScript tests
  run: bun test --coverage

- name: Run E2E tests
  run: bunx playwright test
```

## Debugging Tests

### Rust Tests

```bash
# Run with debug output
RUST_LOG=debug cargo test --test did_tests -- --nocapture

# Run single test with backtrace
RUST_BACKTRACE=1 cargo test test_did_creation
```

### TypeScript Tests

```bash
# Run with verbose output
bun test --verbose

# Debug specific test
bun test tests/unit/modules/did-module.test.ts --debug
```

### E2E Tests

```bash
# Run with trace
bunx playwright test --trace on

# View trace
bunx playwright show-trace trace.zip

# Debug with Playwright Inspector
PWDEBUG=1 bunx playwright test
```

## Performance Benchmarks

Tests complete in **<5 minutes** total:

- Rust tests: ~30 seconds
- TypeScript unit tests: ~1 minute
- E2E tests: ~3 minutes (sequential)

### Optimization Tips

1. **Parallel execution**: E2E tests run in parallel by default
2. **Test sharding**: Split tests across CI workers
3. **Selective running**: Use `.only()` for focused development

```typescript
// Run only this test during development
test.only('should create DID', async () => {
  // ...
})
```

## Test Quality Checklist

- ✅ All critical paths tested
- ✅ Edge cases covered (empty data, max limits, invalid inputs)
- ✅ Error handling tested
- ✅ Success and failure cases
- ✅ Mock data fixtures created
- ✅ Tests pass consistently
- ✅ Coverage ≥80%
- ✅ Tests complete in <5 minutes

## Troubleshooting

### Common Issues

**Rust tests fail to compile:**
```bash
cd programs
cargo clean
cargo build --tests
```

**TypeScript tests timeout:**
```bash
# Increase timeout in test file
test('long running test', async () => {
  // ...
}, { timeout: 10000 }) // 10 seconds
```

**E2E tests can't find elements:**
- Ensure test data is seeded
- Check data-testid attributes exist
- Increase timeout for slow network

**Coverage not reaching 80%:**
- Check which lines are not covered: `bun test --coverage`
- Add tests for uncovered branches
- Remove dead code

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Ensure coverage ≥80%
3. Add fixtures for reusable data
4. Update this README
5. Run full test suite before PR

## Resources

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Playwright Documentation](https://playwright.dev)
- [Anchor Testing Guide](https://www.anchor-lang.com/docs/testing)
