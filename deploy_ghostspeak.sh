#!/bin/bash

# Deploy GhostSpeak marketplace to Solana devnet

echo "=========================================="
echo "GhostSpeak Marketplace Deployment Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

# Check Solana CLI
if ! command -v solana &> /dev/null; then
    echo -e "${RED}✗ Solana CLI not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Solana CLI found${NC}"

# Check Anchor CLI
if ! command -v anchor &> /dev/null; then
    echo -e "${RED}✗ Anchor CLI not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Anchor CLI found${NC}"

# Check wallet
WALLET="$HOME/.config/solana/id.json"
if [ ! -f "$WALLET" ]; then
    echo -e "${RED}✗ Wallet not found at $WALLET${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Wallet found${NC}"

# Set to devnet
solana config set --url devnet
echo -e "${GREEN}✓ Configured for devnet${NC}"

# Check balance
BALANCE=$(solana balance --url devnet | awk '{print $1}')
echo ""
echo "Wallet balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 5" | bc -l) )); then
    echo -e "${RED}✗ Insufficient balance. Need at least 5 SOL for deployment${NC}"
    echo "  Current balance: $BALANCE SOL"
    echo "  Run ./collect_devnet_sol.sh to collect more SOL"
    exit 1
fi

echo ""
echo "Building program..."
cd packages/core/programs/agent-marketplace || exit 1

# Build the program
if cargo build-bpf --features no-entrypoint 2>&1 | grep -q "Finished"; then
    echo -e "${GREEN}✓ Program built successfully${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

cd ../../../..

echo ""
echo "Deploying program to devnet..."
echo "Program ID: 4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP"
echo ""

# Deploy the program
DEPLOY_OUTPUT=$(solana program deploy \
    packages/core/target/deploy/ghostspeak_marketplace.so \
    --program-id packages/core/target/deploy/ghostspeak_marketplace-keypair.json \
    --url devnet \
    --keypair "$WALLET" 2>&1)

if echo "$DEPLOY_OUTPUT" | grep -q "Program Id:"; then
    echo -e "${GREEN}✓ Program deployed successfully!${NC}"
    echo "$DEPLOY_OUTPUT" | grep "Program Id:"
else
    echo -e "${RED}✗ Deployment failed${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo ""
echo "Uploading IDL to chain..."

# Upload IDL
if anchor idl init \
    --filepath target/idl/ghostspeak_marketplace.json \
    4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP \
    --provider.cluster devnet \
    --provider.wallet "$WALLET" 2>&1 | grep -q "Idl account created"; then
    echo -e "${GREEN}✓ IDL uploaded successfully${NC}"
else
    echo -e "${YELLOW}⚠ IDL may already exist or upload failed${NC}"
    echo "  Attempting to upgrade IDL..."
    
    if anchor idl upgrade \
        --filepath target/idl/ghostspeak_marketplace.json \
        4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP \
        --provider.cluster devnet \
        --provider.wallet "$WALLET" 2>&1 | grep -q "success"; then
        echo -e "${GREEN}✓ IDL upgraded successfully${NC}"
    else
        echo -e "${YELLOW}⚠ IDL upload/upgrade may have issues${NC}"
    fi
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Program deployed at: 4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP"
echo "Network: Devnet"
echo ""
echo "Next steps:"
echo "1. Run integration tests: bun run test:integration"
echo "2. Test with CLI: bun run cli:dev"
echo "3. View on explorer: https://explorer.solana.com/address/4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP?cluster=devnet"
echo ""
echo "To interact with the program:"
echo "- Register an agent: ghostspeak agent register --name 'My AI Agent' --framework eliza"
echo "- Create a listing: ghostspeak marketplace list --title 'AI Service' --price 1"
echo "- View agents: ghostspeak agent list"
echo ""