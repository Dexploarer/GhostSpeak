#!/bin/bash
#
# Mint Devnet GHOST Token
# Purpose: Create a test GHOST token on devnet with 1 billion supply
# Network: Devnet only
#

set -e

echo "🔧 Minting Devnet GHOST Token..."
echo "================================"
echo ""

# Switch to devnet
solana config set --url https://api.devnet.solana.com

# Check balance
echo "📊 Checking SOL balance..."
BALANCE=$(solana balance)
echo "Balance: $BALANCE"
echo ""

if [[ "$BALANCE" == "0 SOL" ]]; then
  echo "💰 Requesting airdrop..."
  solana airdrop 2
  echo ""
fi

# Create token mint with 9 decimals (standard for tokens)
echo "🪙 Creating GHOST token mint (9 decimals)..."
CREATE_OUTPUT=$(spl-token create-token --decimals 9 2>&1)
echo "$CREATE_OUTPUT"
TOKEN_MINT=$(echo "$CREATE_OUTPUT" | grep -o 'Creating token [A-Za-z0-9]*' | awk '{print $3}')
echo ""
echo "Token Mint: $TOKEN_MINT"
echo ""

# Create token account
echo "📦 Creating token account..."
spl-token create-account $TOKEN_MINT
echo ""

# Mint 1 billion tokens (1,000,000,000 with 9 decimals)
echo "💸 Minting 1,000,000,000 GHOST tokens..."
spl-token mint $TOKEN_MINT 1000000000
echo ""

# Get mint info
echo "ℹ️  Token Information:"
spl-token display $TOKEN_MINT
echo ""

# Save to deployment file
DEPLOYMENT_FILE="/Users/home/projects/GhostSpeak/DEVNET_DEPLOYMENT.md"
echo "📝 Saving deployment info..."

cat > $DEPLOYMENT_FILE << EOF
# GhostSpeak Devnet Deployment

**Last Updated**: $(date)
**Network**: Solana Devnet

---

## Program Deployments

### GhostSpeak Program
- **Program ID**: \`4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB\`
- **Deployment Date**: December 30, 2025
- **Deployment Signature**: \`5zdU8HdtenhgwDmeEJu2ZPrQwoG9gztHHM5Ft6URxCzTj7m4y9ZkvmVKrpvMK41skcHvh8xa7ckNuUkQwPsierJr\`
- **Status**: ✅ Active

---

## Token Deployments

### GHOST Token (Devnet Testing)
- **Mint Address**: \`$TOKEN_MINT\`
- **Decimals**: 9
- **Total Supply**: 1,000,000,000 GHOST
- **Minted**: $(date)
- **Purpose**: Devnet testing of staking, payments, and rewards
- **Network**: Devnet only

### USDC (Devnet)
- **Mint Address**: \`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU\`
- **Purpose**: Payment testing

---

## Mainnet References (Read-Only)

### GHOST Token (Mainnet - Production)
- **Mint Address**: \`DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRYJkehvpump\`
- **Decimals**: 6
- **Total Supply**: ~999.75M GHOST (immutable)
- **Note**: This is the real production token on mainnet

---

## Environment Variables

Add these to your \`.env\`:

\`\`\`bash
# Solana Network
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# GhostSpeak Program
GHOSTSPEAK_PROGRAM_ID=$GHOSTSPEAK_PROGRAM_ID_DEVNET
GHOSTSPEAK_PROGRAM_ID_DEVNET=4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB

# Tokens (Devnet)
GHOSTSPEAK_GHOST_TOKEN_MINT_DEVNET=$TOKEN_MINT
GHOSTSPEAK_GHOST_TOKEN_DECIMALS_DEVNET=9
GHOSTSPEAK_USDC_MINT_DEVNET=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Mainnet (Read-Only Reference)
GHOSTSPEAK_GHOST_TOKEN_MINT_MAINNET=DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRYJkehvpump
GHOSTSPEAK_GHOST_TOKEN_DECIMALS_MAINNET=6
\`\`\`

---

## Explorer Links

### Devnet
- [GhostSpeak Program](https://explorer.solana.com/address/4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB?cluster=devnet)
- [GHOST Token Mint](https://explorer.solana.com/address/$TOKEN_MINT?cluster=devnet)
- [USDC Mint](https://explorer.solana.com/address/4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU?cluster=devnet)

### Mainnet (Production)
- [GHOST Token](https://explorer.solana.com/address/DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRYJkehvpump)
- [DEX Screener](https://dexscreener.com/solana/e44xj7jyjxyermlqqwrpu4nekcphawfjf3ppn2uokgdb)

---

## Testing Workflow

### 1. Agent Discovery (Mainnet → Devnet)
\`\`\`bash
# Discover real x402 agents on mainnet
# Register them on devnet GhostSpeak program for testing
\`\`\`

### 2. Staking & Rewards (Devnet)
\`\`\`bash
# Use devnet GHOST token for testing staking tiers
# No real value, unlimited supply for testing
\`\`\`

### 3. Credential Issuance (Devnet)
\`\`\`bash
# Issue W3C credentials on devnet
# Test Crossmint bridge to EVM testnet
\`\`\`

---

## Important Notes

⚠️ **Devnet tokens have no value** - Use for testing only
✅ **Program is deployed** - No need to redeploy unless updating
📝 **Keep this file updated** - Document all changes here
🔐 **Never lose this info** - Commit to git immediately

EOF

echo "✅ Deployment info saved to: $DEPLOYMENT_FILE"
echo ""

# Update .env with new devnet token
echo "📝 Updating .env..."
if grep -q "GHOSTSPEAK_GHOST_TOKEN_MINT_DEVNET" /Users/home/projects/GhostSpeak/.env; then
  # Update existing
  sed -i '' "s|GHOSTSPEAK_GHOST_TOKEN_MINT_DEVNET=.*|GHOSTSPEAK_GHOST_TOKEN_MINT_DEVNET=$TOKEN_MINT|g" /Users/home/projects/GhostSpeak/.env
else
  # Add new
  echo "GHOSTSPEAK_GHOST_TOKEN_MINT_DEVNET=$TOKEN_MINT" >> /Users/home/projects/GhostSpeak/.env
fi

if grep -q "GHOSTSPEAK_GHOST_TOKEN_DECIMALS_DEVNET" /Users/home/projects/GhostSpeak/.env; then
  sed -i '' "s|GHOSTSPEAK_GHOST_TOKEN_DECIMALS_DEVNET=.*|GHOSTSPEAK_GHOST_TOKEN_DECIMALS_DEVNET=9|g" /Users/home/projects/GhostSpeak/.env
else
  echo "GHOSTSPEAK_GHOST_TOKEN_DECIMALS_DEVNET=9" >> /Users/home/projects/GhostSpeak/.env
fi

echo "✅ .env updated"
echo ""

echo "🎉 Success! Devnet GHOST token created:"
echo "   Mint: $TOKEN_MINT"
echo "   Supply: 1,000,000,000 GHOST"
echo "   Decimals: 9"
echo ""
echo "📖 View deployment info: cat DEVNET_DEPLOYMENT.md"
echo "🔍 View on explorer: https://explorer.solana.com/address/$TOKEN_MINT?cluster=devnet"
