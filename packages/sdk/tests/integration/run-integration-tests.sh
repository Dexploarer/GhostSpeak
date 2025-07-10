#!/bin/bash

# Integration Test Runner for GhostSpeak Protocol
# This script runs comprehensive integration tests with proper setup and teardown

set -e

echo "🚀 GhostSpeak Integration Test Suite"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

# Function to run a test file
run_test() {
    local test_file=$1
    local test_name=$(basename "$test_file" .test.ts)
    
    echo -n "Running $test_name... "
    
    if bun test "$test_file" --timeout 60000 > "/tmp/${test_name}.log" 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo -e "${YELLOW}Error output:${NC}"
        tail -20 "/tmp/${test_name}.log"
        echo ""
        ((FAILED++))
    fi
}

# Check if Solana test validator is running
check_validator() {
    if ! solana cluster-version > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Solana test validator not running${NC}"
        echo "Starting test validator..."
        
        # Start validator in background
        solana-test-validator --reset --quiet &
        VALIDATOR_PID=$!
        
        # Wait for validator to start
        sleep 5
        
        # Verify it's running
        if ! solana cluster-version > /dev/null 2>&1; then
            echo -e "${RED}Failed to start test validator${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✓ Test validator started${NC}"
        return $VALIDATOR_PID
    else
        echo -e "${GREEN}✓ Test validator already running${NC}"
        return 0
    fi
}

# Main test execution
main() {
    echo "1. Checking environment..."
    
    # Check Bun installation
    if ! command -v bun &> /dev/null; then
        echo -e "${RED}Bun is not installed${NC}"
        exit 1
    fi
    
    # Check Solana CLI
    if ! command -v solana &> /dev/null; then
        echo -e "${RED}Solana CLI is not installed${NC}"
        exit 1
    fi
    
    # Start validator if needed
    check_validator
    VALIDATOR_PID=$?
    
    echo ""
    echo "2. Running integration tests..."
    echo ""
    
    # Run each test suite
    run_test "instruction-handlers.test.ts"
    run_test "pda-validation.test.ts"
    run_test "error-scenarios.test.ts"
    
    echo ""
    echo "3. Test Summary"
    echo "==============="
    echo -e "Passed: ${GREEN}$PASSED${NC}"
    echo -e "Failed: ${RED}$FAILED${NC}"
    echo ""
    
    # Cleanup
    if [ "$VALIDATOR_PID" -ne 0 ]; then
        echo "Stopping test validator..."
        kill $VALIDATOR_PID 2>/dev/null || true
    fi
    
    # Exit with appropriate code
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}✗ Some tests failed${NC}"
        exit 1
    fi
}

# Run with error handling
trap 'echo -e "\n${RED}Test suite interrupted${NC}"; exit 1' INT TERM

main "$@"