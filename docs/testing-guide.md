# GhostSpeak End-to-End Testing Guide

This guide explains how to test all GhostSpeak workflows automatically using our comprehensive test suite.

## Overview

The GhostSpeak platform includes three core workflows that need to be tested:

1. **Agent Commerce Workflow** - Agent registration, service listing, and payment processing
2. **Client Workflow** - Service discovery, work orders, and escrow transactions
3. **Channel Communication** - A2A messaging and real-time communication

## Test Scripts Available

### 1. Bash Test Script (`test-all-workflows.sh`)

The most reliable and comprehensive test script. Works on any Unix-like system without additional dependencies.

```bash
# Run the bash test suite
npm run test:workflows

# Or run directly
./scripts/test-all-workflows.sh
```

**Features:**
- No dependencies required (uses only bash and standard Unix tools)
- Colored output for easy reading
- Detailed logging to `test-results/` directory
- JSON report generation
- Exit codes for CI/CD integration

### 2. Node.js Test Script (`test-workflows-simple.cjs`)

A CommonJS script that provides more programmatic control over testing.

```bash
# Run the Node.js test suite
npm run test:workflows:node

# Or run directly
node ./scripts/test-workflows-simple.cjs
```

**Features:**
- Cross-platform compatibility
- Programmatic test execution
- JSON report generation
- Detailed error tracking

### 3. TypeScript Test Script (`test-all-workflows.ts`)

An advanced test script with full type safety and enhanced features.

```bash
# Run the TypeScript test suite (requires tsx)
npm run test:workflows:ts

# Or run directly
tsx ./scripts/test-all-workflows.ts
```

**Features:**
- Type-safe test definitions
- Wallet generation and funding
- Advanced test orchestration
- Detailed performance metrics

## Test Coverage

All test scripts cover the following areas:

### Basic Connectivity Tests
- CLI help command functionality
- Version checking
- Network connectivity
- Program ID verification

### Agent Commerce Workflow Tests
- Agent listing (empty state)
- Agent registration command structure
- Marketplace listing (empty state)
- Service creation command structure

### Client Workflow Tests
- Marketplace browsing and search
- Escrow listing and management
- Escrow creation and release
- Work order processing

### Channel Communication Tests
- Channel listing and management
- Channel creation
- Message sending functionality
- A2A protocol verification

### Additional Tests
- Auction functionality
- Dispute resolution
- Governance participation
- Configuration management

## Running Tests in CI/CD

The test suite is designed to work in continuous integration environments:

### GitHub Actions

```yaml
- name: Run Workflow Tests
  run: npm run test:workflows
```

### GitLab CI

```yaml
test-workflows:
  script:
    - npm run test:workflows
```

### Jenkins

```groovy
stage('Test Workflows') {
    steps {
        sh 'npm run test:workflows'
    }
}
```

## Test Results

All test scripts generate results in the `test-results/` directory:

- `test-log-{timestamp}.txt` - Detailed test execution log
- `test-report-{timestamp}.json` - Structured test results in JSON format

### JSON Report Format

```json
{
  "timestamp": "2025-01-11T10:00:00Z",
  "environment": {
    "network": "devnet",
    "programId": "3yCZtq3dK1WDoz88kryyK7Cv6d9fpNdsbQHFbxcLe9ot",
    "rpcUrl": "https://api.devnet.solana.com"
  },
  "summary": {
    "total": 18,
    "passed": 17,
    "failed": 1,
    "successRate": "94.44%"
  },
  "results": [
    {
      "name": "CLI Help Command",
      "status": "PASSED",
      "duration": 523,
      "command": "--help"
    }
  ]
}
```

## Prerequisites

Before running tests:

1. **Build the CLI**
   ```bash
   npm run build:cli
   ```

2. **Set Environment Variables**
   Create a `.env` file in the project root:
   ```env
   GHOSTSPEAK_NETWORK=devnet
   GHOSTSPEAK_RPC_URL=https://api.devnet.solana.com
   GHOSTSPEAK_PROGRAM_ID_DEVNET=3yCZtq3dK1WDoz88kryyK7Cv6d9fpNdsbQHFbxcLe9ot
   GHOSTSPEAK_DEBUG=true
   ```

3. **Ensure Proper Permissions**
   Test scripts need to be executable:
   ```bash
   chmod +x scripts/test-*.sh
   ```

## Troubleshooting

### Common Issues

1. **CLI not found**
   - Run `npm run build:cli` first
   - Check that `packages/cli/dist/index.js` exists

2. **Permission denied**
   - Make scripts executable: `chmod +x scripts/*.sh`

3. **Environment variables not loaded**
   - Ensure `.env` file exists in project root
   - Check file permissions

4. **Old program ID detected**
   - Clear cached configuration: `rm -rf ~/.ghostspeak`
   - Verify `.env` file has correct program ID

### Debug Mode

Enable debug output by setting:
```bash
export GHOSTSPEAK_DEBUG=true
```

## Extending the Tests

To add new tests:

1. **Bash Script**: Add a new `run_test` call in the appropriate section
2. **Node.js Script**: Add a new `await runTest()` call
3. **TypeScript Script**: Add a new test function and call it in `runAllTests()`

Example:
```bash
# In bash script
run_test "New Feature Test" "feature --help" "Expected output"

# In Node.js/TypeScript
await runTest('New Feature Test', ['feature', '--help'], 'Expected output');
```

## Best Practices

1. **Run tests regularly** - Before commits and after major changes
2. **Check test reports** - Review failed tests in detail
3. **Keep tests updated** - Add tests for new features
4. **Monitor CI/CD** - Ensure tests pass in automated pipelines
5. **Clean state** - Tests assume a fresh deployment with no existing data

## Support

For issues with testing:
1. Check the test logs in `test-results/`
2. Review error messages for specific failures
3. Ensure all prerequisites are met
4. Submit issues to the GhostSpeak repository with test reports attached