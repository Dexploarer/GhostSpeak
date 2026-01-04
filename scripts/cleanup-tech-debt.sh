#!/usr/bin/env bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 GhostSpeak Monorepo Tech Debt Cleanup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Confirm before proceeding
echo -e "${YELLOW}This script will remove the following:${NC}"
echo "  - .DS_Store files"
echo "  - Legacy Caisper page (page-legacy.tsx)"
echo "  - Outdated SAS documentation (9 files)"
echo "  - Test result files (2 files)"
echo "  - Outdated SDK documentation (8 files)"
echo "  - Outdated root documentation (3 files)"
echo ""
echo -e "${YELLOW}Total files to delete: ~23 files${NC}"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Cleanup cancelled.${NC}"
    exit 1
fi

# Counter for deleted files
DELETED=0

# 1. Remove .DS_Store files
echo -e "${BLUE}[1/6] Removing .DS_Store files...${NC}"
DS_STORE_COUNT=$(find . -name ".DS_Store" | wc -l | tr -d ' ')
if [ "$DS_STORE_COUNT" -gt 0 ]; then
    find . -name ".DS_Store" -delete
    echo -e "${GREEN}  ✓ Removed $DS_STORE_COUNT .DS_Store files${NC}"
    DELETED=$((DELETED + DS_STORE_COUNT))
else
    echo -e "${GREEN}  ✓ No .DS_Store files found${NC}"
fi

# 2. Remove legacy Caisper page
echo -e "${BLUE}[2/6] Removing legacy Caisper page...${NC}"
if [ -f "packages/web/app/caisper/page-legacy.tsx" ]; then
    rm -f packages/web/app/caisper/page-legacy.tsx
    echo -e "${GREEN}  ✓ Removed page-legacy.tsx${NC}"
    DELETED=$((DELETED + 1))
else
    echo -e "${GREEN}  ✓ File already removed${NC}"
fi

# 3. Remove outdated SAS documentation
echo -e "${BLUE}[3/6] Removing SAS documentation...${NC}"
SAS_FILES=(
    "packages/web/SAS_ARCHITECTURE_DECISION.md"
    "packages/web/SAS_CONVEX_INTEGRATION_COMPLETE.md"
    "packages/web/SAS_DATABASE_INTEGRATION_SUCCESS.md"
    "packages/web/SAS_DEPLOYMENT_STATUS.md"
    "packages/web/SAS_DEPLOYMENT_SUCCESS.md"
    "packages/web/SAS_EDGE_DEPLOYMENT.md"
    "packages/web/SAS_FINAL_SUMMARY.md"
    "packages/web/SAS_INTEGRATION_GUIDE.md"
    "packages/web/SAS_INTEGRATION_STATUS.md"
)
SAS_DELETED=0
for file in "${SAS_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        SAS_DELETED=$((SAS_DELETED + 1))
    fi
done
echo -e "${GREEN}  ✓ Removed $SAS_DELETED SAS documentation files${NC}"
DELETED=$((DELETED + SAS_DELETED))

# 4. Remove test results
echo -e "${BLUE}[4/6] Removing test results...${NC}"
TEST_FILES=(
    "packages/web/app/api/v1/API_TEST_RESULTS.md"
    "packages/web/app/api/mcp/HTTP_TEST_RESULTS.md"
)
TEST_DELETED=0
for file in "${TEST_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        TEST_DELETED=$((TEST_DELETED + 1))
    fi
done
echo -e "${GREEN}  ✓ Removed $TEST_DELETED test result files${NC}"
DELETED=$((DELETED + TEST_DELETED))

# 5. Remove outdated SDK docs
echo -e "${BLUE}[5/6] Removing outdated SDK docs...${NC}"
SDK_FILES=(
    "packages/sdk-typescript/CODAMA_QUIRKS.md"
    "packages/sdk-typescript/DEVNET_GHOST_TOKEN.md"
    "packages/sdk-typescript/DEVNET_TESTING_GUIDE.md"
    "packages/sdk-typescript/OPTIMIZATIONS.md"
    "packages/sdk-typescript/docs/privacy-roadmap.md"
    "packages/sdk-typescript/docs/SDK-VERIFICATION-REPORT.md"
    "packages/sdk-typescript/docs/VULNERABILITY_ANALYSIS.md"
    "packages/sdk-typescript/.github/PULL_REQUEST_TEMPLATE.md"
)
SDK_DELETED=0
for file in "${SDK_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        SDK_DELETED=$((SDK_DELETED + 1))
    fi
done
echo -e "${GREEN}  ✓ Removed $SDK_DELETED SDK documentation files${NC}"
DELETED=$((DELETED + SDK_DELETED))

# 6. Remove outdated root docs
echo -e "${BLUE}[6/6] Removing outdated root docs...${NC}"
ROOT_FILES=(
    "GHOST_AMA_GUIDE.md"
    "REPOSITORY_STRUCTURE.md"
    "docs/SEPARATE_REPOS_SETUP.md"
)
ROOT_DELETED=0
for file in "${ROOT_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        ROOT_DELETED=$((ROOT_DELETED + 1))
    fi
done
echo -e "${GREEN}  ✓ Removed $ROOT_DELETED root documentation files${NC}"
DELETED=$((DELETED + ROOT_DELETED))

# Summary
echo ""
echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo -e "${GREEN}Total files removed: $DELETED${NC}"
echo ""

# Git status check
echo -e "${BLUE}Git Status:${NC}"
git status --short | head -20
echo ""

# Next steps
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "  1. Review deleted files: git status"
echo "  2. Build all packages: bun run build:all"
echo "  3. Run tests: bun run test:all"
echo "  4. Commit changes: git add -A && git commit -m 'chore: clean up tech debt'"
echo ""
echo -e "${BLUE}For full audit report, see: TECH_DEBT_AUDIT_2026-01-03.md${NC}"
