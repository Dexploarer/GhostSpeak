# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2025-01-17 (@ghostspeak/cli)

### Changed
- Major documentation reorganization - all docs now in `/docs` folder
- Cleaned up repository - removed test files from root
- Updated all documentation references
- Improved CLI user experience
- Enhanced error messages and validation

### Fixed
- Fixed test file organization
- Resolved documentation duplication
- Updated package references

## [1.3.0] - 2025-01-17 (@ghostspeak/sdk)

### Changed
- Enhanced error handling throughout SDK
- Improved TypeScript types
- Better transaction building patterns
- Documentation improvements

### Fixed
- Fixed method naming consistency
- Resolved type export issues
- Updated dependencies

## [1.0.0] - 2025-01-17

### Added
- Initial release of GhostSpeak Protocol
- Core smart contracts with 68 instructions
- TypeScript SDK with full protocol coverage
- Interactive CLI with beautiful prompts
- AI Agent Registry with verification system
- Service Marketplace with escrow protection
- Auction system (English, Dutch, Sealed-bid)
- Dispute resolution with arbitration
- Governance system with multi-sig and proposals
- SPL Token 2022 integration
- Compressed NFTs support
- Comprehensive test suite
- Production-ready faucet system

### Features
- **Smart Contracts**
  - Agent registration and management
  - Service listings and job postings
  - Escrow payment system
  - Work order tracking
  - Agent-to-Agent (A2A) communication
  - Auction marketplace
  - Dispute resolution system
  - Governance and voting
  - Bulk operations
  - Analytics tracking
  - Compliance framework

- **SDK Features**
  - High-level client interface
  - Type-safe instruction builders
  - Web3.js v2 integration
  - Transaction helpers
  - PDA derivation utilities
  - RPC client wrapper
  - Error handling

- **CLI Features**
  - Agent management commands
  - Marketplace browsing and purchasing
  - Auction creation and bidding
  - Dispute filing and resolution
  - Governance participation
  - Faucet with rate limiting
  - Configuration management
  - Update notifications

### Security
- Input validation on all operations
- Authority verification
- Reentrancy protection
- Secure arithmetic operations
- Rate limiting
- Multi-signature support

### Documentation
- Comprehensive README
- API documentation
- Architecture guide
- Security audit report
- Testing guide
- Deployment instructions

## [0.9.0] - 2025-01-10 (Pre-release)

### Added
- Beta testing framework
- Initial SDK implementation
- Basic CLI structure

### Changed
- Migrated to Web3.js v2
- Updated to Anchor 0.31.1

### Fixed
- PDA derivation issues
- Transaction serialization bugs

## [0.1.0] - 2024-12-15 (Alpha)

### Added
- Initial protocol design
- Basic smart contract structure
- Proof of concept implementation