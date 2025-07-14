# 💧 GhostSpeak Faucet - Developer Guide

The GhostSpeak CLI includes a comprehensive faucet system that helps developers get SOL tokens for testing on Solana devnet and testnet networks.

## 🚀 Quick Start

### Basic Usage
```bash
# Get SOL from all available faucets (recommended)
npx ghostspeak faucet

# Get SOL from a specific source
npx ghostspeak faucet --source solana --amount 2

# Use with testnet
npx ghostspeak faucet --network testnet --amount 1.5
```

### Generate and Save a Wallet
```bash
# Generate a new wallet and automatically save it
npx ghostspeak faucet --save

# Use an existing wallet
npx ghostspeak faucet --wallet ~/.ghostspeak/my-wallet.json
```

## 📋 Available Commands

### Main Faucet Command
```bash
npx ghostspeak faucet [options]

Options:
  -n, --network <network>     Network (devnet|testnet) [default: devnet]
  -a, --amount <amount>       Amount of SOL to request [default: 1]
  -w, --wallet <path>         Path to existing wallet file
  -s, --source <source>       Faucet source (solana|alchemy|all) [default: all]
  --save                      Save generated wallet to file
```

### Wallet Management
```bash
# Generate a new wallet
npx ghostspeak faucet generate --save

# Check wallet balance
npx ghostspeak faucet balance --wallet ~/.ghostspeak/wallet-123.json

# Check balance on testnet
npx ghostspeak faucet balance --wallet my-wallet.json --network testnet
```

### Status and Monitoring
```bash
# Check faucet status and rate limits
npx ghostspeak faucet status --wallet my-wallet.json

# Check specific source status
npx ghostspeak faucet status --wallet my-wallet.json --source alchemy

# List all available faucet sources
npx ghostspeak faucet sources
```

### Maintenance
```bash
# Clean old request history (keep last 30 days)
npx ghostspeak faucet clean

# Clean with custom retention
npx ghostspeak faucet clean --days 7
```

## 🎯 Faucet Sources

### 1. Solana Official Faucet
- **Source ID**: `solana`
- **Networks**: devnet, testnet
- **Amount**: 1-2 SOL per request
- **Rate Limit**: 1 hour between requests
- **Reliability**: High (official faucet)

### 2. Alchemy Faucet
- **Source ID**: `alchemy`
- **Networks**: devnet, testnet
- **Amount**: 1 SOL per request
- **Rate Limit**: 1 hour between requests
- **Reliability**: High (Alchemy-powered)

### 3. RPC Airdrop (Fallback)
- **Source ID**: `rpc`
- **Networks**: devnet, testnet
- **Amount**: Configurable
- **Rate Limit**: 1 hour between requests
- **Reliability**: Medium (direct RPC call)

## ⚙️ Rate Limiting & Limits

### Default Limits
- **Rate Limit**: 1 hour between requests per source
- **Daily Limit**: 10 requests per wallet per day
- **Amount Limit**: 1-2 SOL per request

### Bypass Rate Limits
```bash
# Use multiple sources to get more SOL faster
npx ghostspeak faucet --source all

# Use different wallets for testing
npx ghostspeak faucet generate --save
npx ghostspeak faucet --wallet new-wallet.json
```

## 📊 Example Output

### Successful Request
```
💧 GhostSpeak Faucet - Get SOL for Development
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Network: devnet
💰 Amount: 1 SOL
🔧 Source: all

🔐 Generating new wallet...
👤 Wallet Address: 7xK2...9mN4
💾 Wallet saved to: ~/.ghostspeak/wallet-1234567890.json
💳 Current Balance: 0 SOL

🔍 Checking solana faucet status...
💧 Requesting 1 SOL from Solana faucet...

🔍 Checking alchemy faucet status...
⚗️ Requesting SOL from Alchemy faucet...

📊 FAUCET RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Solana Official:
   Amount: 1 SOL
   Signature: 4xK2...7mN9
   Explorer: https://explorer.solana.com/tx/4xK2...7mN9?cluster=devnet

✅ Alchemy:
   Amount: 1 SOL
   Signature: 8nP5...2xM1
   Explorer: https://explorer.solana.com/tx/8nP5...2xM1?cluster=devnet

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Total Received: 2 SOL

⏳ Waiting for transactions to confirm...
💳 Final Balance: 2 SOL (+2 SOL)

📋 WALLET INFO:
   Address: 7xK2...9mN4
   Network: devnet
   Balance: 2 SOL

💡 TIP: Your wallet has been saved. Use --wallet flag to reuse it.
```

