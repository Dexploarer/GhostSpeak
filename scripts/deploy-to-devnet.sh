#!/bin/bash
# Deploy GhostSpeak to devnet

set -e

echo "=== DEPLOYING GHOSTSPEAK TO DEVNET ==="
echo ""

# Check current wallet
WALLET=$(solana address)
echo "Deploying wallet: $WALLET"

# Check balance
BALANCE=$(solana balance)
echo "Balance: $BALANCE"

# Build the program
echo ""
echo "Building program..."
anchor build --skip-lint

# Deploy to devnet
echo ""
echo "Deploying to devnet..."
echo "Program ID: 5PVu8KEhTJEJnA4rNUgY6qHZXuhMakRitnXWtFJnxBAG"
echo ""

# Since the program is already deployed, we need to upgrade it
anchor upgrade target/deploy/ghostspeak_marketplace.so \
  --program-id 5PVu8KEhTJEJnA4rNUgY6qHZXuhMakRitnXWtFJnxBAG \
  --provider.cluster devnet

echo ""
echo "Deployment complete!"