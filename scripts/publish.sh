#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Publishing GhostSpeak packages to npm${NC}"
echo ""

# Function to publish a package
publish_package() {
    local package_name=$1
    local package_dir=$2
    
    echo -e "${YELLOW}📦 Publishing ${package_name}...${NC}"
    
    cd "$package_dir" || exit 1
    
    # Build the package
    echo "Building ${package_name}..."
    npm run build
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Build failed for ${package_name}${NC}"
        exit 1
    fi
    
    # Publish to npm
    echo "Publishing to npm..."
    npm publish --access public
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Successfully published ${package_name}${NC}"
    else
        echo -e "${RED}❌ Failed to publish ${package_name}${NC}"
        exit 1
    fi
    
    echo ""
}

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Publish SDK first (CLI depends on it)
publish_package "@ghostspeak/sdk" "$ROOT_DIR/packages/sdk-typescript"

# Wait a moment for npm to propagate
echo "Waiting for npm to propagate the SDK package..."
sleep 5

# Publish CLI
publish_package "@ghostspeak/cli" "$ROOT_DIR/packages/cli"

echo -e "${GREEN}🎉 All packages published successfully!${NC}"
echo ""
echo "Users can now install with:"
echo "  npm install -g @ghostspeak/cli"
echo "  npm install @ghostspeak/sdk"
echo ""
echo "Or use the short command:"
echo "  gs sdk install"