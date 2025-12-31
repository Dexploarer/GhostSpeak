#!/bin/bash
# Add SAS environment variables to Vercel

echo "Adding SAS environment variables to Vercel..."

# SAS_PAYER_KEYPAIR
echo "Adding SAS_PAYER_KEYPAIR..."
echo "Xp7PAdcUYcddXrdkAyGMT1pVm44+JX5hGFd/J4jC+qsl/60sZUaem+UHWpFOptOUSJAIAwOkT3BlCryyPIWJyQ==" | vercel env add SAS_PAYER_KEYPAIR production
echo "Xp7PAdcUYcddXrdkAyGMT1pVm44+JX5hGFd/J4jC+qsl/60sZUaem+UHWpFOptOUSJAIAwOkT3BlCryyPIWJyQ==" | vercel env add SAS_PAYER_KEYPAIR preview
echo "Xp7PAdcUYcddXrdkAyGMT1pVm44+JX5hGFd/J4jC+qsl/60sZUaem+UHWpFOptOUSJAIAwOkT3BlCryyPIWJyQ==" | vercel env add SAS_PAYER_KEYPAIR development

# SAS_AUTHORITY_KEYPAIR
echo "Adding SAS_AUTHORITY_KEYPAIR..."
echo "Lywj74HUYBGKaMmS4krfJQpk5AkraTyxFAyjOI6XK7npxKjkWvY37iUEp+8+0rYrEuP6Acpu0eIn+56E8HJm+g==" | vercel env add SAS_AUTHORITY_KEYPAIR production
echo "Lywj74HUYBGKaMmS4krfJQpk5AkraTyxFAyjOI6XK7npxKjkWvY37iUEp+8+0rYrEuP6Acpu0eIn+56E8HJm+g==" | vercel env add SAS_AUTHORITY_KEYPAIR preview
echo "Lywj74HUYBGKaMmS4krfJQpk5AkraTyxFAyjOI6XK7npxKjkWvY37iUEp+8+0rYrEuP6Acpu0eIn+56E8HJm+g==" | vercel env add SAS_AUTHORITY_KEYPAIR development

# SAS_AUTHORIZED_SIGNER_KEYPAIR
echo "Adding SAS_AUTHORIZED_SIGNER_KEYPAIR..."
echo "8d5xjeUHVmedY+7rcihSVpbWcnoyaCWCTINiWs/yDtrETZ8D9kBlQtAeDFwjjyl0EGpKMDvr+Aq1G7XAmta+kQ==" | vercel env add SAS_AUTHORIZED_SIGNER_KEYPAIR production
echo "8d5xjeUHVmedY+7rcihSVpbWcnoyaCWCTINiWs/yDtrETZ8D9kBlQtAeDFwjjyl0EGpKMDvr+Aq1G7XAmta+kQ==" | vercel env add SAS_AUTHORIZED_SIGNER_KEYPAIR preview
echo "8d5xjeUHVmedY+7rcihSVpbWcnoyaCWCTINiWs/yDtrETZ8D9kBlQtAeDFwjjyl0EGpKMDvr+Aq1G7XAmta+kQ==" | vercel env add SAS_AUTHORIZED_SIGNER_KEYPAIR development

# SAS_API_KEY
echo "Adding SAS_API_KEY..."
echo "IGJaAXUw2CjbE8hNXnu07myYsZCoLK9swSccXhlpMBs=" | vercel env add SAS_API_KEY production
echo "IGJaAXUw2CjbE8hNXnu07myYsZCoLK9swSccXhlpMBs=" | vercel env add SAS_API_KEY preview
echo "IGJaAXUw2CjbE8hNXnu07myYsZCoLK9swSccXhlpMBs=" | vercel env add SAS_API_KEY development

# SOLANA_CLUSTER
echo "Adding SOLANA_CLUSTER..."
echo "devnet" | vercel env add SOLANA_CLUSTER production
echo "devnet" | vercel env add SOLANA_CLUSTER preview
echo "devnet" | vercel env add SOLANA_CLUSTER development

echo "✅ All environment variables added!"
echo ""
echo "Now deploy with: vercel --prod"
