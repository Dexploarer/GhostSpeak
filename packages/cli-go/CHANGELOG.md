# Changelog

All notable changes to the GhostSpeak CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-31

### Added

#### Core Features
- 🤖 **Agent Management**
  - Register new AI agents with interactive forms
  - List, search, and filter agents
  - View agent analytics and performance metrics
  - Admin tools for agent verification
  - Top performers leaderboard

- 💰 **Wallet Operations**
  - Create and import Solana wallets
  - AES-256-GCM encryption for wallet security
  - Balance checking for SOL and SPL tokens
  - Multi-wallet support with active wallet selection

- 🆔 **Decentralized Identity (DID)**
  - W3C-compliant DID document creation
  - Update verification methods and service endpoints
  - DID resolution and export to W3C format
  - DID deactivation support

- 📜 **Verifiable Credentials**
  - Issue W3C-compliant verifiable credentials
  - Verify credential validity and signatures
  - List and manage credentials
  - Export to W3C JSON-LD format
  - Cross mint integration for EVM chain sync

- ⭐ **Ghost Score Reputation System**
  - 0-1000 reputation scoring
  - Tier rankings (Bronze, Silver, Gold, Platinum)
  - Calculate scores based on multiple factors
  - Reputation leaderboard
  - Export reputation data

- 🔒 **GHOST Token Staking**
  - Three staking tiers (Bronze, Silver, Gold)
  - Tier thresholds: 1K, 10K, 100K GHOST
  - Variable APY based on protocol revenue distribution (~10-15%)
  - Reputation boost benefits (+5%, +15%, +15%)
  - Verified badge (Silver+) and premium benefits (Gold)
  - Claim rewards without unstaking
  - Global staking statistics

- 🗳️ **Governance**
  - Multisig wallet creation (M-of-N signatures)
  - Proposal system with 5 types
  - Voting with quorum requirements
  - Proposal execution with timelock
  - RBAC with 4 roles and 11 permissions

- 💸 **Ghost Protect Escrow**
  - Multi-token support (SOL, USDC, USDT, GHOST)
  - Secure payment lifecycle
  - Dispute resolution system
  - Fund, release, and cancel operations

- 🪂 **Devnet Faucet**
  - Request devnet SOL tokens
  - Request devnet GHOST tokens (10,000 per request)
  - 24-hour rate limiting
  - Integration with GhostSpeak airdrop API

#### Developer Experience
- 🎨 **Beautiful Terminal UI**
  - Interactive TUI built with Bubbletea
  - GhostSpeak yellow/black theme
  - ASCII art branding
  - 9-panel dashboard

- ⚡ **Performance**
  - BadgerDB for local caching (5-minute TTL)
  - Sub-second command execution
  - Efficient binary size (29MB)

- 🔧 **Configuration**
  - YAML-based configuration
  - Multi-network support (devnet, testnet, mainnet)
  - Environment variable overrides
  - Configurable logging levels

- 📊 **Rich Output**
  - Formatted tables with Lipgloss
  - Progress indicators
  - Color-coded status messages
  - Explorer links for transactions

### Technical Details

#### Architecture
- Clean Architecture (Domain → Services → Commands)
- Cobra CLI framework
- Dependency injection via App container
- Repository pattern for storage
- Model-View-Update for TUI

#### Security
- AES-256-GCM wallet encryption
- Password-protected private keys
- Secure key derivation (scrypt)
- No plaintext key storage
- Rate limiting for faucet requests

#### Dependencies
- Go 1.21+
- Cobra (CLI framework)
- Bubbletea (TUI framework)
- Lipgloss (styling)
- BadgerDB (storage)
- Viper (configuration)
- Solana Go SDK

### Fixed

- Format string error in staking balance display
- GHOST token decimals (corrected from 9 to 6)
- Network-specific GHOST token mints
- Faucet API integration with proper error handling

### Documentation

- Comprehensive README with all features
- Contributing guidelines
- Architecture documentation
- Code examples and usage guides
- Security best practices

## [Unreleased]

### Planned Features

#### v1.1.0
- On-chain program integration
- Real transaction signing
- Agent job execution tracking
- Payment processing

#### v1.2.0
- Hardware wallet support (Ledger)
- Multi-signature transactions
- Batch operations
- Enhanced export/import functionality

#### v2.0.0
- GraphQL API integration
- Real-time notifications
- Advanced analytics dashboards
- Plugin system for extensibility

---

**Note:** This is the initial release. For older changes from the TypeScript CLI, please refer to the main GhostSpeak repository.

[1.0.0]: https://github.com/ghostspeak/cli-go/releases/tag/v1.0.0
[Unreleased]: https://github.com/ghostspeak/cli-go/compare/v1.0.0...HEAD
