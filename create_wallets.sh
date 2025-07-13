#!/bin/bash

# Create multiple wallets for devnet SOL collection
# Each wallet can get 2 SOL from the faucet per request

echo "Creating multiple wallets for devnet SOL collection..."

# Create wallets directory
mkdir -p wallets

# Generate 20 wallets to collect 40 SOL total (2 SOL per wallet)
for i in {1..20}
do
    echo "Creating wallet $i..."
    solana-keygen new --outfile wallets/wallet$i.json --no-bip39-passphrase --force
done

echo "Wallets created successfully in wallets/ directory"
echo ""
echo "Next steps:"
echo "1. Use each wallet to request 2 SOL from devnet faucet"
echo "2. Transfer all SOL to the main deployer wallet"
echo ""
echo "To request SOL for each wallet, run:"
echo "for i in {1..20}; do"
echo "  solana airdrop 2 \$(solana-keygen pubkey wallets/wallet\$i.json) --url devnet"
echo "  sleep 5  # Rate limiting"
echo "done"