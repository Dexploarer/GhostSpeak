#!/bin/bash

# Collect devnet SOL from faucet using multiple wallets

echo "Starting devnet SOL collection process..."
echo "This will take approximately 2-3 minutes due to rate limiting"
echo ""

# Check if main wallet exists
MAIN_WALLET="$HOME/.config/solana/id.json"
if [ ! -f "$MAIN_WALLET" ]; then
    echo "Main wallet not found at $MAIN_WALLET"
    echo "Creating main deployment wallet..."
    solana-keygen new --outfile "$MAIN_WALLET" --no-bip39-passphrase
fi

# Get main wallet address
MAIN_ADDRESS=$(solana-keygen pubkey "$MAIN_WALLET")
echo "Main deployment wallet: $MAIN_ADDRESS"
echo ""

# Set Solana to use devnet
solana config set --url devnet

# Request SOL for each wallet
echo "Requesting SOL from devnet faucet..."
TOTAL_SOL=0
SUCCESS_COUNT=0

for i in {1..20}
do
    WALLET_FILE="wallets/wallet$i.json"
    if [ -f "$WALLET_FILE" ]; then
        WALLET_ADDRESS=$(solana-keygen pubkey "$WALLET_FILE")
        echo -n "Wallet $i ($WALLET_ADDRESS): "
        
        # Try to airdrop
        if solana airdrop 2 "$WALLET_ADDRESS" --url devnet 2>/dev/null; then
            echo "✓ 2 SOL received"
            ((SUCCESS_COUNT++))
            TOTAL_SOL=$((TOTAL_SOL + 2))
        else
            echo "✗ Airdrop failed (rate limited or other error)"
        fi
        
        # Wait to avoid rate limiting
        sleep 5
    fi
done

echo ""
echo "Airdrop complete. Successfully received SOL in $SUCCESS_COUNT wallets"
echo "Total SOL collected: $TOTAL_SOL"
echo ""

# Transfer all SOL to main wallet
echo "Transferring all SOL to main deployment wallet..."
TRANSFER_COUNT=0

for i in {1..20}
do
    WALLET_FILE="wallets/wallet$i.json"
    if [ -f "$WALLET_FILE" ]; then
        WALLET_ADDRESS=$(solana-keygen pubkey "$WALLET_FILE")
        
        # Check balance
        BALANCE=$(solana balance "$WALLET_ADDRESS" --url devnet 2>/dev/null | awk '{print $1}')
        
        if [ ! -z "$BALANCE" ] && [ "$BALANCE" != "0" ]; then
            # Leave 0.001 SOL for transaction fees
            TRANSFER_AMOUNT=$(echo "$BALANCE - 0.001" | bc)
            
            if (( $(echo "$TRANSFER_AMOUNT > 0" | bc -l) )); then
                echo -n "Transferring $TRANSFER_AMOUNT SOL from wallet $i: "
                
                if solana transfer "$MAIN_ADDRESS" "$TRANSFER_AMOUNT" \
                    --from "$WALLET_FILE" \
                    --url devnet \
                    --allow-unfunded-recipient \
                    --fee-payer "$WALLET_FILE" 2>/dev/null; then
                    echo "✓ Success"
                    ((TRANSFER_COUNT++))
                else
                    echo "✗ Failed"
                fi
            fi
        fi
    fi
done

echo ""
echo "Transfer complete. Transferred from $TRANSFER_COUNT wallets"
echo ""

# Check final balance
FINAL_BALANCE=$(solana balance "$MAIN_ADDRESS" --url devnet 2>/dev/null | awk '{print $1}')
echo "Final balance in main wallet: $FINAL_BALANCE SOL"
echo ""

if (( $(echo "$FINAL_BALANCE >= 30" | bc -l) )); then
    echo "✓ Successfully collected sufficient SOL for deployment!"
else
    echo "⚠ Warning: Balance is less than 30 SOL. You may need to:"
    echo "  1. Wait and try again later"
    echo "  2. Use additional wallets"
    echo "  3. Try different devnet faucets"
fi