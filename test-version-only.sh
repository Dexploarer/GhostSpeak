#!/bin/bash

echo "🧪 Testing GhostSpeak CLI Version"
echo "================================="

# Check if CLI exists
if [ ! -f "packages/cli/dist/index.js" ]; then
    echo "❌ CLI not found at packages/cli/dist/index.js"
    echo "Build the CLI first: cd packages/cli && npm run build"
    exit 1
fi

echo "✅ CLI file found"
echo ""

# Test version command
echo "📝 Running: node packages/cli/dist/index.js --version"
echo "─────────────────────────────────────────────────────"

node packages/cli/dist/index.js --version

echo ""
echo "📊 Version test completed"