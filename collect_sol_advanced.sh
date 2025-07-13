#!/bin/bash

# Advanced SOL collection script with multiple strategies

echo "=========================================="
echo "Advanced Devnet SOL Collection"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Main wallet
MAIN_WALLET="$HOME/.config/solana/id.json"
MAIN_ADDRESS=$(solana-keygen pubkey "$MAIN_WALLET")

echo -e "${BLUE}Main wallet:${NC} $MAIN_ADDRESS"
CURRENT_BALANCE=$(solana balance --url devnet | awk '{print $1}')
echo -e "${BLUE}Current balance:${NC} $CURRENT_BALANCE SOL"
echo ""

# Strategy 1: Try different amounts on main wallet
echo -e "${YELLOW}Strategy 1: Testing different airdrop amounts...${NC}"
for amount in 5 4 3 2 1; do
    echo -n "Trying $amount SOL: "
    if solana airdrop $amount --url devnet 2>/dev/null; then
        echo -e "${GREEN}✓ Success!${NC}"
        break
    else
        echo -e "${RED}✗ Failed${NC}"
    fi
    sleep 2
done

echo ""
echo -e "${YELLOW}Strategy 2: Using existing wallets with longer delays...${NC}"

# Try unused wallets with longer delays
SUCCESSFUL_WALLETS=0
for i in {3..20}; do
    WALLET_FILE="wallets/wallet$i.json"
    if [ -f "$WALLET_FILE" ]; then
        WALLET_ADDRESS=$(solana-keygen pubkey "$WALLET_FILE")
        BALANCE=$(solana balance "$WALLET_ADDRESS" --url devnet 2>/dev/null | awk '{print $1}')
        
        # Only try if wallet is empty
        if [ "$BALANCE" = "0" ]; then
            echo -n "Wallet $i: "
            
            # Try smaller amounts first
            for amount in 2 1; do
                if solana airdrop $amount "$WALLET_ADDRESS" --url devnet 2>/dev/null; then
                    echo -e "${GREEN}✓ Got $amount SOL${NC}"
                    ((SUCCESSFUL_WALLETS++))
                    sleep 10  # Longer delay
                    break
                fi
            done
            
            if [ $SUCCESSFUL_WALLETS -eq 0 ]; then
                echo -e "${RED}✗ Failed${NC}"
            fi
            
            # Stop if we've been successful with 3 wallets
            if [ $SUCCESSFUL_WALLETS -ge 3 ]; then
                break
            fi
        fi
    fi
done

echo ""
echo -e "${YELLOW}Strategy 3: Creating fresh wallets...${NC}"

# Create a few new wallets
mkdir -p wallets/batch2
for i in {1..5}; do
    NEW_WALLET="wallets/batch2/wallet$i.json"
    if [ ! -f "$NEW_WALLET" ]; then
        solana-keygen new --outfile "$NEW_WALLET" --no-bip39-passphrase --force >/dev/null 2>&1
        NEW_ADDRESS=$(solana-keygen pubkey "$NEW_WALLET")
        echo -n "New wallet $i ($NEW_ADDRESS): "
        
        # Try airdrop
        if solana airdrop 1 "$NEW_ADDRESS" --url devnet 2>/dev/null; then
            echo -e "${GREEN}✓ 1 SOL${NC}"
        else
            echo -e "${RED}✗ Failed${NC}"
        fi
        
        sleep 15  # Even longer delay for new wallets
    fi
done

echo ""
echo -e "${YELLOW}Consolidating all SOL to main wallet...${NC}"

# Transfer from all wallets
TOTAL_TRANSFERRED=0
for wallet_dir in wallets wallets/batch2; do
    if [ -d "$wallet_dir" ]; then
        for wallet in "$wallet_dir"/*.json; do
            if [ -f "$wallet" ]; then
                WALLET_ADDRESS=$(solana-keygen pubkey "$wallet")
                BALANCE=$(solana balance "$WALLET_ADDRESS" --url devnet 2>/dev/null | awk '{print $1}')
                
                if [ ! -z "$BALANCE" ] && (( $(echo "$BALANCE > 0.002" | bc -l) )); then
                    TRANSFER_AMOUNT=$(echo "$BALANCE - 0.001" | bc)
                    
                    echo -n "Transferring $TRANSFER_AMOUNT SOL from $(basename $wallet): "
                    if solana transfer "$MAIN_ADDRESS" "$TRANSFER_AMOUNT" \
                        --from "$wallet" \
                        --url devnet \
                        --allow-unfunded-recipient \
                        --fee-payer "$wallet" 2>/dev/null; then
                        echo -e "${GREEN}✓${NC}"
                        TOTAL_TRANSFERRED=$(echo "$TOTAL_TRANSFERRED + $TRANSFER_AMOUNT" | bc)
                    else
                        echo -e "${RED}✗${NC}"
                    fi
                fi
            fi
        done
    fi
done

echo ""
echo "=========================================="
FINAL_BALANCE=$(solana balance --url devnet | awk '{print $1}')
echo -e "${BLUE}Final balance:${NC} $FINAL_BALANCE SOL"
echo -e "${BLUE}Total transferred:${NC} $TOTAL_TRANSFERRED SOL"
echo ""

if (( $(echo "$FINAL_BALANCE >= 30" | bc -l) )); then
    echo -e "${GREEN}✓ Sufficient balance for deployment!${NC}"
else
    NEEDED=$(echo "30 - $FINAL_BALANCE" | bc)
    echo -e "${YELLOW}Still need $NEEDED more SOL${NC}"
    echo ""
    echo "Additional strategies to try:"
    echo "1. Wait 24 hours and run this script again"
    echo "2. Try from a different IP address (VPN/proxy)"
    echo "3. Use alternative faucets:"
    echo "   - https://faucet.solana.com/"
    echo "   - https://solfaucet.com/"
    echo "   - QuickNode faucet (requires account)"
    echo "4. Ask in Solana Discord #devnet-faucet channel"
fi