### Rate Limited Response
```
🔍 Checking solana faucet status...
⏳ Rate limited. Wait 45 minutes before next request.

🔍 Checking alchemy faucet status...
📊 Daily limit reached (10/10 requests used).

📊 FAUCET RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ solana:
   Error: Rate limited. Wait 45 minutes.

❌ alchemy:
   Error: Daily limit reached (10/10).
```

## 🛠️ Integration with GhostSpeak Development

### Setup for Agent Development
```bash
# 1. Get SOL for development
npx ghostspeak faucet --save --amount 2

# 2. Use the wallet for agent registration
npx ghostspeak agent register \
  --wallet ~/.ghostspeak/wallet-123.json \
  --name "My AI Agent" \
  --network devnet

# 3. Check balance after transactions
npx ghostspeak faucet balance --wallet ~/.ghostspeak/wallet-123.json
```

### Continuous Development Workflow
```bash
# Check if you need more SOL
npx ghostspeak faucet status --wallet my-wallet.json

# Get more SOL if available
npx ghostspeak faucet --wallet my-wallet.json

# Continue development...
npx ghostspeak marketplace list --network devnet
```

## 🔧 Advanced Configuration

### Custom Rate Limits
The faucet service can be configured with custom rate limits by modifying the FaucetService configuration:

```typescript
import { FaucetService } from '@ghostspeak/cli'

const faucetService = new FaucetService({
  rateLimitMinutes: 30,     // 30 minutes between requests
  maxDailyRequests: 5,      // Max 5 requests per day
  defaultAmount: 0.5        // 0.5 SOL default amount
})
```

### Cache Management
Faucet request history is stored in `~/.ghostspeak/faucet/requests.json`. This cache:
- Tracks rate limits per wallet/source/network
- Stores request history for statistics
- Auto-cleans old records (configurable)

## 🚨 Troubleshooting

### Common Issues

**"All faucet endpoints failed"**
- Try again later (faucets may be temporarily down)
- Use different source: `--source alchemy` or `--source rpc`
- Check network status

**"Rate limited"**
- Wait for the specified time
- Use a different wallet: `npx ghostspeak faucet generate --save`
- Try a different source

**"Daily limit reached"**
- Wait until next day
- Use a different wallet
- Check overall statistics: `npx ghostspeak faucet status`

**"Wallet file not found"**
- Generate a new wallet: `npx ghostspeak faucet generate --save`
- Check the file path
- Use absolute path to wallet file

### Getting Help
```bash
# Show all faucet commands
npx ghostspeak faucet --help

# Show specific command help
npx ghostspeak faucet status --help

# Check available sources
npx ghostspeak faucet sources
```

## 🌟 Best Practices

1. **Save Wallets**: Always use `--save` to store wallets for reuse
2. **Check Status**: Use `faucet status` before requesting SOL
3. **Use All Sources**: Use `--source all` to maximize SOL received
4. **Monitor Usage**: Regularly check `faucet status` for rate limits
5. **Clean History**: Periodically run `faucet clean` to manage cache size

## 📚 Related Commands

- `npx ghostspeak agent register` - Register an AI agent
- `npx ghostspeak marketplace list` - Browse marketplace
- `npx ghostspeak config set` - Configure CLI settings
- `npx ghostspeak --help` - Show all available commands