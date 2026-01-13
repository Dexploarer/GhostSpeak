#!/bin/bash
# Configure Telegram Media Generation for Allowlist Mode
# This script sets up environment variables in Vercel for media permissions

set -e

echo "🔒 Configuring Telegram Media Allowlist Mode"
echo ""

# Check if vercel CLI is available
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install it with: npm i -g vercel"
    exit 1
fi

echo "Setting environment variables in Vercel..."
echo ""

# Set media mode to allowlist
echo "📝 Setting TELEGRAM_MEDIA_MODE=allowlist"
vercel env add TELEGRAM_MEDIA_MODE production <<< "allowlist"

# Set allowlist with @the_dexploarer
echo "📝 Setting TELEGRAM_MEDIA_ALLOWLIST=the_dexploarer"
vercel env add TELEGRAM_MEDIA_ALLOWLIST production <<< "the_dexploarer"

echo ""
echo "✅ Environment variables configured!"
echo ""
echo "📋 Configuration Summary:"
echo "   Mode: allowlist"
echo "   Allowed Users: @the_dexploarer (unlimited images)"
echo "   Everyone Else: Denied"
echo ""
echo "🚀 Next Steps:"
echo "   1. Deploy to Vercel: git push origin main"
echo "   2. Or redeploy: vercel --prod"
echo ""
echo "💡 To add more users later:"
echo "   vercel env rm TELEGRAM_MEDIA_ALLOWLIST production"
echo "   vercel env add TELEGRAM_MEDIA_ALLOWLIST production"
echo "   (Enter comma-separated usernames: the_dexploarer,alice,bob)"
echo ""
