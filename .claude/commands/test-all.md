# Run All Tests with Intelligent Analysis

Run the complete test suite across all packages and provide intelligent failure analysis.

## What This Command Does

1. Runs `bun test` from the monorepo root
2. Collects test results from all packages
3. Analyzes failures and provides actionable insights
4. Suggests fixes for common issues

## Usage

```bash
/test-all
```

## Test Coverage

This command runs tests for:
- **SDK** (`packages/sdk-typescript/tests/`)
  - Unit tests for all modules
  - Integration tests for agent lifecycle

- **CLI** (`packages/cli/tests/`)
  - Command execution tests
  - Configuration tests

- **Web** (`apps/web/__tests__/`)
  - React component tests
  - API route tests
  - Convex function tests

- **Programs** (`programs/tests/`)
  - Mollusk unit tests (if available)
  - Anchor integration tests (if anchor test works)

## Failure Analysis

When tests fail, the command will:

1. **Categorize failures** by type:
   - Type errors
   - Runtime errors
   - Assertion failures
   - Timeout issues

2. **Identify common patterns**:
   - Missing dependencies
   - Environment variable issues
   - Build artifacts missing
   - RPC connection failures

3. **Suggest fixes**:
   - Build missing packages
   - Set required environment variables
   - Update dependencies
   - Increase timeouts

## Example Output

```
Running tests across monorepo...

✅ SDK Tests: 45 passed
✅ CLI Tests: 23 passed
❌ Web Tests: 12 passed, 3 failed
✅ Programs Tests: Skipped (no Solana validator running)

Failed Tests Analysis:

1. apps/web/__tests__/auth-sessions.test.ts
   Error: Cannot find module '@ghostspeak/sdk'
   Fix: Run `cd packages/sdk-typescript && bun run build`

2. apps/web/__tests__/convex-integration.test.ts
   Error: NEXT_PUBLIC_CONVEX_URL is not defined
   Fix: Add NEXT_PUBLIC_CONVEX_URL to apps/web/.env.local

3. apps/web/__tests__/wallet-connection.test.ts
   Timeout: Test exceeded 5000ms
   Fix: Increase timeout or mock wallet adapter

Suggested actions:
1. Build SDK: cd packages/sdk-typescript && bun run build
2. Set environment variables in apps/web/.env.local
3. Review timeout configuration in failing tests
```

## Related Commands

- `/build-check` - Verify builds before running tests
- `/context-load testing` - Load testing patterns and best practices
