# GhostSpeak SDK Testing Guide

This directory contains the comprehensive test suite for the GhostSpeak TypeScript SDK.

## Test Organization

```
tests/
├── factories/          # Mock data factories
│   └── index.ts       # createMockAgent, createMockEscrow, etc.
├── helpers/           # Test utilities
│   ├── assertions.ts  # Reusable assertions (expectValidAgent, etc.)
│   └── database-helpers.ts # Database test utilities
├── integration/       # Integration tests (real services)
│   └── database/      # Real Turso database tests
└── unit/             # Unit tests (mocked dependencies)
    ├── core/         # Core SDK functionality
    ├── crypto/       # Encryption and cryptography
    ├── modules/      # SDK modules (Agent, Channel, Governance, etc.)
    └── utils/        # Utility functions
```

## Running Tests

### All Tests
```bash
bun test
```

### Unit Tests Only
```bash
bun run test:unit
```

### Integration Tests (requires Turso DB)
```bash
# Set environment variables
export TURSO_DATABASE_URL="your_database_url"
export TURSO_AUTH_TOKEN="your_auth_token"

# Run integration tests
bun test tests/integration/
```

### Watch Mode
```bash
bun run test:watch
```

### Coverage Report
```bash
bun run test:coverage
open coverage/index.html
```

### Specific Test File
```bash
bun test tests/unit/modules/agent-module.test.ts
```

## Writing New Tests

### 1. Use Test Factories

Create mock data using factories from `tests/factories/`:

```typescript
import { createMockAgent, createMockSigner } from '../../factories'

describe('My Test', () => {
  it('should work with agent', () => {
    const agent = createMockAgent({
      name: 'Custom Agent',
      isActive: true
    })
    
    expect(agent.name).toBe('Custom Agent')
  })
})
```

### 2. Use Assertion Helpers

Use shared assertions from `tests/helpers/assertions.ts`:

```typescript
import { expectValidAgent, expectTransactionSuccess } from '../../helpers/assertions'

it('should return valid agent', async () => {
  const agent = await someFunction()
  expectValidAgent(agent)
})

it('should complete transaction', async () => {
  const signature = await sendTransaction()
  expectTransactionSuccess(signature)
})
```

### 3. Mock External Dependencies

```typescript
vi.mock('../../../src/generated/index.js', () => ({
  getSomeInstructionAsync: vi.fn().mockResolvedValue({
    instruction: { /* mock instruction */ }
  })
}))
```

### 4. Structure Your Tests

```typescript
describe('ModuleName', () => {
  let module: ModuleName
  let mockClient: GhostSpeakClient
  let mockSigner: TransactionSigner

  beforeEach(() => {
    mockClient = createMockClient()
    mockSigner = createMockSigner()
    module = new ModuleName(mockClient)
  })

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const input = { /* test data */ }
      
      // Act
      const result = await module.methodName(input)
      
      // Assert
      expect(result).toBeDefined()
    })

    it('should handle error case', async () => {
      // Arrange
      mockClient.sendTransaction = vi.fn().mockRejectedValue(new Error('Network error'))
      
      // Act & Assert
      await expect(module.methodName({})).rejects.toThrow('Network error')
    })
  })
})
```

## Test Patterns

### Testing Async Functions

```typescript
it('should return data asynchronously', async () => {
  const result = await asyncFunction()
  expect(result).toBeDefined()
})
```

### Testing Errors

```typescript
it('should throw on invalid input', async () => {
  await expect(functionCall()).rejects.toThrow()
  await expect(functionCall()).rejects.toThrow('Specific error message')
})
```

### Testing with Mocks

```typescript
it('should call dependency correctly', async () => {
  const mockFn = vi.fn()
  mockClient.sendTransaction = mockFn
  
  await module.doSomething()
  
  expect(mockFn).toHaveBeenCalledWith(
    expect.objectContaining({ /* expected args */ })
  )
})
```

## Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| Core | 90% | 85% |
| Modules | 90% | 80% |
| Crypto | 95% | 92% |
| Utils | 85% | 78% |
| **Overall** | **90%** | **82%** |

## Database Integration Tests

Integration tests use a real Turso database and gracefully skip if not configured:

```typescript
import { checkDatabaseConfig, setupTestDatabase, cleanupTestDatabase } from '../helpers/database-helpers'

describe('DatabaseService', () => {
  beforeAll(async () => {
    if (!(await checkDatabaseConfig())) {
      console.log('⏭️  Skipping: Turso database not configured')
      return
    }
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  it('should interact with real database', async () => {
    if (!(await checkDatabaseConfig())) return // Skip test
    
    // Test with real database
  })
})
```

## Performance Testing

Keep tests fast:
- Unit tests should run in < 10s total
- Integration tests should run in < 30s total
- Use `vi.useFakeTimers()` for time-dependent tests
- Mock network calls in unit tests

## Best Practices

### ✅ DO

- Write descriptive test names
- Test one thing per test
- Use factories for test data
- Clean up after tests (afterEach)
- Test both success and error cases
- Use shared assertions
- Keep tests independent

### ❌ DON'T

- Make real network calls in unit tests
- Leave hanging promises
- Depend on test execution order
- Use hard-coded addresses/keys
- Skip cleanup
- Test implementation details
- Write flaky tests

## CI/CD Integration

Tests run automatically on every push:

```yaml
# .github/workflows/ci.yml
test-sdk:
  steps:
    - run: cd packages/sdk-typescript && bun test --run
```

All tests must pass before merging PRs.

## Debugging Tests

### Run Single Test
```bash
bun test tests/unit/modules/agent-module.test.ts -t "should create agent"
```

### Enable Debug Logging
```bash
DEBUG=* bun test
```

### Use Vitest UI
```bash
bun run test:watch
# Press 'o' to open UI
```

## Common Issues

### Issue: Tests timing out
**Solution**: Increase timeout or check for unresolved promises

```typescript
it('long test', async () => {
  // ...
}, 10000) // 10s timeout
```

### Issue: Flaky tests
**Solution**: Use `vi.useFakeTimers()` and control time

```typescript
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})
```

### Issue: Database tests failing
**Solution**: Ensure Turso env vars are set

```bash
export TURSO_DATABASE_URL="libsql://..."
export TURSO_AUTH_TOKEN="eyJ..."
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldber grv/javascript-testing-best-practices)
- [GhostSpeak SDK Docs](../../docs/)

## Support

For testing questions or issues, reach out in the `#testing` channel or create a GitHub issue.
