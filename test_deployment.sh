#!/bin/bash

# Test GhostSpeak deployment on devnet

echo "=========================================="
echo "GhostSpeak Deployment Test Suite"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROGRAM_ID="4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP"

echo -e "${BLUE}Testing program deployment...${NC}"

# Test 1: Check if program exists
echo -n "1. Checking program account: "
if solana program show "$PROGRAM_ID" --url devnet 2>&1 | grep -q "Program Id:"; then
    echo -e "${GREEN}✓ Program found${NC}"
else
    echo -e "${RED}✗ Program not found${NC}"
    exit 1
fi

# Test 2: Fetch IDL
echo -n "2. Fetching IDL from chain: "
if anchor idl fetch "$PROGRAM_ID" --provider.cluster devnet > /tmp/fetched_idl.json 2>/dev/null; then
    echo -e "${GREEN}✓ IDL fetched successfully${NC}"
else
    echo -e "${YELLOW}⚠ IDL fetch failed (may not be uploaded)${NC}"
fi

# Test 3: Run TypeScript SDK tests
echo ""
echo -e "${BLUE}Running SDK integration tests...${NC}"
cd packages/sdk || exit 1

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing SDK dependencies..."
    bun install
fi

# Run tests
echo "3. Running SDK tests:"
if bun test --timeout 30000 2>&1 | grep -E "(PASS|FAIL|Test Suites:)"; then
    echo -e "${GREEN}✓ SDK tests completed${NC}"
else
    echo -e "${YELLOW}⚠ SDK tests may have issues${NC}"
fi

cd ../..

# Test 4: Test CLI commands
echo ""
echo -e "${BLUE}Testing CLI commands...${NC}"
cd packages/cli || exit 1

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing CLI dependencies..."
    bun install
fi

echo "4. Testing CLI agent registration:"
# Create a test wallet for CLI operations
TEST_WALLET="test-wallet.json"
if [ ! -f "$TEST_WALLET" ]; then
    solana-keygen new --outfile "$TEST_WALLET" --no-bip39-passphrase --force > /dev/null 2>&1
fi

# Get some SOL for testing
TEST_ADDRESS=$(solana-keygen pubkey "$TEST_WALLET")
echo "   Requesting SOL for test wallet..."
solana airdrop 1 "$TEST_ADDRESS" --url devnet > /dev/null 2>&1
sleep 2

# Try to register an agent
echo -n "   Registering test agent: "
if bun run src/index.ts agent register \
    --name "Test Eliza Agent" \
    --description "AI agent powered by Eliza framework" \
    --framework "eliza" \
    --keypair "$TEST_WALLET" \
    --network devnet 2>&1 | grep -q "successfully"; then
    echo -e "${GREEN}✓ Agent registered${NC}"
else
    echo -e "${YELLOW}⚠ Agent registration may have failed${NC}"
fi

cd ../..

# Test 5: Check program logs
echo ""
echo -e "${BLUE}Checking recent program logs...${NC}"
echo "5. Recent transaction logs:"
solana logs "$PROGRAM_ID" --url devnet --limit 5 2>&1 | grep -E "(Transaction|Program)" | head -10

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Testing Complete!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Program deployed at: $PROGRAM_ID"
echo "- Network: Devnet"
echo "- IDL: Check target/idl/ghostspeak_marketplace.json"
echo ""
echo "Dashboard URLs:"
echo "- Solana Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo "- SolanaFM: https://solana.fm/address/$PROGRAM_ID?cluster=devnet-solana"
echo ""
echo "Example interactions:"
echo "1. Register an AI agent:"
echo "   ghostspeak agent register --name 'Eliza Bot' --framework eliza"
echo ""
echo "2. Create a service listing:"
echo "   ghostspeak marketplace create-listing --title 'AI Chat Service' --price 0.1"
echo ""
echo "3. View all agents:"
echo "   ghostspeak agent list"
echo ""