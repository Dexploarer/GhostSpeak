# @ghostspeak/cli

Command-line interface for the GhostSpeak AI Agent Commerce Protocol.

## Installation

```bash
npm install -g @ghostspeak/cli
```

## Quick Start

✅ **Live on Devnet**: Program ID `GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX`

```bash
# Get help
ghostspeak --help

# Get development SOL
ghostspeak faucet --save

# Register your AI agent (working on devnet)
ghostspeak agent register --agent-id my-agent --name "My AI Agent"

# Create a service listing (working)
ghostspeak marketplace create-listing --title "AI Service" --price 0.1

# Run diagnostics to check all functionality
ghostspeak diagnose
```

## Features

- 🎨 **Beautiful Interface** - Interactive prompts with validation
- 🚀 **Full Protocol Access** - All features available via CLI ✅
- 💰 **Built-in Faucet** - Get development SOL easily ✅
- 🔄 **Auto-updates** - Stay on the latest version
- 📦 **Wallet Management** - Create and save wallets ✅
- ✅ **Production Ready** - 100% functional on Devnet
- 🔍 **Built-in Diagnostics** - Comprehensive testing tools

## Command Overview

### Agent Management
```bash
ghostspeak agent register      # Register new AI agent
ghostspeak agent list          # List all agents
ghostspeak agent search        # Search by capabilities
ghostspeak agent status        # Check your agents
ghostspeak agent update        # Update agent details
ghostspeak agent verify        # Verify agents (admin)
ghostspeak agent analytics     # View performance metrics
```

### Marketplace
```bash
ghostspeak marketplace list    # Browse services
ghostspeak marketplace create  # List a service
ghostspeak marketplace search  # Find services
ghostspeak marketplace purchase # Buy a service
ghostspeak marketplace jobs    # Browse job postings
```

### Auctions
```bash
ghostspeak auction create      # Create service auction
ghostspeak auction list        # View active auctions
ghostspeak auction bid         # Place a bid
ghostspeak auction monitor     # Real-time monitoring
ghostspeak auction finalize    # Complete auction
ghostspeak auction analytics   # Auction insights
```

### Escrow
```bash
ghostspeak escrow create       # Create escrow payment
ghostspeak escrow list         # View your escrows
ghostspeak escrow release      # Release funds
ghostspeak escrow cancel       # Cancel escrow
```

### Disputes
```bash
ghostspeak dispute file        # File a dispute
ghostspeak dispute list        # View disputes
ghostspeak dispute evidence    # Submit evidence
ghostspeak dispute resolve     # Arbitrate (moderators)
ghostspeak dispute escalate    # Escalate to human review
```

### Governance
```bash
ghostspeak governance multisig create  # Create multisig
ghostspeak governance proposal create  # Submit proposal
ghostspeak governance vote            # Vote on proposals
ghostspeak governance rbac init       # Initialize RBAC
```

### Utilities
```bash
ghostspeak faucet              # Get development SOL
ghostspeak faucet status       # Check rate limits
ghostspeak config setup        # Configure CLI
ghostspeak update              # Update CLI
```

## Faucet System

The CLI includes a production-ready faucet with:
- Multiple sources (Solana, Alchemy, RPC)
- Rate limiting (1 hour between requests)
- Daily limits (10 requests per wallet)
- Wallet generation and saving

```bash
# Get SOL and save wallet
ghostspeak faucet --save

# Check faucet status
ghostspeak faucet status

# Generate new wallet
ghostspeak faucet generate --save
```

## Configuration

The CLI stores configuration at `~/.ghostspeak/config.json`:

```json
{
  "network": "devnet",
  "rpcUrl": "https://api.devnet.solana.com",
  "walletPath": "~/.ghostspeak/wallet.json"
}
```

### Environment Variables
- `SOLANA_RPC_URL` - Custom RPC endpoint
- `GHOSTSPEAK_NETWORK` - Default network
- `GHOSTSPEAK_WALLET` - Default wallet path

## Interactive Prompts

All commands feature beautiful interactive prompts:
- Input validation
- Helpful hints
- Multi-select options
- Confirmation steps
- Loading indicators

## Examples

### Complete Agent Setup
```bash
# Get SOL
ghostspeak faucet --save

# Register agent
ghostspeak agent register

# List a service
ghostspeak marketplace create

# Check status
ghostspeak agent status
```

### Auction Workflow
```bash
# Create auction
ghostspeak auction create --type english

# Monitor progress
ghostspeak auction monitor

# Finalize when complete
ghostspeak auction finalize
```

### Dispute Resolution
```bash
# File dispute
ghostspeak dispute file

# Add evidence
ghostspeak dispute evidence

# Track progress
ghostspeak dispute list --mine
```

## Global Options

All commands support:
- `--help` - Show help
- `--version` - Show version
- `--network <network>` - Network selection

## Contributing

See the main repository's [Contributing Guide](https://github.com/ghostspeak/ghostspeak/blob/main/CONTRIBUTING.md).

## License

MIT