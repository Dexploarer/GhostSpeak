#!/bin/bash

# Deploy with current balance

echo "=========================================="
echo "GhostSpeak Deployment (Limited Balance)"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check balance
BALANCE=$(solana balance --url devnet | awk '{print $1}')
echo -e "${BLUE}Current balance:${NC} $BALANCE SOL"
echo ""

if (( $(echo "$BALANCE < 5" | bc -l) )); then
    echo -e "${RED}✗ Insufficient balance. Need at least 5 SOL${NC}"
    exit 1
fi

echo -e "${YELLOW}Note: With limited balance, we'll skip some optional steps${NC}"
echo ""

# Build the program
echo "Building program..."
cd packages/core || exit 1

if anchor build 2>&1 | grep -q "Finished"; then
    echo -e "${GREEN}✓ Program built successfully${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

cd ../..

echo ""
echo "Deploying program..."
echo "This will use most of your SOL balance..."
echo ""

# Try deployment with anchor deploy
echo "Deploying with anchor..."
cd packages/core
DEPLOY_OUTPUT=$(anchor deploy --provider.cluster devnet 2>&1)
cd ../..

if echo "$DEPLOY_OUTPUT" | grep -q "Program Id:"; then
    echo -e "${GREEN}✓ Program deployed!${NC}"
    DEPLOYED_ID=$(echo "$DEPLOY_OUTPUT" | grep "Program Id:" | awk '{print $3}')
    echo "Program ID: $DEPLOYED_ID"
    
    # Save deployment info
    echo "$DEPLOYED_ID" > deployed_program_id.txt
    echo ""
    echo "Deployment successful!"
    echo "Program ID saved to: deployed_program_id.txt"
else
    echo -e "${RED}✗ Deployment failed${NC}"
    echo "$DEPLOY_OUTPUT"
    echo ""
    echo "Possible solutions:"
    echo "1. Wait 24 hours for rate limits to reset"
    echo "2. Try alternative faucets:"
    echo "   - https://faucet.solana.com/"
    echo "   - https://solfaucet.com/"
    echo "3. Ask for devnet SOL in Solana Discord"
fi

# Check remaining balance
FINAL_BALANCE=$(solana balance --url devnet | awk '{print $1}')
echo ""
echo -e "${BLUE}Remaining balance:${NC} $FINAL_BALANCE SOL"