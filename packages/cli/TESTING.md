# GhostSpeak CLI Testing Guide

This document explains how to test the GhostSpeak CLI to ensure all commands and features work correctly.

## Overview

The CLI testing infrastructure includes:
- **Unit Tests**: Test individual command functions with mocked dependencies
- **Integration Tests**: Test the CLI as a spawned process end-to-end
- **Interactive Mode Tests**: Test the interactive menu system
- **Command Runner**: Automated script to test all commands

## Test Structure

```
packages/cli/
├── tests/
│   ├── unit/                    # Unit tests with mocked dependencies
│   │   └── commands/            # Tests for each command module
│   │       └── agent.test.ts    # Agent command tests
│   └── integration/             # Integration tests
│       ├── cli-runner.test.ts   # Basic CLI integration tests
│       └── interactive-mode.test.ts # Interactive menu tests
├── scripts/
│   └── test-all-commands.ts     # Automated command testing script
└── .github/
    └── workflows/
        └── test.yml             # CI/CD test automation
```

## Running Tests

### All Tests
```bash
# Run all tests (build + unit + integration + commands)
bun run test:all
```

### Unit Tests Only
```bash
# Run unit tests with vitest
bun run test:unit
```

### Integration Tests Only
```bash
# Run integration tests
bun run test:integration
```

### Command Testing Script
```bash
# Test all CLI commands automatically
bun run test:commands
```

### Watch Mode (Development)
```bash
# Run tests in watch mode during development
bun test --watch
```

## Test Categories

### 1. Unit Tests (`tests/unit/`)
Unit tests mock all external dependencies (@clack/prompts, SDK, etc.) and test command logic in isolation.

Example:
```typescript
import { vi } from 'vitest'

// Mock dependencies
vi.mock('@clack/prompts')
vi.mock('../../src/utils/client.js')

// Test command logic
it('should register a new agent', async () => {
  // Test implementation
})
```

### 2. Integration Tests (`tests/integration/cli-runner.test.ts`)
Integration tests spawn the CLI as a child process and test real command execution.

Features tested:
- Basic commands (--version, --help)
- All command groups (agent, marketplace, escrow, etc.)
- Error handling
- Help system
- Command aliases

### 3. Interactive Mode Tests (`tests/integration/interactive-mode.test.ts`)
Tests the interactive menu system using a custom `InteractiveCLI` helper class.

Features tested:
- Main menu navigation
- Submenu navigation
- Back navigation
- Quit functionality
- Error handling for invalid inputs

### 4. Command Runner Script (`scripts/test-all-commands.ts`)
Automated script that tests every CLI command and generates a test report.

Features:
- Tests 25+ commands automatically
- Validates expected output
- Measures execution time
- Generates JSON test report
- Colored console output

## Writing New Tests

### Unit Test Template
```typescript
describe('New Command', () => {
  it('should perform expected action', async () => {
    // Setup mocks
    vi.mocked(promptFunction).mockResolvedValue(expectedValue)
    
    // Import and execute command
    const { commandFunction } = await import('../../src/commands/new.js')
    await commandFunction(options)
    
    // Verify behavior
    expect(mockClient.method).toHaveBeenCalledWith(expectedArgs)
  })
})
```

### Integration Test Template
```typescript
it('should handle new command', async () => {
  const result = await runCLI(['new-command', '--option'])
  
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('expected output')
})
```

### Adding to Command Runner
Add new test to `testCommands` array in `scripts/test-all-commands.ts`:
```typescript
{
  name: 'New Command Test',
  command: ['new-command', '--help'],
  description: 'Test new command help',
  expectedOutput: ['expected', 'keywords']
}
```

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/test.yml`) runs tests automatically on:
- Push to main/develop branches
- Pull requests

Test matrix:
- **OS**: Ubuntu, macOS, Windows
- **Node**: v20, v22

## Debugging Tests

### Enable Debug Output
```bash
# Run with debug output
NODE_ENV=test DEBUG=* bun test
```

### Test Specific File
```bash
# Test single file
bun test tests/integration/cli-runner.test.ts
```

### Test Specific Case
```bash
# Test specific describe block or test
bun test -t "Agent Commands"
```

## Common Issues

### 1. CLI Not Built
```bash
# Build CLI before running integration tests
bun run build
```

### 2. Test Timeouts
Increase timeout for slow commands:
```typescript
const result = await runCLI(['slow-command'], {
  timeout: 20000 // 20 seconds
})
```

### 3. Platform Differences
Some tests may behave differently on Windows. Use platform checks:
```typescript
if (process.platform !== 'win32') {
  // Unix-specific test
}
```

## Best Practices

1. **Mock External Dependencies**: Always mock network calls, file system operations, and user prompts in unit tests

2. **Test Error Cases**: Include tests for invalid inputs, network failures, and edge cases

3. **Use Descriptive Names**: Test names should clearly describe what is being tested

4. **Keep Tests Fast**: Integration tests should complete quickly (< 1 second per test)

5. **Test User Experience**: Verify help text, error messages, and command output formatting

6. **Maintain Test Coverage**: Aim for >80% coverage on critical command logic

## Test Report

After running `bun run test:commands`, a detailed report is saved to `test-report.json`:

```json
{
  "timestamp": "2025-01-31T...",
  "summary": {
    "total": 25,
    "passed": 25,
    "failed": 0,
    "duration": 15234
  },
  "results": [...]
}
```

## Continuous Improvement

When adding new CLI features:
1. Write unit tests first (TDD approach)
2. Add integration tests for new commands
3. Update command runner script
4. Verify all tests pass before merging