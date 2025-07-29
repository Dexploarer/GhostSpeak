# Integration Tests

This directory contains both mocked and real integration tests for the GhostSpeak SDK.

## Mocked Integration Tests

The standard integration tests use mocked Solana connections and SPL Token functions to ensure fast, reliable testing without network dependencies:

- `token-2022-full-integration.test.ts` - Tests Token-2022 features with mocks
- Other integration test files

Run with:
```bash
bun run test:integration
```

## Real Integration Tests

Real integration tests interact with actual Solana networks and require additional setup:

### Prerequisites

1. **Local Validator** (Recommended for development):
   ```bash
   # Install Solana CLI if not already installed
   sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
   
   # Start local validator
   solana-test-validator
   ```

2. **Or Use Devnet/Testnet**:
   ```bash
   # Set RPC URL for devnet
   export SOLANA_RPC_URL=https://api.devnet.solana.com
   ```

### Running Real Integration Tests

Real tests are skipped by default. To run them, use the `RUN_REAL_TESTS` environment variable:

```bash
# Run all real integration tests
bun run test:real

# Run only Token-2022 real tests
bun run test:real:token

# Run only confidential transfer real tests
bun run test:real:confidential

# Or manually with environment variable
RUN_REAL_TESTS=1 bun test tests/integration/token-2022-real-integration.test.ts
```

### Test Files

- **`token-2022-real-integration.test.ts`**: Tests real Token-2022 functionality including:
  - Mint creation with extensions (transfer fees, default state, etc.)
  - Token transfers with automatic fee calculation
  - Associated token account management
  - Extension detection on real mints

- **`confidential-transfer-real-integration.test.ts`**: Tests confidential transfer features:
  - Account configuration for confidential transfers
  - Deposit and withdrawal operations
  - Confidential transfers between accounts
  - ElGamal keypair generation
  - ZK proof program integration (when available)

### Important Notes

1. **Network Costs**: Real tests create actual transactions and require SOL for fees
2. **Rate Limits**: Public RPCs have rate limits; use local validator for development
3. **ZK Program**: Confidential transfer tests work best when the ZK ElGamal Proof program is deployed
4. **Test Isolation**: Each test creates its own mints and accounts to avoid conflicts

### Debugging Real Tests

If tests fail:

1. Check validator is running: `solana config get`
2. Ensure sufficient SOL balance (tests request airdrops automatically)
3. Check RPC connection: `solana cluster-version`
4. For confidential transfers, verify ZK program availability

### Environment Variables

- `RUN_REAL_TESTS=1` - Enable real integration tests
- `SOLANA_RPC_URL` - Custom RPC endpoint (defaults to localhost:8899)

## Writing New Integration Tests

When adding new integration tests:

1. **Mocked Tests**: Default approach for CI/CD and fast feedback
2. **Real Tests**: Add when testing actual Solana program behavior
3. **Use `describeReal`**: Wrap real tests to skip by default
4. **Clean Up**: Ensure tests don't leave accounts/data that affect other tests
5. **Document Prerequisites**: Note any special setup requirements