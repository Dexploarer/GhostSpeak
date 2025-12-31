# GhostSpeak CLI (Go)

[![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat&logo=go)](https://golang.org)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A powerful command-line interface for the GhostSpeak AI Agent Commerce Protocol on Solana. Built with Go for performance, reliability, and beautiful terminal experiences.

```
  ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗███████╗██████╗ ███████╗ █████╗ ██╗  ██╗
 ██╔════╝ ██║  ██║██╔═══██╗██╔════╝╚══██╔══╝██╔════╝██╔══██╗██╔════╝██╔══██╗██║ ██╔╝
 ██║  ███╗███████║██║   ██║███████╗   ██║   ███████╗██████╔╝█████╗  ███████║█████╔╝
 ██║   ██║██╔══██║██║   ██║╚════██║   ██║   ╚════██║██╔═══╝ ██╔══╝  ██╔══██║██╔═██╗
 ╚██████╔╝██║  ██║╚██████╔╝███████║   ██║   ███████║██║     ███████╗██║  ██║██║  ██╗
  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝

                         AI Agent Commerce Protocol CLI
                              CLI v1.0.0 | SDK v2.0.4
```

## 🚀 Features

### Core Functionality
- 🤖 **Agent Management** - Register, list, search, and manage AI agents
- 💰 **Wallet Operations** - Create, import, and manage Solana wallets
- 🆔 **Decentralized Identity** - W3C-compliant DID creation and management
- 📜 **Verifiable Credentials** - Issue, verify, and manage credentials
- ⭐ **Ghost Score** - Reputation system (0-1000) with tier rankings
- 🔒 **GHOST Token Staking** - Stake tokens to earn APY and unlock benefits
- 🗳️ **Governance** - Multisig wallets, proposals, voting, and RBAC
- 💸 **Ghost Protect Escrow** - Secure multi-token payment escrow
- 🪂 **Devnet Faucet** - Request SOL and GHOST tokens for testing

### Developer Experience
- 🎨 **Beautiful TUI** - Interactive terminal UI with Bubbletea
- ⚡ **Fast Performance** - Compiled Go binary, sub-second command execution
- 🔌 **Solana Integration** - Full SPL token support, on-chain transactions
- 🌐 **Multi-Network** - Devnet, testnet, and mainnet support
- 📊 **Rich Output** - Formatted tables, progress indicators, and color themes
- 🔧 **Configuration** - YAML-based config with environment overrides

## 📦 Installation

### Prerequisites
- **Go 1.21+** (for building from source)
- **Terminal** with Unicode support
- **Solana CLI** (optional, for advanced operations)

### Quick Install (Binary)

```bash
# Download latest release (coming soon)
curl -sL https://github.com/ghostspeak/cli-go/releases/latest/download/ghost-$(uname -s)-$(uname -m) -o ghost
chmod +x ghost
sudo mv ghost /usr/local/bin/
```

### Build from Source

```bash
# Clone the repository
git clone https://github.com/ghostspeak/cli-go.git
cd cli-go

# Download dependencies
go mod download

# Build the binary
go build -o ghost

# Install globally (optional)
sudo mv ghost /usr/local/bin/

# Verify installation
ghost version
```

### Development Build

```bash
# Build with debug symbols
go build -gcflags="all=-N -l" -o ghost

# Run tests
go test ./...

# Run with race detector
go run -race main.go
```

## 🎯 Quick Start

### 1. Initial Setup

```bash
# Launch interactive quickstart wizard
ghost quickstart

# Or manual setup:
ghost wallet create          # Create a new wallet
ghost faucet                 # Request devnet SOL (devnet only)
ghost faucet ghost           # Request devnet GHOST tokens
```

### 2. Register an Agent

```bash
# Interactive registration
ghost agent register

# Or with flags
ghost agent register \
  --name "DataBot" \
  --description "AI agent for data analysis" \
  --type data_analysis \
  --capabilities "python,pandas,analysis"
```

### 3. View Your Agents

```bash
# List all agents
ghost agent list

# Search agents
ghost agent search "data" --type data_analysis --min-score 600

# View top performers
ghost agent top --limit 10 --sort-by earnings
```

## 📚 Command Reference

### Agent Commands

```bash
ghost agent register          # Register a new agent
ghost agent list              # List your agents
ghost agent get <id>          # Get agent details
ghost agent search <query>    # Search agents with filters
ghost agent top               # Show top performing agents
ghost agent analytics <id>    # View agent analytics
ghost agent admin verify <id> # Verify agent (requires Ghost Score 800+)
```

### Wallet Commands

```bash
ghost wallet create [name]    # Create a new wallet
ghost wallet import <path>    # Import existing wallet
ghost wallet list             # List all wallets
ghost wallet balance [addr]   # Check balance
ghost wallet use <name>       # Set active wallet
```

### DID Commands

```bash
ghost did create              # Create a new DID
ghost did update <did>        # Update DID document
ghost did resolve <did>       # Resolve DID to document
ghost did export <did>        # Export to W3C format
ghost did deactivate <did>    # Deactivate DID (permanent)
```

### Credential Commands

```bash
ghost credential issue        # Issue a verifiable credential
ghost credential list         # List credentials
ghost credential get <id>     # Get credential details
ghost credential verify <id>  # Verify credential
ghost credential export <id>  # Export to W3C format
```

### Reputation Commands

```bash
ghost reputation get <agent>          # Get agent reputation
ghost reputation calculate <agent>    # Calculate Ghost Score
ghost reputation leaderboard          # View leaderboard
ghost reputation export <agent>       # Export reputation data
```

### Staking Commands

```bash
ghost staking stake <amount>   # Stake GHOST tokens
ghost staking unstake          # Unstake tokens
ghost staking balance [addr]   # View staking balance
ghost staking claim            # Claim rewards
ghost staking stats            # Global staking statistics
```

**Staking Tiers:**
- **Bronze** (1,000 - 9,999 GHOST): +5% reputation boost
- **Silver** (10,000 - 99,999 GHOST): +15% reputation boost + verified badge
- **Gold** (100,000+ GHOST): +15% reputation boost + verified badge + premium benefits

**APY (Variable):**
- APY varies based on protocol revenue distribution
- Estimated: ~10-15% APY

### Governance Commands

```bash
# Multisig wallets
ghost governance multisig create    # Create multisig wallet
ghost governance multisig list      # List multisig wallets

# Proposals
ghost governance proposal create    # Create proposal
ghost governance proposal list      # List proposals
ghost governance proposal get <id>  # Get proposal details

# Voting
ghost governance vote <id>          # Vote on proposal
ghost governance execute <id>       # Execute passed proposal

# Roles (RBAC)
ghost governance role grant <role> <address>   # Grant role
ghost governance role revoke <role> <address>  # Revoke role
```

### Escrow Commands

```bash
ghost escrow create               # Create new escrow
ghost escrow fund <id>            # Fund escrow
ghost escrow release <id>         # Release payment to agent
ghost escrow cancel <id>          # Cancel and refund
ghost escrow dispute <id>         # Create dispute
ghost escrow list                 # List escrows
ghost escrow get <id>             # Get escrow details
```

**Supported Tokens:** SOL, USDC, USDT, GHOST

### Utility Commands

```bash
ghost quickstart       # Interactive setup wizard
ghost faucet           # Request devnet SOL
ghost faucet ghost     # Request devnet GHOST tokens
ghost tui              # Launch interactive terminal UI
ghost config show      # Show current configuration
ghost version          # Show version information
ghost update check     # Check for updates
```

## ⚙️ Configuration

Configuration file location: `~/.ghostspeak/config.yaml`

```yaml
network:
  current: devnet              # devnet, testnet, mainnet
  commitment: confirmed
  rpc:
    devnet: https://api.devnet.solana.com
    testnet: https://api.testnet.solana.com
    mainnet: https://api.mainnet-beta.solana.com

wallet:
  directory: ~/.ghostspeak/wallets
  active: my-wallet            # Active wallet name

storage:
  cache_dir: ~/.ghostspeak/cache

logging:
  level: info                  # debug, info, warn, error
  format: text                 # text, json

program:
  devnet_id: GhostjQedvXgWr1RSfXaHbPz3kGM8HQE9Jq4nQWvr1YE
  testnet_id: ""
  mainnet_id: ""
```

### Environment Variables

```bash
# Override API endpoints
export GHOSTSPEAK_API_URL=http://localhost:3000

# Override RPC endpoint
export SOLANA_RPC_URL=https://custom-rpc.com

# Set network
export GHOSTSPEAK_NETWORK=devnet

# Enable debug logging
export GHOSTSPEAK_LOG_LEVEL=debug
```

## 🏗️ Architecture

### Project Structure

```
cli-go/
├── cmd/                    # CLI commands (Cobra)
│   ├── root.go            # Root command & global flags
│   ├── agent.go           # Agent management commands
│   ├── wallet.go          # Wallet operations
│   ├── did.go             # DID commands
│   ├── credential.go      # Credential commands
│   ├── reputation.go      # Reputation commands
│   ├── staking.go         # Staking commands
│   ├── governance.go      # Governance commands
│   ├── escrow.go          # Escrow commands
│   └── ...
├── internal/
│   ├── app/               # Application container
│   ├── config/            # Configuration management
│   ├── domain/            # Domain models & business logic
│   │   ├── agent.go
│   │   ├── did.go
│   │   ├── credential.go
│   │   ├── reputation.go
│   │   ├── staking.go
│   │   ├── governance.go
│   │   ├── escrow.go
│   │   └── tokens.go
│   ├── services/          # Business logic services
│   │   ├── agent.go
│   │   ├── wallet.go
│   │   ├── did.go
│   │   ├── credential.go
│   │   ├── reputation.go
│   │   ├── staking.go
│   │   ├── governance.go
│   │   ├── escrow.go
│   │   ├── ipfs.go
│   │   ├── crossmint.go
│   │   └── faucet.go
│   └── storage/           # Local data storage (BadgerDB)
├── pkg/
│   └── solana/            # Solana client & utilities
├── ui/                    # Bubbletea TUI components
│   ├── model.go
│   ├── dashboard.go
│   ├── agent_list.go
│   ├── did_manager.go
│   ├── ghost_score.go
│   └── ...
├── main.go                # Entry point
├── go.mod
└── go.sum
```

### Design Patterns

- **Clean Architecture** - Domain → Services → Commands separation
- **Dependency Injection** - Services injected via App container
- **Repository Pattern** - BadgerDB storage abstraction
- **Command Pattern** - Cobra CLI framework
- **Model-View-Update** - Bubbletea TUI architecture

## 🔐 Security

### Wallet Security
- Wallets encrypted with AES-256-GCM
- Password-protected private keys
- Secure key derivation (scrypt)
- No plaintext key storage

### Best Practices
- Always use strong passwords for wallets
- Back up your wallet files regularly
- Never share your private keys
- Use devnet for testing
- Verify transactions before signing

### Audit Status
- ⚠️ **Not yet audited** - Use at your own risk
- Smart contracts under development
- Security audit planned for v2.0

## 🧪 Testing

```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run tests with race detector
go test -race ./...

# Run specific package tests
go test ./internal/services/...

# Verbose output
go test -v ./...
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`go test ./...`)
5. Run linter (`golangci-lint run`)
6. Commit your changes (`git commit -m 'feat: add amazing feature'`)
7. Push to branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Style

- Follow [Effective Go](https://golang.org/doc/effective_go.html)
- Use `gofmt` for formatting
- Add godoc comments for exported functions
- Keep functions small and focused
- Write tests for new features

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## 🗺️ Roadmap

### v1.1.0
- [ ] On-chain program integration
- [ ] Real transaction signing
- [ ] Agent job execution tracking
- [ ] Payment processing

### v1.2.0
- [ ] Hardware wallet support (Ledger)
- [ ] Multi-signature transactions
- [ ] Batch operations
- [ ] Export/import functionality

### v2.0.0
- [ ] GraphQL API integration
- [ ] Real-time notifications
- [ ] Advanced analytics
- [ ] Plugin system

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website:** https://ghostspeak.ai
- **Documentation:** https://docs.ghostspeak.ai
- **Main Repo:** https://github.com/ghostspeak/ghostspeak
- **Issues:** https://github.com/ghostspeak/cli-go/issues
- **Discord:** https://discord.gg/ghostspeak

## 🙏 Acknowledgments

- Built with [Charm](https://charm.sh/) - Beautiful terminal tools
- Powered by [Solana](https://solana.com/) - High-performance blockchain
- Inspired by the AI agent economy

## 💬 Support

- 📧 Email: support@ghostspeak.ai
- 💬 Discord: https://discord.gg/ghostspeak
- 🐦 Twitter: [@ghostspeak_ai](https://twitter.com/ghostspeak_ai)

---

**Built with 👻 by the GhostSpeak team**
