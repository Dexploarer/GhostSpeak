#!/bin/bash
# Fix Vercel environment variables by removing embedded newlines

set -e

echo "🔧 Fixing Vercel environment variables..."
echo ""
echo "📝 Run these commands manually to update environment variables:"
echo ""

cat << 'EOF'
# 1. Update NEXT_PUBLIC_CONVEX_URL
vercel env rm NEXT_PUBLIC_CONVEX_URL production --yes
echo "https://enduring-porpoise-79.convex.cloud" | vercel env add NEXT_PUBLIC_CONVEX_URL production

# 2. Update AI_GATEWAY_API_KEY
vercel env rm AI_GATEWAY_API_KEY production --yes
echo "vck_6hYVH1SwcUG9KIfIN8edOJ62LTqgCALeAEdYXdFtbTo7kAzstV18oFLD" | vercel env add AI_GATEWAY_API_KEY production

# 3. Update NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID
vercel env rm NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID production --yes
echo "4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB" | vercel env add NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID production

# 4. Update NEXT_PUBLIC_GHOST_TOKEN_DECIMALS
vercel env rm NEXT_PUBLIC_GHOST_TOKEN_DECIMALS production --yes
echo "9" | vercel env add NEXT_PUBLIC_GHOST_TOKEN_DECIMALS production

# 5. Update NEXT_PUBLIC_GHOST_TOKEN_MINT
vercel env rm NEXT_PUBLIC_GHOST_TOKEN_MINT production --yes
echo "DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump" | vercel env add NEXT_PUBLIC_GHOST_TOKEN_MINT production

# 6. Update NEXT_PUBLIC_JUPITER_API_KEY
vercel env rm NEXT_PUBLIC_JUPITER_API_KEY production --yes
echo "d81d06c5-a4a6-4ca9-8f5d-57fd34925c5f" | vercel env add NEXT_PUBLIC_JUPITER_API_KEY production

# 7. Update NEXT_PUBLIC_PAYAI_FACILITATOR_ADDRESS
vercel env rm NEXT_PUBLIC_PAYAI_FACILITATOR_ADDRESS production --yes
echo "2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4" | vercel env add NEXT_PUBLIC_PAYAI_FACILITATOR_ADDRESS production

# 8. Update NEXT_PUBLIC_SOLANA_NETWORK
vercel env rm NEXT_PUBLIC_SOLANA_NETWORK production --yes
echo "mainnet-beta" | vercel env add NEXT_PUBLIC_SOLANA_NETWORK production

# 9. Update NEXT_PUBLIC_SOLANA_RPC_URL
vercel env rm NEXT_PUBLIC_SOLANA_RPC_URL production --yes
echo "https://mainnet.helius-rpc.com/?api-key=6be013f8-b6f7-4599-b4ec-02198d5ff34e" | vercel env add NEXT_PUBLIC_SOLANA_RPC_URL production

# 10. Redeploy
vercel --prod
EOF

echo ""
echo "⚠️  NOTE: Copy and paste these commands one at a time, or run them all via:"
echo "   bash scripts/fix-env-vars.sh | bash"
