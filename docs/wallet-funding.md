# Wallet Funding Guide

This guide explains how to use GhostSpeak's robust wallet funding system that doesn't depend on unreliable devnet airdrops.

## Overview

The wallet funding system provides multiple funding strategies with automatic fallback mechanisms:

1. **Devnet Airdrop** - Tries first but with retry logic
2. **Treasury Wallet** - Falls back to a pre-funded treasury wallet
3. **Funded Wallets** - Additional pre-funded wallets for redundancy
4. **Existing Balance** - Checks if wallet already has sufficient funds

## Quick Start

### Basic Usage

```typescript
import { fundWallet, ensureMinimumBalance } from '@ghostspeak/sdk'

// Fund a wallet with 1 SOL
const result = await fundWallet(walletAddress, 1.0)

if (result.success) {
  console.log(`Funded via ${result.method}`)
  console.log(`Balance: ${result.balance} lamports`)
}

// Ensure minimum balance of 0.5 SOL
const balanceResult = await ensureMinimumBalance(walletAddress, 0.5)
```

### Advanced Usage with WalletFundingService

```typescript
import { WalletFundingService } from '@ghostspeak/sdk'

const fundingService = new WalletFundingService('https://api.devnet.solana.com')

const result = await fundingService.fundWallet(targetWallet, {
  amount: BigInt(1_000_000_000), // 1 SOL
  minAmount: BigInt(100_000_000), // Minimum 0.1 SOL
  maxRetries: 3,
  retryDelay: 2000,
  useTreasury: true,
  treasuryWallet: '/path/to/treasury-wallet.json',
  fundedWallets: [wallet1, wallet2], // Additional funded wallets
  verbose: true
})
```

## Environment Variables

Configure the funding system using these environment variables:

```bash
# Treasury wallet for funding (path or JSON array)
GHOSTSPEAK_TREASURY_WALLET_PATH=/path/to/treasury-wallet.json

# Additional funded wallets (JSON array of paths)
GHOSTSPEAK_FUNDED_WALLETS='["/path/to/wallet1.json", "/path/to/wallet2.json"]'

# RPC URL
GHOSTSPEAK_RPC_URL=https://api.devnet.solana.com
```

## Using the Fund Wallets Script

The `fund-wallets` script helps pre-fund test wallets:

### Create and Fund New Wallets

```bash
# Fund 5 wallets with 0.1 SOL each
npm run fund-wallets -- fund --count 5 --amount 0.1 --save

# Fund wallets using a treasury wallet
npm run fund-wallets -- fund --count 3 --amount 0.5 --treasury ~/.config/solana/treasury.json --save

# Verbose output
npm run fund-wallets -- fund --count 2 --amount 1.0 --verbose --save --output ./test-wallets.json
```

### Check Wallet Balance

```bash
npm run fund-wallets -- check <wallet-address>
```

### Top Up Existing Wallet

```bash
# Ensure wallet has at least 0.5 SOL
npm run fund-wallets -- top-up <wallet-address> --min 0.5

# Top up using treasury
npm run fund-wallets -- top-up <wallet-address> --min 1.0 --treasury ~/.config/solana/treasury.json
```

## Integration with Beta Testing

The beta test script automatically uses the funding service:

1. **Main Wallet Check** - Ensures the main test wallet has at least 2 SOL
2. **Bidder Wallet Funding** - Creates and funds a secondary wallet for auction testing

Example from beta test:

```typescript
// Ensure main wallet has sufficient balance
const mainWalletResult = await this.fundingService.ensureMinimumBalance(
  this.wallet.address,
  BigInt(2_000_000_000), // 2 SOL minimum
  {
    maxRetries: 3,
    useTreasury: true,
    treasuryWallet: process.env.GHOSTSPEAK_TREASURY_WALLET_PATH,
    verbose: true
  }
)

// Fund bidder wallet for auction testing
const fundingResult = await this.fundingService.fundWallet(
  this.bidderWallet.address,
  {
    amount: BigInt(1_000_000_000), // 1 SOL
    minAmount: BigInt(100_000_000), // Minimum 0.1 SOL
    // ... other options
  }
)
```

