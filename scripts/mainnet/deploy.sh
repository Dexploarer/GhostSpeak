#!/bin/bash

###############################################################################
# GhostSpeak Mainnet Deployment Script
#
# WARNING: This script deploys to MAINNET. Use with extreme caution.
#
# Prerequisites:
# - Smart contract audit completed and all issues resolved
# - Multisig wallet configured and tested
# - All environment variables set in .env.mainnet
# - Deployment checklist completed
# - Team approval obtained
#
# Usage:
#   ./scripts/mainnet/deploy.sh [--dry-run|--execute]
#
# Examples:
#   ./scripts/mainnet/deploy.sh --dry-run    # Simulate deployment
#   ./scripts/mainnet/deploy.sh --execute    # Deploy for real
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
CLUSTER="mainnet"
DRY_RUN=false
EXECUTE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --execute)
      EXECUTE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--dry-run|--execute]"
      exit 1
      ;;
  esac
done

# Validate arguments
if [[ "$DRY_RUN" == false && "$EXECUTE" == false ]]; then
  echo -e "${RED}Error: Must specify --dry-run or --execute${NC}"
  echo "Usage: $0 [--dry-run|--execute]"
  exit 1
fi

if [[ "$DRY_RUN" == true && "$EXECUTE" == true ]]; then
  echo -e "${RED}Error: Cannot specify both --dry-run and --execute${NC}"
  exit 1
fi

###############################################################################
# Functions
###############################################################################

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║          GhostSpeak Mainnet Deployment                     ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
}

check_prerequisites() {
  log_info "Checking prerequisites..."

  # Check if Anchor is installed
  if ! command -v anchor &> /dev/null; then
    log_error "Anchor CLI not found. Please install: https://www.anchor-lang.com/docs/installation"
    exit 1
  fi

  # Check if Solana CLI is installed
  if ! command -v solana &> /dev/null; then
    log_error "Solana CLI not found. Please install: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
  fi

  # Check if Bun is installed (for TypeScript scripts)
  if ! command -v bun &> /dev/null; then
    log_error "Bun not found. Please install: https://bun.sh"
    exit 1
  fi

  # Check if audit report exists
  if [[ ! -f "$PROJECT_ROOT/docs/security/audit-report.pdf" ]]; then
    log_warning "Security audit report not found at docs/security/audit-report.pdf"
    log_warning "Proceeding anyway, but this is NOT recommended for mainnet!"
  fi

  # Check if .env.mainnet exists
  if [[ ! -f "$PROJECT_ROOT/.env.mainnet" ]]; then
    log_error ".env.mainnet file not found. Copy from .env.mainnet.example and configure."
    exit 1
  fi

  log_success "Prerequisites check passed"
}

confirm_deployment() {
  if [[ "$DRY_RUN" == true ]]; then
    log_info "Running in DRY RUN mode - no actual deployment will occur"
    return
  fi

  echo ""
  log_warning "═══════════════════════════════════════════════════════════"
  log_warning "  YOU ARE ABOUT TO DEPLOY TO MAINNET"
  log_warning "═══════════════════════════════════════════════════════════"
  echo ""
  echo "This will:"
  echo "  - Deploy the GhostSpeak program to Solana mainnet"
  echo "  - Initialize protocol accounts"
  echo "  - Set up protocol fees (if configured)"
  echo "  - Make the program publicly available"
  echo ""
  echo "Before proceeding, verify:"
  echo "  ✓ Security audit is complete and approved"
  echo "  ✓ All critical and high-priority issues are resolved"
  echo "  ✓ Mainnet checklist is complete"
  echo "  ✓ Multisig wallet is configured"
  echo "  ✓ Team has approved this deployment"
  echo "  ✓ You have sufficient SOL for deployment (~5-10 SOL)"
  echo ""

  read -p "Type 'DEPLOY TO MAINNET' to continue: " confirmation

  if [[ "$confirmation" != "DEPLOY TO MAINNET" ]]; then
    log_error "Deployment cancelled - confirmation not received"
    exit 0
  fi

  echo ""
  read -p "Are you ABSOLUTELY SURE? Type 'YES' to proceed: " final_confirmation

  if [[ "$final_confirmation" != "YES" ]]; then
    log_error "Deployment cancelled"
    exit 0
  fi
}

