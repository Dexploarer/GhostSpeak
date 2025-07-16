# GhostSpeak SDK Test Suite

Comprehensive test suite for the GhostSpeak TypeScript SDK with unit, integration, and E2E tests.

## Test Structure

```
tests/
├── unit/                      # Unit tests with mocked dependencies
│   ├── instructions/          # Test each instruction module
│   ├── utils/                 # Test utility functions
│   ├── client/                # Test client functionality
│   └── error-handling.test.ts # Error handling tests
├── integration/               # Integration tests with mocked RPC
│   └── workflows.test.ts      # Full workflow testing
├── e2e/                       # End-to-end tests with local validator
│   └── local-validator.test.ts # Real blockchain interaction
├── test-helpers.ts            # Shared test utilities
├── setup.ts                   # Global test setup
└── README.md                  # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm test -- tests/unit
```

### Integration Tests Only
```bash
npm test -- tests/integration
```

### E2E Tests (Requires Local Validator)
```bash
# Start local validator first
solana-test-validator --reset

# Run E2E tests
npm test -- tests/e2e
```

### Watch Mode
```bash
npm test -- --watch
```

### Coverage Report
```bash
npm test -- --coverage
```

## Test Categories

### Unit Tests
- **Purpose**: Test individual modules in isolation
- **Mocking**: All RPC calls and external dependencies are mocked
- **Speed**: Very fast (< 1 second per test)
- **Coverage**: Each instruction class, utility function, and error case

Example:
```typescript
// Tests AgentInstructions class with mocked RPC
describe('AgentInstructions', () => {
  it('should create register agent instruction', async () => {
    // Test implementation
  })
})
```

### Integration Tests
- **Purpose**: Test complete workflows and module interactions
- **Mocking**: RPC is mocked but workflow logic is real
- **Speed**: Fast (1-5 seconds per workflow)
- **Coverage**: Multi-step processes like agent registration → service listing → purchase

Example:
```typescript
// Tests full purchase workflow
describe('Service Purchase with Escrow Workflow', () => {
  it('should complete full purchase workflow', async () => {
    // Create work order → Create payment → Deliver → Release
  })
})
```

### E2E Tests
- **Purpose**: Test actual blockchain interactions
- **Requirements**: Local Solana validator running
- **Speed**: Slower (5-30 seconds per test)
- **Coverage**: Real transaction submission and state verification

Example:
```typescript
// Tests real on-chain agent registration
describe('Agent Registration E2E', () => {
  it('should register agent on-chain', async () => {
    // Real transaction with local validator
  })
})
```

## Test Utilities

### Mock Helpers
```typescript
import { createMockRpc, createTestAccounts } from './test-helpers'

// Create mock RPC client
const mockRpc = createMockRpc()

// Create test accounts
const { payer, agent, buyer, seller } = await createTestAccounts()
```

### Test Data Generators
```typescript
import { testData } from './test-helpers'

// Generate test data
const agentName = testData.agentName('001')
const serviceTitle = testData.serviceTitle()
const requirements = testData.requirements()
```

### Error Matchers
```typescript
import { errorMatchers } from './test-helpers'

// Match specific errors
expect(error).toMatch(errorMatchers.insufficientFunds)
expect(error).toMatch(errorMatchers.networkError)
```

### Test Scenarios
```typescript
import { TestScenario } from './test-helpers'

// Set up test scenario
const scenario = new TestScenario()
const { rpc, payer, agent } = await scenario.setup()

// Mock specific behaviors
scenario.mockAccountExists(agentAddress, agentData)
scenario.mockTransaction(true, 'tx_signature')
```

## Writing New Tests

### Unit Test Template
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { YourModule } from '../../src/your-module'
import { createMockRpc, createTestAccounts } from '../test-helpers'

describe('YourModule', () => {
  let module: YourModule
  let mockRpc: any
  let accounts: any

  beforeEach(async () => {
    mockRpc = createMockRpc()
    accounts = await createTestAccounts()
    module = new YourModule(mockRpc)
  })

  it('should do something', async () => {
    // Arrange
    const input = { /* test input */ }
    
    // Act
    const result = await module.doSomething(input)
    
    // Assert
    expect(result).toBeDefined()
  })
})
```

### Integration Test Template
```typescript
describe('Your Workflow', () => {
  it('should complete workflow', async () => {
    // Step 1: Initial action
    const step1 = await client.module.action1(params1)
    expect(step1).toBeDefined()

    // Step 2: Follow-up action
    const step2 = await client.module.action2(params2)
    expect(step2).toBeDefined()

    // Verify final state
    expect(mockRpc.sendTransaction).toHaveBeenCalledTimes(2)
  })
})
```

## Coverage Goals

- **Unit Tests**: 90%+ coverage of all code paths
- **Integration Tests**: Cover all major user workflows
- **E2E Tests**: Verify critical paths work on-chain

Current coverage thresholds (configured in vitest.config.ts):
- Branches: 60%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Debugging Tests

### Enable Logging
```typescript
// In your test
global.testUtils.enableLogging()
```

### Run Specific Test
```bash
npm test -- -t "should register agent"
```

### Debug in VS Code
Add breakpoints and use the "Debug Test" option in VS Code.

## CI/CD Integration

Tests are automatically run in CI with:
- Unit and integration tests on every PR
- E2E tests skipped in CI (no local validator)
- Coverage reports uploaded to tracking service

Environment variables:
- `CI=true` - Indicates CI environment
- `SKIP_E2E_TESTS=true` - Skip E2E tests
- `START_VALIDATOR=true` - Auto-start local validator

## Common Issues

### "Connection refused" in E2E tests
Make sure local validator is running:
```bash
solana-test-validator --reset
```

### Mock not working
Clear all mocks in beforeEach:
```typescript
beforeEach(() => {
  vi.clearAllMocks()
})
```

### Transaction simulation failing
Check that mock RPC responses match expected format:
```typescript
mockRpc.simulateTransaction.mockResolvedValue({
  value: {
    err: null,
    logs: [],
    unitsConsumed: 5000n
  }
})
```

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Use Descriptive Names**: Test names should explain what they test
3. **Mock External Dependencies**: Don't make real network calls in unit tests
4. **Test Error Cases**: Always test both success and failure paths
5. **Keep Tests Fast**: Unit tests should run in milliseconds
6. **Use Test Helpers**: Reuse common setup code
7. **Verify State Changes**: In E2E tests, verify on-chain state

## Contributing

When adding new features:
1. Write unit tests first (TDD approach)
2. Add integration tests for workflows
3. Add E2E tests for critical paths
4. Ensure all tests pass
5. Check coverage hasn't decreased