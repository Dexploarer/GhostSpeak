#!/bin/bash

# Script to sync SDK, CLI, and Plugin to their own GitHub repositories
# Uses git subtree to push subdirectories to separate repos

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 GhostSpeak Repository Sync Script${NC}"
echo ""

# Package configurations
declare -A PACKAGES=(
    ["sdk"]="packages/sdk-typescript|sdk-remote|https://github.com/Ghostspeak/sdk.git"
    ["cli"]="packages/cli|cli-remote|https://github.com/Ghostspeak/cli.git"
    ["plugin"]="plugin-ghostspeak|plugin-remote|https://github.com/Ghostspeak/plugin-ghostspeak.git"
)

BRANCH="main"

# Function to sync a package
sync_package() {
    local name=$1
    local config=${PACKAGES[$name]}

    IFS='|' read -r dir remote_name remote_url <<< "$config"

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📦 Syncing: $name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Check if directory exists
    if [ ! -d "$dir" ]; then
        echo -e "${RED}❌ Error: $dir directory not found${NC}"
        return 1
    fi

    # Check if remote exists, if not add it
    if ! git remote get-url "$remote_name" &> /dev/null; then
        echo -e "${BLUE}📌 Adding remote: $remote_name${NC}"
        git remote add "$remote_name" "$remote_url"
    else
        echo -e "${GREEN}✓ Remote $remote_name already exists${NC}"
    fi

    # Check for uncommitted changes
    if ! git diff --quiet HEAD -- "$dir"; then
        echo -e "${YELLOW}⚠️  Uncommitted changes in $dir${NC}"
        echo "Please commit your changes first:"
        echo "  git add $dir"
        echo "  git commit -m \"your message\""
        return 1
    fi

    # Push using git subtree
    echo -e "${BLUE}🚀 Pushing $dir to $remote_name/$BRANCH...${NC}"
    git subtree push --prefix="$dir" "$remote_name" "$BRANCH"

    echo -e "${GREEN}✅ Successfully synced $name!${NC}"
    echo ""
}

# Parse command line arguments
if [ $# -eq 0 ]; then
    # No arguments - sync all packages
    echo -e "${YELLOW}Syncing all packages...${NC}"
    echo ""

    for package in "${!PACKAGES[@]}"; do
        sync_package "$package"
    done
else
    # Sync specific package(s)
    for package in "$@"; do
        if [ -z "${PACKAGES[$package]}" ]; then
            echo -e "${RED}❌ Unknown package: $package${NC}"
            echo "Available packages: ${!PACKAGES[@]}"
            exit 1
        fi
        sync_package "$package"
    done
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Repository sync complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Repositories:${NC}"
echo "  📦 SDK:    https://github.com/Ghostspeak/sdk"
echo "  💻 CLI:    https://github.com/Ghostspeak/cli"
echo "  🔌 Plugin: https://github.com/Ghostspeak/plugin-ghostspeak"
echo ""