check_wallet() {
  log_info "Checking wallet configuration..."

  # Set cluster to mainnet
  solana config set --url mainnet-beta

  # Check wallet balance
  local balance=$(solana balance 2>&1)
  log_info "Wallet balance: $balance"

  # Parse balance (remove " SOL" suffix)
  local balance_num=$(echo "$balance" | sed 's/ SOL//')

  # Check if balance is sufficient (need at least 5 SOL)
  if (( $(echo "$balance_num < 5" | bc -l) )); then
    log_error "Insufficient balance. Need at least 5 SOL for deployment."
    log_error "Current balance: $balance_num SOL"
    exit 1
  fi

  log_success "Wallet check passed"
}

run_tests() {
  log_info "Running test suite..."

  cd "$PROJECT_ROOT"

  # Run Rust tests
  log_info "Running Rust tests..."
  if [[ "$DRY_RUN" == true ]]; then
    log_info "[DRY RUN] Would run: anchor test"
  else
    anchor test --skip-deploy || {
      log_error "Tests failed. Aborting deployment."
      exit 1
    }
  fi

  # Run TypeScript SDK tests
  log_info "Running SDK tests..."
  if [[ "$DRY_RUN" == true ]]; then
    log_info "[DRY RUN] Would run: bun test"
  else
    cd packages/sdk-typescript
    bun test || {
      log_error "SDK tests failed. Aborting deployment."
      exit 1
    }
    cd "$PROJECT_ROOT"
  fi

  log_success "All tests passed"
}

build_program() {
  log_info "Building program with verifiable build..."

  cd "$PROJECT_ROOT"

  if [[ "$DRY_RUN" == true ]]; then
    log_info "[DRY RUN] Would run: anchor build --verifiable"
    return
  fi

  # Build verifiable binary
  anchor build --verifiable || {
    log_error "Build failed. Aborting deployment."
    exit 1
  }

  # Display program hash
  local program_hash=$(sha256sum target/deploy/ghostspeak_marketplace.so | cut -d' ' -f1)
  log_info "Program hash: $program_hash"
  log_info "IMPORTANT: Save this hash for verification!"

  log_success "Build completed"
}

deploy_program() {
  log_info "Deploying program to mainnet..."

  cd "$PROJECT_ROOT"

  if [[ "$DRY_RUN" == true ]]; then
    log_info "[DRY RUN] Would run: anchor deploy --provider.cluster mainnet"
    log_info "[DRY RUN] Estimated cost: ~3-5 SOL"
    return
  fi

  # Deploy to mainnet
  anchor deploy --provider.cluster mainnet || {
    log_error "Deployment failed. Check logs for details."
    exit 1
  }

  # Extract program ID from deployment output
  local program_id=$(solana program show --programs | grep ghostspeak_marketplace | awk '{print $1}')

  if [[ -z "$program_id" ]]; then
    log_error "Could not extract program ID from deployment"
    exit 1
  fi

  log_success "Program deployed successfully!"
  log_info "Program ID: $program_id"

  # Save program ID to file
  echo "$program_id" > "$PROJECT_ROOT/.program_id_mainnet"

  log_warning "IMPORTANT: Update Anchor.toml with this program ID!"
  log_warning "IMPORTANT: Update environment variables with this program ID!"
}

verify_deployment() {
  log_info "Verifying deployment..."

  if [[ "$DRY_RUN" == true ]]; then
    log_info "[DRY RUN] Would verify program is deployed and executable"
    return
  fi

  # Get program ID
  local program_id=$(cat "$PROJECT_ROOT/.program_id_mainnet" 2>/dev/null || echo "")

  if [[ -z "$program_id" ]]; then
    log_error "Program ID not found. Cannot verify deployment."
    exit 1
  fi

  # Check program exists on mainnet
  solana program show "$program_id" || {
    log_error "Program not found on mainnet!"
    exit 1
  }

  log_success "Deployment verified"
}

set_upgrade_authority() {
  log_info "Setting upgrade authority to multisig..."

  if [[ "$DRY_RUN" == true ]]; then
    log_info "[DRY RUN] Would set upgrade authority to multisig"
    log_warning "[DRY RUN] This should be done via Squads multisig proposal!"
    return
  fi

  log_warning "Upgrade authority should be set via multisig proposal"
  log_warning "Do NOT set it directly from deployer wallet"
  log_info "See docs/deployment/multisig-setup.md for instructions"
}

