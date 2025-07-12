# GhostSpeak CLI Troubleshooting Guide

## Timeout Issues

### Channel Creation Hanging

If channel creation hangs or times out, this is usually due to:

1. **Network Issues**
   - Check your internet connection
   - Try pinging the RPC endpoint: `curl https://api.devnet.solana.com`
   - Consider using a different RPC endpoint

2. **Blockchain Congestion**
   - The Solana network might be congested
   - Wait a few minutes and try again
   - Check [Solana Status](https://status.solana.com/) for network issues

3. **Insufficient Balance**
   - Ensure you have enough SOL for transaction fees
   - Channel creation requires approximately 0.01 SOL

### Solutions

#### Quick Fixes

```bash
# Check your balance
ghostspeak wallet balance

# Use a different RPC endpoint
export SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Increase timeout (if configurable)
export GHOSTSPEAK_TIMEOUT=60000  # 60 seconds
```

#### Advanced Solutions

1. **Use a Premium RPC Endpoint**
   ```bash
   # Example with Helius
   export SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY
   ```

2. **Check Network Diagnostics**
   ```bash
   # Test RPC latency
   time curl -X POST https://api.devnet.solana.com \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
   ```

3. **Clear Local Cache**
   ```bash
   # Remove any cached SDK modules
   rm -rf node_modules/.cache
   rm -rf ~/.ghostspeak/cache
   ```

### Error Messages

#### "Operation timed out after 30 seconds"

This means the blockchain operation didn't complete within the timeout period. The operation might still succeed on-chain. Check the transaction on Solana Explorer.

#### "Network connection error"

This indicates a problem reaching the RPC endpoint. Solutions:
- Check your internet connection
- Try a different RPC endpoint
- Check if you're behind a firewall or proxy

#### "SDK initialization timed out"

This is rare but can happen if:
- The SDK files are corrupted
- File system is slow or full
- Anti-virus is blocking file access

Try reinstalling the CLI:
```bash
npm uninstall -g @ghostspeak/cli
npm install -g @ghostspeak/cli
```

### Timeout Configuration

The CLI uses these default timeouts:

- Channel Creation: 30 seconds
- Transaction Sending: 20 seconds
- Account Fetching: 10 seconds
- General RPC Calls: 15 seconds
- SDK Initialization: 5 seconds

These are designed to work well with most network conditions. If you consistently experience timeouts, consider using a dedicated RPC endpoint.

### Getting Help

If you continue to experience issues:

1. Check the debug logs:
   ```bash
   export DEBUG=ghostspeak:*
   ghostspeak channel create "My Channel"
   ```

2. Report issues on GitHub with:
   - The exact command you ran
   - The error message
   - Your network environment (country, ISP)
   - RPC endpoint you're using

3. Join our Discord for community support