## Best Practices

### 1. Set Up a Treasury Wallet

Create a dedicated treasury wallet for testing:

```bash
# Create treasury wallet
solana-keygen new -o ~/.config/solana/ghostspeak-treasury.json

# Fund it manually on devnet
solana airdrop 10 <treasury-address> --url devnet

# Set environment variable
export GHOSTSPEAK_TREASURY_WALLET_PATH=~/.config/solana/ghostspeak-treasury.json
```

### 2. Pre-fund Test Wallets

Before running tests, pre-fund a set of test wallets:

```bash
# Create 10 pre-funded wallets
npm run fund-wallets -- fund \
  --count 10 \
  --amount 0.5 \
  --treasury ~/.config/solana/ghostspeak-treasury.json \
  --save \
  --output ./test-wallets.json

# Export for use in tests
export GHOSTSPEAK_FUNDED_WALLETS=$(cat ./test-wallets-simple.json)
```

### 3. Use Minimum Balance Checks

Instead of always requesting full amounts, check if existing balance is sufficient:

```typescript
// Only top up if needed
const result = await ensureMinimumBalance(wallet, 0.1, {
  useTreasury: true,
  treasuryWallet: process.env.GHOSTSPEAK_TREASURY_WALLET_PATH
})
```

### 4. Handle Failures Gracefully

Always check funding results and provide helpful error messages:

```typescript
const result = await fundWallet(wallet, 1.0)

if (!result.success) {
  console.error(`Funding failed: ${result.error}`)
  console.log('Tips:')
  console.log('1. Set GHOSTSPEAK_TREASURY_WALLET_PATH to a funded wallet')
  console.log('2. Pre-fund wallets using: npm run fund-wallets')
  console.log('3. Try again during off-peak hours for airdrops')
  process.exit(1)
}
```

## Troubleshooting

### Airdrop Failures

If devnet airdrops are failing:
1. Check if devnet is congested
2. Try during off-peak hours
3. Use a treasury wallet instead
4. Reduce the requested amount

### Treasury Wallet Issues

If treasury funding fails:
1. Check treasury balance: `solana balance <treasury-address> --url devnet`
2. Ensure wallet file permissions are correct
3. Verify the wallet path is absolute, not relative

### Environment Variable Issues

If funding isn't working with environment variables:
1. Ensure variables are exported: `export GHOSTSPEAK_TREASURY_WALLET_PATH=...`
2. Check JSON formatting for wallet arrays
3. Use absolute paths for wallet files

## Example: Complete Test Setup

```bash
#!/bin/bash

# 1. Create treasury wallet
solana-keygen new -o ~/.config/solana/ghostspeak-treasury.json

# 2. Fund treasury (retry if needed)
for i in {1..5}; do
  solana airdrop 10 $(solana-keygen pubkey ~/.config/solana/ghostspeak-treasury.json) --url devnet && break
  echo "Airdrop attempt $i failed, retrying..."
  sleep 5
done

# 3. Set environment variables
export GHOSTSPEAK_TREASURY_WALLET_PATH=~/.config/solana/ghostspeak-treasury.json
export GHOSTSPEAK_RPC_URL=https://api.devnet.solana.com

# 4. Pre-fund test wallets
npm run fund-wallets -- fund \
  --count 5 \
  --amount 0.5 \
  --treasury $GHOSTSPEAK_TREASURY_WALLET_PATH \
  --save \
  --output ./test-wallets.json

# 5. Export funded wallets
export GHOSTSPEAK_FUNDED_WALLETS=$(cat ./test-wallets-simple.json)

# 6. Run tests
npm run test:beta
```

This setup ensures reliable wallet funding for all your testing needs!