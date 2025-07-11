# Testing Getting Started Guide

Quick start guide for implementing testing in GhostSpeak projects following Test-Driven Development (TDD) principles.

## Prerequisites

- Node.js 18+ or Bun 1.0+
- Rust 1.79+ with Cargo
- Solana CLI tools
- Git for version control

## Setup Testing Environment

### 1. Install Testing Dependencies

**For TypeScript/JavaScript projects:**
```bash
bun add -D vitest @vitest/ui @testing-library/react jsdom
bun add -D @testing-library/jest-dom @testing-library/user-event
```

**For Rust projects:**
```bash
cargo add --dev tokio-test
cargo add --dev solana-program-test
cargo add --dev anchor-lang
```

### 2. Configure Test Runners

**Vitest Configuration (vitest.config.ts):**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        global: {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    }
  }
});
```

**Cargo.toml Test Configuration:**
```toml
[dev-dependencies]
tokio-test = "0.4"
solana-program-test = "1.18"
anchor-lang = { version = "0.29", features = ["init-if-needed"] }
```

## Your First TDD Test

### 1. Write a Failing Test (Red Phase)

```typescript
// tests/agent.test.ts
import { describe, it, expect } from 'vitest';
import { AgentService } from '../src/services/AgentService';

describe('AgentService', () => {
  it('should register a new agent', async () => {
    const agentService = new AgentService();
    
    const result = await agentService.registerAgent({
      name: 'TestAgent',
      capabilities: ['chat']
    });
    
    expect(result.name).toBe('TestAgent');
    expect(result.id).toBeDefined();
  });
});
```

Run the test (it will fail):
```bash
bun test
```

### 2. Write Minimal Code (Green Phase)

```typescript
// src/services/AgentService.ts
export class AgentService {
  async registerAgent(data: { name: string; capabilities: string[] }) {
    return {
      id: 'test-id',
      name: data.name,
      capabilities: data.capabilities,
      createdAt: new Date()
    };
  }
}
```

Run the test again (it should pass):
```bash
bun test
```

### 3. Refactor (Blue Phase)

```typescript
// src/services/AgentService.ts
import { generateId } from '../utils/crypto';

export class AgentService {
  private agents = new Map();

  async registerAgent(data: { name: string; capabilities: string[] }) {
    const agent = {
      id: generateId(),
      name: data.name,
      capabilities: data.capabilities,
      createdAt: new Date(),
      status: 'active'
    };
    
    this.agents.set(agent.id, agent);
    return agent;
  }
}
```

## Test Organization

### Directory Structure
```
tests/
├── unit/                 # Unit tests
│   ├── services/
│   ├── utils/
│   └── components/
├── integration/          # Integration tests
│   ├── api/
│   └── services/
├── e2e/                  # End-to-end tests
│   └── flows/
├── fixtures/             # Test data
│   ├── agents.json
│   └── messages.json
├── mocks/                # Mock implementations
│   ├── providers.ts
│   └── services.ts
└── utils/                # Test utilities
    ├── setup.ts
    └── helpers.ts
```

## Common Test Patterns

### 1. Arrange-Act-Assert Pattern

```typescript
it('should calculate reputation score correctly', () => {
  // Arrange
  const agent = createTestAgent({
    successfulInteractions: 95,
    totalInteractions: 100
  });
  
  // Act
  const score = calculateReputationScore(agent);
  
  // Assert
  expect(score).toBe(0.95);
});
```

### 2. Test Fixtures

```typescript
// tests/fixtures/agents.ts
export const testAgents = {
  newAgent: {
    name: 'NewAgent',
    capabilities: ['chat'],
    reputation: 0
  },
  experiencedAgent: {
    name: 'ExperiencedAgent',
    capabilities: ['chat', 'analysis', 'trading'],
    reputation: 0.92,
    totalInteractions: 1000
  }
};
```

### 3. Mocking External Dependencies

```typescript
// tests/mocks/blockchain.ts
import { vi } from 'vitest';

export const mockBlockchainProvider = {
  connection: {
    sendTransaction: vi.fn().mockResolvedValue('mock-signature'),
    getLatestBlockhash: vi.fn().mockResolvedValue({
      blockhash: 'mock-hash'
    })
  }
};
```

## Running Tests

### Development Workflow

```bash
# Run tests in watch mode during development
bun test --watch

# Run tests with coverage
bun test --coverage

# Run specific test file
bun test agent.test.ts

# Run tests matching pattern
bun test --grep "register agent"
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
        
      - name: Run tests
        run: bun test --coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Best Practices Summary

### ✅ Do
- Write tests before implementation (TDD)
- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Keep tests independent and isolated
- Use test fixtures for consistent data
- Mock external dependencies
- Maintain high test coverage (>90%)

### ❌ Don't
- Write tests after implementation
- Make tests dependent on each other
- Use hardcoded values without context
- Test implementation details
- Skip edge cases and error scenarios
- Ignore flaky tests

## Next Steps

1. **[Unit Testing Guide](./unit-testing.md)** - Deep dive into unit testing patterns
2. **[Integration Testing](./integration-testing.md)** - Testing service interactions
3. **[Smart Contract Testing](./contract-testing.md)** - Solana program testing
4. **[E2E Testing](./e2e-testing.md)** - Complete user journey testing
5. **[Performance Testing](./performance-testing.md)** - Load and stress testing

## Getting Help

- 💬 [Discord Community](https://discord.gg/ghostspeak-dev)
- 📚 [Testing Documentation](./README.md)
- 🐛 [Report Issues](https://github.com/ghostspeak/core/issues)
- 📧 [Email Support](mailto:dev-support@ghostspeak.com) 