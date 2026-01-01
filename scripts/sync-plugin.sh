#!/bin/bash

# Script to sync plugin-ghostspeak to its own GitHub repository
# Uses git subtree to push the plugin subdirectory to a separate repo

set -e

PLUGIN_DIR="plugin-ghostspeak"
REMOTE_NAME="plugin-remote"
REMOTE_URL="https://github.com/Ghostspeak/plugin-ghostspeak.git"
BRANCH="main"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 GhostSpeak Plugin Sync Script${NC}"
echo ""

# Check if we're in the right directory
if [ ! -d "$PLUGIN_DIR" ]; then
  echo -e "${YELLOW}❌ Error: $PLUGIN_DIR directory not found${NC}"
  echo "Run this script from the GhostSpeak monorepo root"
  exit 1
fi

# Check if remote exists, if not add it
if ! git remote get-url "$REMOTE_NAME" &> /dev/null; then
  echo -e "${BLUE}📌 Adding remote: $REMOTE_NAME${NC}"
  git remote add "$REMOTE_NAME" "$REMOTE_URL"
else
  echo -e "${GREEN}✓ Remote $REMOTE_NAME already exists${NC}"
fi

# Prepare the plugin directory for standalone publishing
echo -e "${BLUE}📦 Preparing plugin for standalone publishing...${NC}"

# Transform workspace:* dependencies to published versions
# This is handled by package.json already, but we could add a transform script here if needed

echo -e "${GREEN}✓ Plugin prepared${NC}"

# Push the plugin subdirectory to its own repo using git subtree
echo -e "${BLUE}🚀 Pushing $PLUGIN_DIR to $REMOTE_NAME/$BRANCH...${NC}"

# First, make sure the plugin directory is committed in the monorepo
if ! git diff --quiet HEAD -- "$PLUGIN_DIR"; then
  echo -e "${YELLOW}⚠️  Uncommitted changes in $PLUGIN_DIR${NC}"
  echo "Please commit your changes first:"
  echo "  git add $PLUGIN_DIR"
  echo "  git commit -m \"your message\""
  exit 1
fi

# Push using git subtree
git subtree push --prefix="$PLUGIN_DIR" "$REMOTE_NAME" "$BRANCH"

echo ""
echo -e "${GREEN}✅ Successfully synced plugin to separate repository!${NC}"
echo -e "${BLUE}📍 Repository: $REMOTE_URL${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Visit https://github.com/Ghostspeak/plugin-ghostspeak"
echo "  2. Verify the code looks correct"
echo "  3. Publish to npm: cd plugin-ghostspeak && npm publish"
echo ""