initialize_protocol() {
  log_info "Initializing protocol configuration..."

  if [[ "$DRY_RUN" == true ]]; then
    log_info "[DRY RUN] Would run: bun scripts/mainnet/initialize-protocol-fees.ts"
    return
  fi

  log_warning "Protocol initialization should be done via multisig"
  log_info "Run manually: bun scripts/mainnet/initialize-protocol-fees.ts --cluster mainnet --execute"
}

update_sdk() {
  log_info "Updating SDK with mainnet program ID..."

  if [[ "$DRY_RUN" == true ]]; then
    log_info "[DRY RUN] Would update SDK package with mainnet program ID"
    return
  fi

  local program_id=$(cat "$PROJECT_ROOT/.program_id_mainnet" 2>/dev/null || echo "")

  if [[ -z "$program_id" ]]; then
    log_warning "Program ID not found. Skipping SDK update."
    return
  fi

  log_info "Program ID: $program_id"
  log_warning "Manual step required: Update SDK package.json and publish to npm"
}

post_deployment_checklist() {
  echo ""
  log_success "═══════════════════════════════════════════════════════════"
  log_success "  Deployment Complete!"
  log_success "═══════════════════════════════════════════════════════════"
  echo ""

  if [[ "$DRY_RUN" == true ]]; then
    log_info "This was a dry run. No actual deployment occurred."
    echo ""
    log_info "To deploy for real, run:"
    log_info "  ./scripts/mainnet/deploy.sh --execute"
    return
  fi

  local program_id=$(cat "$PROJECT_ROOT/.program_id_mainnet" 2>/dev/null || echo "UNKNOWN")

  echo "Program ID: $program_id"
  echo ""
  echo "Next steps (CRITICAL):"
  echo ""
  echo "  1. ✓ Save program ID to secure location"
  echo "  2. □ Update Anchor.toml with mainnet program ID"
  echo "  3. □ Update .env.mainnet with program ID"
  echo "  4. □ Set upgrade authority to multisig (via Squads proposal)"
  echo "  5. □ Initialize protocol config (via multisig)"
  echo "  6. □ Enable protocol fees (via multisig)"
  echo "  7. □ Verify all protocol accounts initialized"
  echo "  8. □ Update SDK package with mainnet program ID"
  echo "  9. □ Publish SDK to npm (@ghostspeak/sdk@mainnet)"
  echo "  10. □ Update web app environment variables"
  echo "  11. □ Deploy web app to production"
  echo "  12. □ Verify end-to-end functionality"
  echo "  13. □ Enable monitoring and alerts"
  echo "  14. □ Publish audit report"
  echo "  15. □ Announce mainnet launch"
  echo ""
  echo "Monitoring:"
  echo "  - Solana Explorer: https://explorer.solana.com/address/$program_id"
  echo "  - Grafana: https://grafana.ghostspeak.io"
  echo ""
  echo "Documentation:"
  echo "  - Deployment Checklist: docs/deployment/mainnet-checklist.md"
  echo "  - Multisig Setup: docs/deployment/multisig-setup.md"
  echo "  - Incident Response: docs/deployment/incident-response.md"
  echo ""
  log_warning "Remember: Monitor closely for the first 24 hours!"
}

###############################################################################
# Main Execution
###############################################################################

main() {
  print_header

  log_info "Deployment Mode: $(if [[ "$DRY_RUN" == true ]]; then echo "DRY RUN"; else echo "EXECUTE"; fi)"
  log_info "Cluster: $CLUSTER"
  echo ""

  # Pre-deployment checks
  check_prerequisites

  if [[ "$EXECUTE" == true ]]; then
    check_wallet
    confirm_deployment
  fi

  # Build and test
  run_tests
  build_program

  # Deploy
  if [[ "$EXECUTE" == true ]]; then
    deploy_program
    verify_deployment
    set_upgrade_authority
    initialize_protocol
    update_sdk
  fi

  # Summary
  post_deployment_checklist
}

# Run main function
main

exit 0
