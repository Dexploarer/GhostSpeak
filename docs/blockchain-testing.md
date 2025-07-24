# GhostSpeak Blockchain Testing Guide

This guide explains how to run real blockchain integration tests for the GhostSpeak protocol.

## Overview

The blockchain testing suite executes actual on-chain transactions to verify the complete functionality of the GhostSpeak protocol. Unlike the basic CLI tests, these tests:

- Deploy and interact with the actual Solana program
- Execute real transactions with SOL transfers
- Verify on-chain state changes
- Measure gas usage and performance
- Test all protocol features end-to-end

## Test Scripts

### 1. Real Blockchain Tests (`test-real-blockchain.ts`)

Executes actual blockchain transactions against a local or remote Solana cluster.

```bash
# Run against local validator
npm run test:blockchain:local

# Run against existing cluster (devnet/testnet)
npm run test:blockchain
```

**What it tests:**
- Protocol initialization
- Agent registration with on-chain accounts
- Marketplace listings creation
- Escrow transactions with real SOL
- Channel creation and messaging
- Governance proposals and voting
- Dispute resolution workflow

### 2. Integration Workflow Tests (`test-integration-workflows.ts`)

Simulates complete user workflows using the CLI with test wallets.

```bash
npm run test:workflows:integration
```

**What it tests:**
- Multi-wallet interactions
- Complete workflows from start to finish
- CLI command integration
- Wallet funding and management

## Prerequisites

### For Local Testing

1. **Install Solana CLI**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

2. **Install Anchor**
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
   ```

3. **Start Local Validator**
   ```bash
   anchor localnet
   ```

4. **Deploy Program**
   ```bash
   anchor deploy
   ```

### For Devnet/Testnet Testing

1. **Configure Network**
   ```bash
   solana config set --url https://api.devnet.solana.com
   ```

2. **Fund Wallet**
   ```bash
   solana airdrop 2
   ```

3. **Set Environment**
   ```env
   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
   ANCHOR_WALLET=~/.config/solana/id.json
   ```

## Running the Tests

### Local Blockchain Testing

```bash
# Start local validator and run tests
npm run test:blockchain:local

# Or manually:
# Terminal 1
anchor localnet

# Terminal 2
anchor deploy
npm run test:blockchain
```

### Devnet Testing

```bash
# Ensure you have SOL in your wallet
solana balance

# Run tests
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com npm run test:blockchain
```

## Test Coverage

The blockchain tests cover:

1. **Protocol Initialization**
   - Admin setup
   - Treasury configuration
   - Fee parameters

2. **Agent Management**
   - Registration with metadata
   - Profile updates
   - Status management

3. **Marketplace Operations**
   - Service listing creation
   - Price updates
   - Category management

4. **Escrow Workflow**
   - Payment creation
   - Work submission
   - Fund release
   - Fee distribution

5. **Channel Communication**
   - Encrypted channel creation
   - Message sending
   - Access control

6. **Governance**
   - Proposal creation
   - Voting mechanism
   - Execution

7. **Dispute Resolution**
   - Dispute filing
   - Evidence submission
   - Arbitration

## Test Output

### Console Output
```
🚀 GhostSpeak Blockchain Integration Tests
========================================
Network: http://localhost:8899
Program ID: 3yCZtq3dK1WDoz88kryyK7Cv6d9fpNdsbQHFbxcLe9ot

=== PROTOCOL INITIALIZATION ===

Testing: Initialize Protocol
✅ PASSED: Initialize Protocol
   Tx: 3xY9...K8jL
   Gas: 0.00234 SOL
```

### JSON Report
```json
{
  "timestamp": "2025-01-11T10:00:00Z",
  "network": "http://localhost:8899",
  "programId": "3yCZtq3dK1WDoz88kryyK7Cv6d9fpNdsbQHFbxcLe9ot",
  "totalTests": 15,
  "passed": 15,
  "failed": 0,
  "totalGasUsed": 123456789,
  "avgGasPerTx": 8230452,
  "successRate": "100.00%",
  "results": [...]
}
```

## Troubleshooting

### Common Issues

1. **Insufficient Balance**
   ```
   Error: Attempt to debit an account but found no record of a prior credit
   ```
   Solution: Airdrop more SOL to test wallets

2. **Program Not Deployed**
   ```
   Error: Program 3yCZtq... not found
   ```
   Solution: Run `anchor deploy` first

3. **Account Already Exists**
   ```
   Error: Account already initialized
   ```
   Solution: Clean state with `anchor clean` and redeploy

4. **Transaction Too Large**
   ```
   Error: Transaction too large
   ```
   Solution: Reduce batch operations or split into multiple transactions

### Debug Mode

Enable detailed logging:
```bash
RUST_LOG=solana_runtime::system_instruction_processor=trace npm run test:blockchain
```

## Gas Optimization

The tests track gas usage for each transaction. To optimize:

1. **Review High Gas Operations**
   - Check the JSON report for expensive transactions
   - Look for operations using >0.01 SOL

2. **Batch Operations**
   - Group related instructions
   - Use composite operations where possible

3. **Optimize Account Size**
   - Minimize stored data
   - Use efficient data structures

## CI/CD Integration

### GitHub Actions

```yaml
- name: Setup Solana
  uses: metaplex-foundation/actions/install-solana@v1
  with:
    version: stable

- name: Run Blockchain Tests
  run: |
    anchor build
    anchor deploy
    npm run test:blockchain
```

### Local Testing in CI

```yaml
- name: Start Validator
  run: |
    solana-test-validator &
    sleep 5

- name: Deploy and Test
  run: |
    anchor deploy --provider.cluster localnet
    npm run test:blockchain
```

## Best Practices

1. **Isolate Test Accounts**
   - Use fresh keypairs for each test run
   - Clean up PDAs between tests

2. **Handle Rate Limits**
   - Add delays for devnet testing
   - Use local validator for rapid testing

3. **Verify State Changes**
   - Always fetch and verify account data
   - Check balances before and after

4. **Error Handling**
   - Expect and handle transaction failures
   - Verify error messages match expected

5. **Performance Monitoring**
   - Track gas usage trends
   - Monitor transaction confirmation times

## Next Steps

After running blockchain tests:

1. Review gas usage in reports
2. Optimize expensive operations
3. Add more edge case tests
4. Run performance benchmarks
5. Test on mainnet-beta (with caution!)

Remember: These tests use real blockchain transactions and consume SOL (even on localnet). Always verify your wallet balance before running extensive test suites.